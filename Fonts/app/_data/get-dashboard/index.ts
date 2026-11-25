import { db } from "@/app/_lib/prisma";
import { requireAuthUser } from "@/app/_lib/auth";
import { isFutureTransactionDate } from "@/app/_constants/transactions";
import {
  CategoryExpenseSummary,
  DashboardData,
  FeaturedGoalSummary,
  RecentTransactionItem,
} from "./types";

export const getDashboard = async (
  monthParam: number,
  yearParam?: number,
): Promise<DashboardData> => {
  const user = await requireAuthUser();

  const now = new Date();
  const month =
    Number.isFinite(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam
      : now.getUTCMonth() + 1;
  const year =
    yearParam && Number.isFinite(yearParam) && yearParam >= 2000
      ? yearParam
      : now.getUTCFullYear();

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  try {
    const [transactions, limits, goals] = await Promise.all([
      db.transaction.findMany({
        where: {
          userId: user.userId,
          deletedAt: null,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        include: {
          category: true,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      db.spendingLimit.findMany({
        where: {
          userId: user.userId,
          effectiveFrom: { lte: monthEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: monthStart } }],
        },
        include: {
          category: true,
        },
        orderBy: { effectiveFrom: "desc" },
      }),
      db.financialGoal.findMany({
        where: {
          userId: user.userId,
          deletedAt: null,
        },
        include: {
          goalTransactions: {
            where: { deletedAt: null },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    let realizedIncome = 0;
    let realizedExpense = 0;
    let plannedIncome = 0;
    let plannedExpense = 0;

    const categoryExpenseMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        realizedAmount: number;
        plannedAmount: number;
      }
    >();

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const isFuture = isFutureTransactionDate(tx.date);

      if (tx.type === "INCOME") {
        if (isFuture) {
          plannedIncome += amount;
        } else {
          realizedIncome += amount;
        }
      } else {
        if (isFuture) {
          plannedExpense += amount;
        } else {
          realizedExpense += amount;
        }

        const existing = categoryExpenseMap.get(tx.categoryId);
        if (existing) {
          if (isFuture) existing.plannedAmount += amount;
          else existing.realizedAmount += amount;
        } else {
          categoryExpenseMap.set(tx.categoryId, {
            categoryId: tx.categoryId,
            categoryName: tx.category.name,
            realizedAmount: isFuture ? 0 : amount,
            plannedAmount: isFuture ? amount : 0,
          });
        }
      }
    }

    // Inclui também categorias que possuem limite ativo no mês mesmo que ainda tenham R$ 0 gasto
    const limitByCategory = new Map<string, number>();
    for (const lim of limits) {
      if (!limitByCategory.has(lim.categoryId)) {
        limitByCategory.set(lim.categoryId, Number(lim.amount));
      }
      if (!categoryExpenseMap.has(lim.categoryId)) {
        categoryExpenseMap.set(lim.categoryId, {
          categoryId: lim.categoryId,
          categoryName: lim.category.name,
          realizedAmount: 0,
          plannedAmount: 0,
        });
      }
    }

    // RN010 e RN012:
    // Saldo realizado = Receitas realizadas - Despesas realizadas
    // Saldo previsto (projeção do mês) = (Receitas realizadas + Receitas previstas) - (Despesas realizadas + Despesas previstas)
    const realizedBalance = realizedIncome - realizedExpense;
    const projectedBalance =
      realizedIncome + plannedIncome - (realizedExpense + plannedExpense);

    // Percentual do orçamento comprometido no mês (Despesas realizadas / Receitas realizadas)
    const budgetCommittedPercentage =
      realizedIncome > 0
        ? Math.min(Math.round((realizedExpense / realizedIncome) * 100), 999)
        : realizedExpense > 0
          ? 100
          : 0;

    const expensesPerCategory: CategoryExpenseSummary[] = Array.from(
      categoryExpenseMap.values(),
    )
      .map((item) => {
        const limitAmount = limitByCategory.get(item.categoryId) ?? null;
        const referenceTotal =
          limitAmount && limitAmount > 0
            ? limitAmount
            : realizedExpense > 0
              ? realizedExpense
              : 1;
        const percentage = Math.round(
          (item.realizedAmount / referenceTotal) * 100,
        );
        return {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          realizedAmount: item.realizedAmount,
          plannedAmount: item.plannedAmount,
          limitAmount,
          referenceTotal,
          percentage,
        };
      })
      .sort((a, b) => b.realizedAmount - a.realizedAmount);

    const lastTransactions: RecentTransactionItem[] = transactions
      .slice(0, 8)
      .map((tx) => ({
        id: tx.id,
        description: tx.description || tx.category.name,
        categoryName: tx.category.name,
        type: tx.type,
        amount: Number(tx.amount),
        date: tx.date.toISOString(),
        isFuture: isFutureTransactionDate(tx.date),
        createdByAi: tx.createdByAi,
      }));

    // Objetivo em destaque (RN016: independente do saldo principal)
    let featuredGoal: FeaturedGoalSummary | null = null;
    if (goals.length > 0) {
      const firstGoal = goals[0];
      let goalBalance = 0;
      for (const m of firstGoal.goalTransactions) {
        if (m.type === "CONTRIBUTION") goalBalance += Number(m.amount);
        else goalBalance -= Number(m.amount);
      }
      const targetAmount = Number(firstGoal.targetAmount);
      const percentage =
        targetAmount > 0 ? Math.round((goalBalance / targetAmount) * 100) : 0;

      featuredGoal = {
        id: firstGoal.id,
        name: firstGoal.name,
        currentBalance: goalBalance,
        targetAmount,
        percentage,
      };
    }

    return {
      month,
      year,
      realizedIncome,
      realizedExpense,
      realizedBalance,
      plannedIncome,
      plannedExpense,
      projectedBalance,
      budgetCommittedPercentage,
      expensesPerCategory,
      lastTransactions,
      featuredGoal,
    };
  } catch (err) {
    console.error("Erro ao carregar dados do dashboard:", err);
    return {
      month,
      year,
      realizedIncome: 0,
      realizedExpense: 0,
      realizedBalance: 0,
      plannedIncome: 0,
      plannedExpense: 0,
      projectedBalance: 0,
      budgetCommittedPercentage: 0,
      expensesPerCategory: [],
      lastTransactions: [],
      featuredGoal: null,
    };
  }
};
