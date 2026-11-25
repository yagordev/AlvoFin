import { TransactionType } from "@prisma/client";
import { db } from "./prisma";

export const DEFAULT_GLOBAL_CATEGORIES: Array<{
  name: string;
  type: TransactionType;
}> = [
  // Receitas (INCOME)
  { name: "Salário", type: TransactionType.INCOME },
  { name: "Freelance", type: TransactionType.INCOME },
  { name: "Rendimentos", type: TransactionType.INCOME },
  { name: "Outros", type: TransactionType.INCOME },
  // Despesas (EXPENSE)
  { name: "Moradia", type: TransactionType.EXPENSE },
  { name: "Alimentação", type: TransactionType.EXPENSE },
  { name: "Transporte", type: TransactionType.EXPENSE },
  { name: "Saúde", type: TransactionType.EXPENSE },
  { name: "Educação", type: TransactionType.EXPENSE },
  { name: "Lazer", type: TransactionType.EXPENSE },
  { name: "Utilidades", type: TransactionType.EXPENSE },
  { name: "Outros", type: TransactionType.EXPENSE },
];

/**
 * Garante que todas as categorias globais padrão (user_id = null, is_default = true)
 * estejam cadastradas e ativas no banco de dados (UC001 / RN007).
 */
export async function ensureDefaultCategories() {
  const existingGlobalCount = await db.category.count({
    where: { userId: null, isDefault: true, isActive: true },
  });

  if (existingGlobalCount >= DEFAULT_GLOBAL_CATEGORIES.length) {
    return;
  }

  for (const cat of DEFAULT_GLOBAL_CATEGORIES) {
    const existing = await db.category.findFirst({
      where: {
        userId: null,
        name: { equals: cat.name, mode: "insensitive" },
        type: cat.type,
      },
    });

    if (!existing) {
      await db.category.create({
        data: {
          userId: null,
          name: cat.name,
          type: cat.type,
          isDefault: true,
          isActive: true,
        },
      });
    } else if (!existing.isActive || !existing.isDefault) {
      await db.category.update({
        where: { id: existing.id },
        data: { isDefault: true, isActive: true },
      });
    }
  }
}
