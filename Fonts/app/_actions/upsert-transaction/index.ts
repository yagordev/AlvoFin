"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/app/_lib/prisma";
import { requireAuthUser } from "@/app/_lib/auth";
import {
  syncCategoryLimitAlerts,
  TriggeredLimitAlert,
} from "@/app/_lib/limit-alerts";
import {
  UpsertTransactionInput,
  upsertTransactionSchema,
} from "./schema";

export const upsertTransaction = async (
  params: UpsertTransactionInput,
): Promise<{
  success: boolean;
  error?: string;
  triggeredAlert?: TriggeredLimitAlert | null;
}> => {
  const user = await requireAuthUser();
  const parsed = upsertTransactionSchema.safeParse(params);

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Preencha todos os campos obrigatórios corretamente.",
    };
  }

  const { id, type, amount, categoryId, date, description, createdByAi } =
    parsed.data;

  try {
    // Verifica se a categoria existe, pertence ao escopo permitido e tem tipo compatível (RN004 / RN006 / UC003-A3)
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (
      !category ||
      (category.userId !== null && category.userId !== user.userId)
    ) {
      return {
        success: false,
        error: "Categoria não encontrada ou não pertence à sua conta.",
      };
    }

    if (category.type !== type) {
      // UC003-A3 / RN004: Categoria incompatível com o tipo da movimentação
      return {
        success: false,
        error: `Categoria incompatível: uma movimentação de ${
          type === "INCOME" ? "Receita" : "Despesa"
        } deve utilizar uma categoria de ${
          type === "INCOME" ? "Receita" : "Despesa"
        }.`,
      };
    }

    let previousCategoryId: string | null = null;
    let previousDate: Date | null = null;

    if (id) {
      const existing = await db.transaction.findUnique({
        where: { id },
      });

      if (!existing || existing.deletedAt !== null) {
        return {
          success: false,
          error: "Movimentação não encontrada.",
        };
      }

      // RN033 / CT12: Isolamento entre contas
      if (existing.userId !== user.userId) {
        return {
          success: false,
          error: "Acesso negado a esta movimentação.",
        };
      }

      // RN009: Só permite categoria inativa se já era a categoria original da movimentação
      if (!category.isActive && existing.categoryId !== category.id) {
        return {
          success: false,
          error:
            "Categorias inativas não estão disponíveis para novos lançamentos.",
        };
      }

      previousCategoryId = existing.categoryId;
      previousDate = existing.date;

      await db.transaction.update({
        where: { id },
        data: {
          type,
          amount,
          categoryId,
          date,
          description: description || null,
        },
      });
    } else {
      if (!category.isActive) {
        return {
          success: false,
          error:
            "Categorias inativas não estão disponíveis para novos lançamentos.",
        };
      }

      await db.transaction.create({
        data: {
          userId: user.userId,
          type,
          amount,
          categoryId,
          date,
          description: description || null,
          createdByAi: Boolean(createdByAi),
        },
      });
    }

    // Recalcula consumo de limites e sincroniza alertas (RN005 / RN014 / RN015)
    let triggeredAlert: TriggeredLimitAlert | null = null;
    if (previousCategoryId && previousDate) {
      await syncCategoryLimitAlerts({
        userId: user.userId,
        categoryId: previousCategoryId,
        referenceDate: previousDate,
      });
    }
    if (type === "EXPENSE") {
      triggeredAlert = await syncCategoryLimitAlerts({
        userId: user.userId,
        categoryId,
        referenceDate: date,
      });
    }

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/limits");
    revalidatePath("/reports");

    return {
      success: true,
      triggeredAlert,
    };
  } catch (error) {
    console.error("Erro ao salvar movimentação:", error);
    return {
      success: false,
      error: "Não foi possível registrar a movimentação.",
    };
  }
};
