import AddTransactionButton from "@/app/_components/add-transaction-button";
import { CategoryDTO } from "@/app/_data/get-categories";
import { formatCurrency } from "@/app/_utils/currency";

interface SummaryCardsProps {
  realizedBalance: number;
  projectedBalance: number;
  realizedIncome: number;
  realizedExpense: number;
  plannedIncome: number;
  plannedExpense: number;
  categories: CategoryDTO[];
}

const SummaryCards = ({
  realizedBalance,
  projectedBalance,
  realizedIncome,
  realizedExpense,
  plannedIncome,
  plannedExpense,
  categories,
}: SummaryCardsProps) => {
  return (
    <div className="space-y-5">
      {/* CARD PRINCIPAL: SALDO ATUAL (REALIZADO) + SALDO PREVISTO + BOTÃO NOVA MOVIMENTAÇÃO */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#141414] px-7 py-6">
        <div>
          <p className="text-sm font-medium text-[#D1D5DB]">Saldo atual</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-white">
            {formatCurrency(realizedBalance)}
          </p>
          <p className="mt-1.5 text-xs text-[#9CA3AF]">
            Saldo previsto: {formatCurrency(projectedBalance)}
          </p>
        </div>

        <AddTransactionButton
          categories={categories}
          label="Nova movimentação"
        />
      </div>

      {/* 3 CARDS SECUNDÁRIOS: RECEITAS, DESPESAS, PREVISTO (RN010 / RN012) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* RECEITAS */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] px-6 py-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#9CA3AF]">Receitas</span>
            <span className="h-2.5 w-2.5 rounded-full bg-[#55B02E]" />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {formatCurrency(realizedIncome)}
          </p>
          {plannedIncome > 0 && (
            <p className="mt-1 text-[11px] text-[#55B02E]">
              + {formatCurrency(plannedIncome)} previstas no mês
            </p>
          )}
        </div>

        {/* DESPESAS */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] px-6 py-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#9CA3AF]">Despesas</span>
            <span className="h-2.5 w-2.5 rounded-full bg-[#F6352E]" />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {formatCurrency(realizedExpense)}
          </p>
          {plannedExpense > 0 && (
            <p className="mt-1 text-[11px] text-[#F6352E]">
              + {formatCurrency(plannedExpense)} previstas no mês
            </p>
          )}
        </div>

        {/* PREVISTO */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] px-6 py-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#9CA3AF]">Previsto</span>
            <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]" />
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {formatCurrency(projectedBalance)}
          </p>
          {(plannedIncome > 0 || plannedExpense > 0) && (
            <p className="mt-1 text-[11px] text-[#9CA3AF]">
              Projeção ao final do mês
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
