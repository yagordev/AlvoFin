"use server";

import { revalidatePath } from "next/cache";
import { GoalTransactionType } from "@prisma/client";
import { db } from "@/app/_lib/prisma";
import { requireAuthUser } from "@/app/_lib/auth";
import {
  CreateGoalTransactionInput,
  createGoalTransactionSchema,
  idSchema,
  UpsertFinancialGoalInput,
  upsertFinancialGoalSchema,
} from "./schema";

export async function upsertFinancialGoalAction(
  input: UpsertFinancialGoalInput,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuthUser();
  const parsed = upsertFinancialGoalSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Dados inválidos para o objetivo financeiro.",
    };
  }

  const { id, name, targetAmount, deadline } = parsed.data;

  try {
    if (id) {
      const existing = await db.financialGoal.findUnique({
        where: { id },
      });

      if (!existing || existing.deletedAt !== null) {
        return {
          success: false,
          error: "Objetivo financeiro não encontrado.",
        };
      }

      // RN033 / CT12: Isolamento entre contas
      if (existing.userId !== user.userId) {
        return {
          success: false,
          error: "Acesso negado a este objetivo financeiro.",
        };
      }

      await db.financialGoal.update({
        where: { id },
        data: {
          name,
          targetAmount,
          deadline: deadline ?? null,
        },
      });
    } else {
      await db.financialGoal.create({
        data: {
          userId: user.userId,
          name,
          targetAmount,
          deadline: deadline ?? null,
        },
      });
    }

    revalidatePath("/goals");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar objetivo financeiro:", error);
    return {
      success: false,
      error: "Não foi possível salvar o objetivo financeiro.",
    };
  }
}

export async function deleteFinancialGoalAction(input: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuthUser();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Objetivo inválido." };
  }

  try {
    const existing = await db.financialGoal.findUnique({
      where: { id: parsed.data.id },
    });

    if (!existing || existing.deletedAt !== null) {
      return { success: false, error: "Objetivo não encontrado." };
    }

    if (existing.userId !== user.userId) {
      return { success: false, error: "Acesso negado." };
    }

    // Seção 2.5 e 4.1 do Modelo de Dados: Exclusão lógica (deleted_at)
    await db.financialGoal.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/goals");
    revalidatePath("/");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Não foi possível excluir o objetivo financeiro.",
    };
  }
}

/**
 * Registra aporte (CONTRIBUTION) ou retirada (WITHDRAWAL) de forma atômica,
 * impedindo saldo negativo (CT08) e informando quando a meta é atingida (RN019 / RN032 / CT09).
 */
export async function addGoalTransactionAction(
  input: CreateGoalTransactionInput,
): Promise<{
  success: boolean;
  error?: string;
  goalReached?: {
    goalId: string;
    goalName: string;
    currentBalance: number;
    targetAmount: number;
    percentage: number;
  };
}> {
  const user = await requireAuthUser();
  const parsed = createGoalTransactionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Dados inválidos para a movimentação da meta.",
    };
  }

  const { goalId, type, amount, date, description } = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const goal = await tx.financialGoal.findUnique({
        where: { id: goalId },
      });

      if (!goal || goal.deletedAt !== null) {
        throw new Error("Objetivo financeiro não encontrado.");
      }

      // RN033 / CT12: Propriedade indireta via financial_goals.user_id
      if (goal.userId !== user.userId) {
        throw new Error("Acesso negado a este objetivo financeiro.");
      }

      const activeMovements = await tx.goalTransaction.findMany({
        where: {
          goalId,
          deletedAt: null,
        },
      });

      let currentBalance = 0;
      for (const m of activeMovements) {
        if (m.type === GoalTransactionType.CONTRIBUTION) {
          currentBalance += Number(m.amount);
        } else {
          currentBalance -= Number(m.amount);
        }
      }

      // CT08 / Seção 2.6 do Modelo de Dados: Impede saldo negativo na meta
      if (
        type === GoalTransactionType.WITHDRAWAL &&
        amount > currentBalance + 0.0001
      ) {
        throw new Error(
          `Saldo insuficiente na meta. O saldo disponível para retirada é de R$ ${currentBalance.toFixed(
            2,
          )}.`,
        );
      }

      await tx.goalTransaction.create({
        data: {
          goalId,
          type,
          amount,
          date,
          description: description || null,
        },
      });

      const newBalance =
        type === GoalTransactionType.CONTRIBUTION
          ? currentBalance + amount
          : currentBalance - amount;

      const targetAmount = Number(goal.targetAmount);
      const percentage =
        targetAmount > 0 ? Math.round((newBalance / targetAmount) * 100) : 0;

      return {
        goalId: goal.id,
        goalName: goal.name,
        newBalance,
        targetAmount,
        percentage,
        isContribution: type === GoalTransactionType.CONTRIBUTION,
      };
    });

    revalidatePath("/goals");
    revalidatePath("/");

    // RN019 / RN032 / CT09: Quando um aporte atingir ou ultrapassar o objetivo, informa em tela
    if (
      result.isContribution &&
      result.newBalance >= result.targetAmount &&
      result.targetAmount > 0
    ) {
      return {
        success: true,
        goalReached: {
          goalId: result.goalId,
          goalName: result.goalName,
          currentBalance: result.newBalance,
          targetAmount: result.targetAmount,
          percentage: result.percentage,
        },
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a movimentação no objetivo.",
    };
  }
}

export async function deleteGoalTransactionAction(input: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuthUser();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Movimentação inválida." };
  }

  try {
    await db.$transaction(async (tx) => {
      const movement = await tx.goalTransaction.findUnique({
        where: { id: parsed.data.id },
        include: { goal: true },
      });

      if (!movement || movement.deletedAt !== null) {
        throw new Error("Movimentação da meta não encontrada.");
      }

      // RN033 / CT12: Propriedade indireta
      if (movement.goal.userId !== user.userId) {
        throw new Error("Acesso negado.");
      }

      const activeMovements = await tx.goalTransaction.findMany({
        where: {
          goalId: movement.goalId,
          deletedAt: null,
          NOT: { id: movement.id },
        },
      });

      let resultingBalance = 0;
      for (const m of activeMovements) {
        if (m.type === GoalTransactionType.CONTRIBUTION) {
          resultingBalance += Number(m.amount);
        } else {
          resultingBalance -= Number(m.amount);
        }
      }

      // Seção 2.6 do Modelo de Dados: Impede exclusão lógica de aporte caso produza saldo negativo
      if (resultingBalance < -0.0001) {
        throw new Error(
          "Não é possível excluir este aporte pois as retiradas posteriores deixariam o saldo da meta negativo.",
        );
      }

      await tx.goalTransaction.update({
        where: { id: movement.id },
        data: { deletedAt: new Date() },
      });
    });

    revalidatePath("/goals");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a movimentação da meta.",
    };
  }
}
