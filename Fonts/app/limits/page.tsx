import Navbar from "../_components/navbar";
import { requireAuthUser } from "../_lib/auth";
import { db } from "../_lib/prisma";
import { getUserCategories } from "../_data/get-categories";
import { MONTHS_OPTIONS } from "../_constants/transactions";
import {
  ActiveLimitDTO,
  HistoricalLimitDTO,
  LimitsClient,
} from "./_components/limits-client";

const LimitsPage = async () => {
  const user = await requireAuthUser();
  const allCategories = await getUserCategories();
  const expenseCategories = allCategories.filter(
    (c) => c.type === "EXPENSE" && c.isActive,
  );

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
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

  let activeLimits: ActiveLimitDTO[] = [];
  let historicalLimits: HistoricalLimitDTO[] = [];

  try {
    const allLimits = await db.spendingLimit.findMany({
      where: { userId: user.userId },
      include: {
        category: true,
        limitAlerts: {
          where: {
            referenceMonth: month,
            referenceYear: year,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    historicalLimits = allLimits.map((l) => ({
      id: l.id,
      categoryName: l.category.name,
      limitAmount: Number(l.amount),
      effectiveFrom: l.effectiveFrom.toISOString(),
      effectiveTo: l.effectiveTo ? l.effectiveTo.toISOString() : null,
    }));

    const currentOpenLimits = allLimits.filter((l) => l.effectiveTo === null);

    // Soma despesas do mês atual por categoria (separando realizado x previsto)
    const monthExpenses = await db.transaction.findMany({
      where: {
        userId: user.userId,
        type: "EXPENSE",
        deletedAt: null,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    activeLimits = currentOpenLimits.map((lim) => {
      const catExpenses = monthExpenses.filter(
        (tx) => tx.categoryId === lim.categoryId,
      );
      let consumedRealized = 0;
      let consumedPlanned = 0;

      for (const tx of catExpenses) {
        if (tx.date <= todayEnd) {
          consumedRealized += Number(tx.amount);
        } else {
          consumedPlanned += Number(tx.amount);
        }
      }

      const limitAmount = Number(lim.amount);
      const percentageRealized =
        limitAmount > 0 ? Math.round((consumedRealized / limitAmount) * 100) : 0;

      return {
        id: lim.id,
        categoryId: lim.categoryId,
        categoryName: lim.category.name,
        limitAmount,
        consumedRealized,
        consumedPlanned,
        percentageRealized,
        effectiveFrom: lim.effectiveFrom.toISOString(),
        alertsTriggered: lim.limitAlerts.map((a) => a.threshold),
      };
    });
  } catch (err) {
    console.error("Erro ao carregar limites:", err);
  }

  const currentMonthLabel = `${
    MONTHS_OPTIONS.find((m) => m.value === String(month))?.label || month
  } de ${year}`;

  return (
    <>
      <Navbar />
      <LimitsClient
        expenseCategories={expenseCategories}
        activeLimits={activeLimits}
        historicalLimits={historicalLimits}
        currentMonthLabel={currentMonthLabel}
      />
    </>
  );
};

export default LimitsPage;
