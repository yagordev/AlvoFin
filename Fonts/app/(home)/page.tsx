import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "../_components/navbar";
import SummaryCards from "./_components/summary-cards";
import TimeSelect from "./_components/time-select";
import TransactionsPieChart from "./_components/transactions-pie-chart";
import ExpensesPerCategory from "./_components/expenses-per-category";
import LastTransactions from "./_components/last-transactions";
import AiReportButton from "./_components/ai-report-button";
import { AiTransactionButton } from "../_components/ai-transaction-button";
import { getDashboard } from "../_data/get-dashboard";
import { getUserCategories } from "../_data/get-categories";
import { requireAuthUser } from "../_lib/auth";
import { formatCurrency } from "../_utils/currency";

interface HomeProps {
  searchParams: {
    month?: string;
    year?: string;
  };
}

const Home = async ({ searchParams: { month, year } }: HomeProps) => {
  await requireAuthUser();

  const now = new Date();
  const parsedMonth = Number(month);
  const parsedYear = Number(year) || now.getFullYear();

  // RN011: O dashboard utiliza o mês atual como período padrão
  if (!month || !Number.isFinite(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    redirect(`/?month=${now.getMonth() + 1}&year=${parsedYear}`);
  }

  const [dashboard, categories] = await Promise.all([
    getDashboard(parsedMonth, parsedYear),
    getUserCategories(),
  ]);

  const featuredGoal = dashboard.featuredGoal;
  const featuredGoalBarPct = featuredGoal
    ? Math.min(featuredGoal.percentage, 100)
    : 0;

  return (
    <>
      <Navbar />
      <div className="flex flex-1 flex-col space-y-6 p-6 lg:px-8">
        {/* TOPO DO DASHBOARD */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <div className="flex flex-wrap items-center gap-3">
            <AiTransactionButton categories={categories} />
            <AiReportButton month={parsedMonth} year={parsedYear} />
            <TimeSelect />
          </div>
        </div>

        {/* GRID PRINCIPAL FIEL AO PROTÓTIPO AlvoFin_Tela_Dashboard.png */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.85fr_1fr]">
          {/* COLUNA ESQUERDA */}
          <div className="flex flex-col gap-6">
            <SummaryCards
              realizedBalance={dashboard.realizedBalance}
              projectedBalance={dashboard.projectedBalance}
              realizedIncome={dashboard.realizedIncome}
              realizedExpense={dashboard.realizedExpense}
              plannedIncome={dashboard.plannedIncome}
              plannedExpense={dashboard.plannedExpense}
              categories={categories}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[270px_1fr]">
              <TransactionsPieChart
                budgetCommittedPercentage={dashboard.budgetCommittedPercentage}
                realizedIncome={dashboard.realizedIncome}
                realizedExpense={dashboard.realizedExpense}
                projectedBalance={dashboard.projectedBalance}
              />
              <ExpensesPerCategory
                expensesPerCategory={dashboard.expensesPerCategory}
              />
            </div>
          </div>

          {/* COLUNA DIREITA: TRANSAÇÕES RECENTES + OBJETIVO EM DESTAQUE */}
          <div className="flex flex-col justify-between gap-6">
            <LastTransactions lastTransactions={dashboard.lastTransactions} />

            {/* CARD OBJETIVO EM DESTAQUE */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#9CA3AF]">
                  Objetivo em destaque
                </p>
                <Link
                  href="/goals"
                  className="text-xs font-semibold text-[#55B02E] hover:underline"
                >
                  {featuredGoal ? "Ver objetivos" : "Criar objetivo"}
                </Link>
              </div>

              {featuredGoal ? (
                <>
                  <h3 className="mt-2 text-lg font-bold text-white">
                    {featuredGoal.name}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">
                      {formatCurrency(featuredGoal.currentBalance)} de{" "}
                      {formatCurrency(featuredGoal.targetAmount)}
                    </span>
                    <span className="font-bold text-white">
                      {featuredGoal.percentage}%
                    </span>
                  </div>
                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#262626]">
                    <div
                      className="h-full rounded-full bg-[#55B02E] transition-all"
                      style={{ width: `${featuredGoalBarPct}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-white">
                    Nenhuma meta financeira ativa
                  </p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Defina uma Reserva de Emergência ou outro objetivo para
                    acompanhar seu progresso aqui.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
