import { TransactionType } from "@prisma/client";

export interface CategoryExpenseSummary {
  categoryId: string;
  categoryName: string;
  realizedAmount: number;
  plannedAmount: number;
  limitAmount: number | null;
  referenceTotal: number;
  percentage: number;
}

export interface RecentTransactionItem {
  id: string;
  description: string;
  categoryName: string;
  type: TransactionType;
  amount: number;
  date: string;
  isFuture: boolean;
  createdByAi: boolean;
}

export interface FeaturedGoalSummary {
  id: string;
  name: string;
  currentBalance: number;
  targetAmount: number;
  percentage: number;
}

export interface DashboardData {
  month: number;
  year: number;
  realizedIncome: number;
  realizedExpense: number;
  realizedBalance: number;
  plannedIncome: number;
  plannedExpense: number;
  projectedBalance: number;
  budgetCommittedPercentage: number;
  expensesPerCategory: CategoryExpenseSummary[];
  lastTransactions: RecentTransactionItem[];
  featuredGoal: FeaturedGoalSummary | null;
}
