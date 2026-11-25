"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/app/_lib/prisma";
import { requireAuthUser } from "@/app/_lib/auth";
import { syncCategoryLimitAlerts } from "@/app/_lib/limit-alerts";
import { DeleteTransactionSchema } from "./schema";

export const deleteTransaction = async ({
  transactionId,
}: DeleteTransactionSchema): Promise<{
  success: boolean;
  error?: string;
}> => {
  const user = await requireAuthUser();

  try {
    const existing = await db.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!existing || existing.deletedAt !== null) {
      return { success: false, error: "Movimentação não encontrada." };
    }

    // RN033 / CT12: Isolamento entre contas
    if (existing.userId !== user.userId) {
      return { success: false, error: "Acesso negado a esta movimentação." };
    }

    // Seção 2.3 e 4.1 do Modelo de Dados: Exclusão lógica (deleted_at)
    await db.transaction.update({
      where: { id: transactionId },
      data: {
        deletedAt: new Date(),
      },
    });

    // UC007-A4 / RN005 / RN014: Recalcula automaticamente o consumo do limite
    if (existing.type === "EXPENSE") {
      await syncCategoryLimitAlerts({
        userId: user.userId,
        categoryId: existing.categoryId,
        referenceDate: existing.date,
      });
    }

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath("/limits");
    revalidatePath("/reports");

    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir movimentação:", error);
    return {
      success: false,
      error: "Não foi possível excluir a movimentação.",
    };
  }
};
