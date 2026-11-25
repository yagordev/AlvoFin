"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/app/_lib/prisma";
import { requireAuthUser } from "@/app/_lib/auth";
import {
  AiFinancialAnalysisData,
  aiFinancialAnalysisSchema,
  generateStructuredFinancialAnalysis,
} from "@/app/_services/ai";
import { GenerateAiReportSchema, generateAiReportSchema } from "./schema";

export interface SavedAiAnalysisDTO {
  id: string;
  referenceMonth: number;
  referenceYear: number;
  createdAt: string;
  analysisData: AiFinancialAnalysisData;
}

async function aggregateMonthTransactions(
  userId: string,
  month: number,
  year: number,
) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const txs = await db.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      category: true,
    },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const catMap = new Map<
    string,
    { category: string; type: "INCOME" | "EXPENSE"; amount: number }
  >();

  for (const t of txs) {
    const val = Number(t.amount);
    if (t.type === "INCOME") totalIncome += val;
    else totalExpense += val;

    const key = `${t.type}:${t.category.name}`;
    const existing = catMap.get(key);
    if (existing) {
      existing.amount += val;
    } else {
      catMap.set(key, {
        category: t.category.name,
        type: t.type,
        amount: val,
      });
    }
  }

  return {
    count: txs.length,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpense: Number(totalExpense.toFixed(2)),
    balance: Number((totalIncome - totalExpense).toFixed(2)),
    byCategory: Array.from(catMap.values()).map((c) => ({
      ...c,
      amount: Number(c.amount.toFixed(2)),
    })),
  };
}

export const generateAiReport = async (
  input: GenerateAiReportSchema,
): Promise<{
  success: boolean;
  analysis?: SavedAiAnalysisDTO;
  error?: string;
}> => {
  const user = await requireAuthUser();
  const parsed = generateAiReportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Período de referência inválido para a análise.",
    };
  }

  const { referenceMonth, referenceYear } = parsed.data;

  try {
    // RN026: Considera apenas receitas e despesas do usuário (sem limites ou metas)
    const currentPeriod = await aggregateMonthTransactions(
      user.userId,
      referenceMonth,
      referenceYear,
    );

    // UC010-A1: Período sem dados suficientes
    if (currentPeriod.count === 0) {
      return {
        success: false,
        error:
          "Não existem movimentações registradas no mês selecionado para realizar a análise financeira (UC010-A1).",
      };
    }

    // RN027: Dados do período anterior para comparação
    const prevMonth = referenceMonth === 1 ? 12 : referenceMonth - 1;
    const prevYear = referenceMonth === 1 ? referenceYear - 1 : referenceYear;
    const previousPeriod = await aggregateMonthTransactions(
      user.userId,
      prevMonth,
      prevYear,
    );

    const analysisData = await generateStructuredFinancialAnalysis({
      referenceMonth,
      referenceYear,
      currentPeriod: {
        totalIncome: currentPeriod.totalIncome,
        totalExpense: currentPeriod.totalExpense,
        balance: currentPeriod.balance,
        byCategory: currentPeriod.byCategory,
      },
      previousPeriod: {
        totalIncome: previousPeriod.totalIncome,
        totalExpense: previousPeriod.totalExpense,
        balance: previousPeriod.balance,
        byCategory: previousPeriod.byCategory,
      },
    });

    // RN029 / CT11: Armazena a análise em ai_analyses mantendo o histórico
    const saved = await db.aiAnalysis.create({
      data: {
        userId: user.userId,
        referenceMonth,
        referenceYear,
        analysisData,
      },
    });

    revalidatePath("/");

    return {
      success: true,
      analysis: {
        id: saved.id,
        referenceMonth: saved.referenceMonth,
        referenceYear: saved.referenceYear,
        createdAt: saved.createdAt.toISOString(),
        analysisData,
      },
    };
  } catch (error) {
    console.error("Erro ao gerar análise financeira por IA (UC010-A2):", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a análise financeira no momento (serviço de IA indisponível).",
    };
  }
};

export const getAiAnalysesHistory = async (): Promise<SavedAiAnalysisDTO[]> => {
  const user = await requireAuthUser();

  try {
    const records = await db.aiAnalysis.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return records.flatMap((rec) => {
      const validated = aiFinancialAnalysisSchema.safeParse(rec.analysisData);
      if (!validated.success) return [];
      return [
        {
          id: rec.id,
          referenceMonth: rec.referenceMonth,
          referenceYear: rec.referenceYear,
          createdAt: rec.createdAt.toISOString(),
          analysisData: validated.data,
        },
      ];
    });
  } catch {
    return [];
  }
};
