"use server";

import { revalidatePath } from "next/cache";
import { TransactionType } from "@prisma/client";
import { db } from "@/app/_lib/prisma";
import { requireAuthUser } from "@/app/_lib/auth";
import {
  syncCategoryLimitAlerts,
  TriggeredLimitAlert,
} from "@/app/_lib/limit-alerts";
import {
  closeSpendingLimitSchema,
  UpsertSpendingLimitInput,
  upsertSpendingLimitSchema,
} from "./schema";

export async function upsertSpendingLimitAction(
  input: UpsertSpendingLimitInput,
): Promise<{
  success: boolean;
  error?: string;
  triggeredAlert?: TriggeredLimitAlert | null;
}> {
  const user = await requireAuthUser();
  const parsed = upsertSpendingLimitSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Dados inválidos para o limite de gastos.",
    };
  }

  const { categoryId, amount } = parsed.data;

  try {
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (
      !category ||
      (category.userId !== null && category.userId !== user.userId)
    ) {
      return {
        success: false,
        error: "Categoria não encontrada ou não disponível para sua conta.",
      };
    }

    // RN013: Os limites de gastos poderão ser associados somente a categorias de despesa
    if (category.type !== TransactionType.EXPENSE) {
      return {
        success: false,
        error:
          "Limites de gastos podem ser definidos apenas para categorias de despesa (RN013).",
      };
    }

    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const yesterday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
    );

    await db.$transaction(async (tx) => {
      // Busca limite vigente atual para a mesma categoria (effectiveTo = null)
      const activeLimits = await tx.spendingLimit.findMany({
        where: {
          userId: user.userId,
          categoryId,
          effectiveTo: null,
        },
      });

      // Seção 2.4 e 4.5 do Modelo de Dados / CT07:
      // Encerra a vigência anterior preservando o histórico e cria um novo registro vigente
      for (const prev of activeLimits) {
        const endDate =
          prev.effectiveFrom < today ? yesterday : prev.effectiveFrom;
        await tx.spendingLimit.update({
          where: { id: prev.id },
          data: {
            effectiveTo: endDate,
          },
        });
      }

      // Inicia o limite desde o primeiro dia do mês atual quando não havia vigência anterior,
      // garantindo que todas as despesas do mês corrente sejam cobertas pela vigência
      const startOfCurrentMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const effectiveFrom =
        activeLimits.length > 0 ? today : startOfCurrentMonth;

      await tx.spendingLimit.create({
        data: {
          userId: user.userId,
          categoryId,
          amount,
          effectiveFrom,
          effectiveTo: null,
        },
      });
    });

    // Calcula o consumo atual e gera alertas se aplicável (75%, 90%, 100%)
    const triggeredAlert = await syncCategoryLimitAlerts({
      userId: user.userId,
      categoryId,
      referenceDate: now,
    });

    revalidatePath("/limits");
    revalidatePath("/");

    return {
      success: true,
      triggeredAlert,
    };
  } catch (error) {
    console.error("Erro ao salvar limite de gastos:", error);
    return {
      success: false,
      error: "Não foi possível salvar o limite de gastos.",
    };
  }
}

export async function closeSpendingLimitAction(input: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuthUser();
  const parsed = closeSpendingLimitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Limite inválido." };
  }

  try {
    const limit = await db.spendingLimit.findUnique({
      where: { id: parsed.data.id },
    });

    if (!limit || limit.userId !== user.userId) {
      return { success: false, error: "Limite não encontrado." };
    }

    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endDate = limit.effectiveFrom > today ? limit.effectiveFrom : today;

    await db.spendingLimit.update({
      where: { id: limit.id },
      data: {
        effectiveTo: endDate,
      },
    });

    revalidatePath("/limits");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao encerrar limite:", error);
    return {
      success: false,
      error: "Não foi possível encerrar a vigência do limite.",
    };
  }
}
