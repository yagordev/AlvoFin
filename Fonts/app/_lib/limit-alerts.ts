import { TransactionType } from "@prisma/client";
import { db } from "./prisma";

export interface TriggeredLimitAlert {
  threshold: number;
  percentage: number;
  consumedAmount: number;
  limitAmount: number;
  categoryName: string;
}

/**
 * Recalcula o consumo do limite vigente da categoria no mês/ano da data informada
 * e sincroniza os alertas de 75%, 90% e 100% na tabela limit_alerts (RN014, RN015, UC007, CT06).
 */
export async function syncCategoryLimitAlerts(params: {
  userId: string;
  categoryId: string;
  referenceDate: Date;
}): Promise<TriggeredLimitAlert | null> {
  const { userId, categoryId, referenceDate } = params;

  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth() + 1; // 1..12

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // Busca o limite vigente para a categoria no período consultado
  const activeLimit = await db.spendingLimit.findFirst({
    where: {
      userId,
      categoryId,
      effectiveFrom: { lte: monthEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: monthStart } }],
    },
    include: {
      category: true,
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!activeLimit) {
    return null;
  }

  // Data de corte para despesas realizadas (até o final do dia atual)
  const now = new Date();
  const todayEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  const cutoffDate = monthEnd < todayEnd ? monthEnd : todayEnd;

  const expensesAgg = await db.transaction.aggregate({
    where: {
      userId,
      categoryId,
      type: TransactionType.EXPENSE,
      deletedAt: null,
      date: {
        gte: monthStart,
        lte: cutoffDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  const consumedAmount = Number(expensesAgg._sum.amount ?? 0);
  const limitAmount = Number(activeLimit.amount);

  if (limitAmount <= 0) {
    return null;
  }

  const percentage = (consumedAmount / limitAmount) * 100;
  const thresholds = [75, 90, 100];
  const reachedThresholds = thresholds.filter((t) => percentage >= t);

  // Remove patamares que deixaram de ser atingidos após edição/exclusão de despesa (UC007-A4)
  await db.limitAlert.deleteMany({
    where: {
      spendingLimitId: activeLimit.id,
      referenceMonth: month,
      referenceYear: year,
      threshold: {
        notIn: reachedThresholds,
      },
    },
  });

  if (reachedThresholds.length > 0) {
    await db.limitAlert.createMany({
      data: reachedThresholds.map((threshold) => ({
        spendingLimitId: activeLimit.id,
        referenceMonth: month,
        referenceYear: year,
        threshold,
      })),
      skipDuplicates: true,
    });

    const highestThreshold = reachedThresholds[reachedThresholds.length - 1];
    return {
      threshold: highestThreshold,
      percentage: Math.round(percentage),
      consumedAmount,
      limitAmount,
      categoryName: activeLimit.category.name,
    };
  }

  return null;
}
