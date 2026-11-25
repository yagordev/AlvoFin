"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/app/_lib/prisma";
import { requireAuthUser } from "@/app/_lib/auth";
import {
  categoryIdSchema,
  UpsertCategoryInput,
  upsertCategorySchema,
} from "./schema";

export async function upsertCategoryAction(
  input: UpsertCategoryInput,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuthUser();
  const parsed = upsertCategorySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Dados da categoria inválidos.",
    };
  }

  const { id, name, type } = parsed.data;

  try {
    // Valida unicidade ativa (Seção 2.2 e 4.4 do Modelo de Dados):
    // Não pode haver categoria ativa com mesmo nome e tipo no escopo global OU do próprio usuário.
    const duplicateActive = await db.category.findFirst({
      where: {
        isActive: true,
        type,
        name: { equals: name, mode: "insensitive" },
        OR: [{ userId: null }, { userId: user.userId }],
        ...(id ? { NOT: { id } } : {}),
      },
    });

    if (duplicateActive) {
      return {
        success: false,
        error: `Já existe uma categoria ativa chamada "${duplicateActive.name}" para ${
          type === "INCOME" ? "Receitas" : "Despesas"
        }.`,
      };
    }

    if (id) {
      const existing = await db.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: { transactions: true, spendingLimits: true },
          },
        },
      });

      if (!existing) {
        return { success: false, error: "Categoria não encontrada." };
      }

      // UC004-A4 / RN007: Impede editar categoria padrão
      if (existing.isDefault || existing.userId === null) {
        return {
          success: false,
          error: "Categorias padrão não podem ser editadas.",
        };
      }

      // RN033 / CT12: Isolamento entre contas
      if (existing.userId !== user.userId) {
        return {
          success: false,
          error: "Acesso negado a esta categoria.",
        };
      }

      // RN006: Impede trocar o tipo caso já existam movimentações ou limites vinculados
      if (
        existing.type !== type &&
        (existing._count.transactions > 0 || existing._count.spendingLimits > 0)
      ) {
        return {
          success: false,
          error:
            "Não é permitido alterar o tipo de uma categoria que já possui movimentações ou limites vinculados.",
        };
      }

      await db.category.update({
        where: { id },
        data: { name, type },
      });
    } else {
      await db.category.create({
        data: {
          userId: user.userId,
          name,
          type,
          isDefault: false,
          isActive: true,
        },
      });
    }

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/limits");
    revalidatePath("/reports");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar categoria:", error);
    return {
      success: false,
      error: "Não foi possível salvar a categoria.",
    };
  }
}

export async function removeOrDeactivateCategoryAction(input: {
  id: string;
}): Promise<{
  success: boolean;
  mode?: "deactivated" | "deleted";
  error?: string;
}> {
  const user = await requireAuthUser();
  const parsed = categoryIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Categoria inválida." };
  }

  try {
    const category = await db.category.findUnique({
      where: { id: parsed.data.id },
      include: {
        _count: {
          select: {
            transactions: true,
            spendingLimits: true,
          },
        },
      },
    });

    if (!category) {
      return { success: false, error: "Categoria não encontrada." };
    }

    // UC004-A4 / RN007: Categorias padrão não podem ser excluídas
    if (category.isDefault || category.userId === null) {
      return {
        success: false,
        error: "Categorias padrão do sistema não podem ser removidas.",
      };
    }

    // RN033 / CT12: Verifica propriedade
    if (category.userId !== user.userId) {
      return {
        success: false,
        error: "Acesso negado a esta categoria.",
      };
    }

    const hasLinkedRecords =
      category._count.transactions > 0 || category._count.spendingLimits > 0;

    if (hasLinkedRecords) {
      // UC004-A3 / RN009: Marca como inativa preservando histórico
      await db.category.update({
        where: { id: category.id },
        data: { isActive: false },
      });

      revalidatePath("/");
      revalidatePath("/transactions");
      revalidatePath("/limits");
      revalidatePath("/reports");
      return { success: true, mode: "deactivated" };
    } else {
      // UC004-A2: Remove categoria sem movimentações
      await db.category.delete({
        where: { id: category.id },
      });

      revalidatePath("/");
      revalidatePath("/transactions");
      revalidatePath("/limits");
      revalidatePath("/reports");
      return { success: true, mode: "deleted" };
    }
  } catch (error) {
    console.error("Erro ao remover categoria:", error);
    return {
      success: false,
      error: "Não foi possível remover a categoria.",
    };
  }
}

export async function reactivateCategoryAction(input: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuthUser();
  const parsed = categoryIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Categoria inválida." };
  }

  try {
    const category = await db.category.findUnique({
      where: { id: parsed.data.id },
    });

    if (!category || category.userId !== user.userId || category.isDefault) {
      return {
        success: false,
        error: "Categoria inválida para reativação.",
      };
    }

    // Verifica duplicidade ativa antes de reativar (Seção 4.4 do Modelo de Dados)
    const duplicateActive = await db.category.findFirst({
      where: {
        isActive: true,
        type: category.type,
        name: { equals: category.name, mode: "insensitive" },
        OR: [{ userId: null }, { userId: user.userId }],
        NOT: { id: category.id },
      },
    });

    if (duplicateActive) {
      return {
        success: false,
        error: `Já existe uma categoria ativa com o nome "${duplicateActive.name}".`,
      };
    }

    await db.category.update({
      where: { id: category.id },
      data: { isActive: true },
    });

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/limits");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Não foi possível reativar a categoria.",
    };
  }
}
