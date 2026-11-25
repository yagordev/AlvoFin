import { db } from "@/app/_lib/prisma";
import { requireAuthUser } from "@/app/_lib/auth";
import { ensureDefaultCategories } from "@/app/_lib/default-categories";

export interface CategoryDTO {
  id: string;
  userId: string | null;
  name: string;
  type: "INCOME" | "EXPENSE";
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
}

export async function getUserCategories(): Promise<CategoryDTO[]> {
  const user = await requireAuthUser();
  await ensureDefaultCategories();

  const categories = await db.category.findMany({
    where: {
      OR: [{ userId: null }, { userId: user.userId }],
    },
    include: {
      _count: {
        select: {
          transactions: {
            where: { userId: user.userId, deletedAt: null },
          },
          spendingLimits: {
            where: { userId: user.userId },
          },
        },
      },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return categories.map((cat) => ({
    id: cat.id,
    userId: cat.userId,
    name: cat.name,
    type: cat.type,
    isDefault: cat.isDefault,
    isActive: cat.isActive,
    usageCount: cat._count.transactions + cat._count.spendingLimits,
  }));
}
