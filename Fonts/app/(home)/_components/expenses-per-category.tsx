import Link from "next/link";
import { CategoryExpenseSummary } from "@/app/_data/get-dashboard/types";
import { formatCurrency } from "@/app/_utils/currency";

interface ExpensesPerCategoryProps {
  expensesPerCategory: CategoryExpenseSummary[];
}

const ExpensesPerCategory = ({
  expensesPerCategory,
}: ExpensesPerCategoryProps) => {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#141414] p-6">
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            Gastos por categoria
          </h3>
          <Link
            href="/limits"
            className="text-xs font-medium text-[#55B02E] hover:underline"
          >
            Configurar limites
          </Link>
        </div>

        {expensesPerCategory.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#9CA3AF]">
            Nenhuma despesa registrada neste período.
          </div>
        ) : (
          <div className="space-y-5">
            {expensesPerCategory.slice(0, 5).map((item) => {
              const barPct = Math.min(item.percentage, 100);
              const barColor =
                item.limitAmount && item.percentage >= 100
                  ? "bg-[#F6352E]"
                  : item.limitAmount && item.percentage >= 75
                    ? "bg-[#F59E0B]"
                    : "bg-[#55B02E]";

              return (
                <div key={item.categoryId} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">
                      {item.categoryName}
                    </span>

                    <div className="flex items-center gap-3">
                      <span className="text-[#9CA3AF]">
                        {formatCurrency(item.realizedAmount)}
                        {item.limitAmount
                          ? ` / ${formatCurrency(item.limitAmount)}`
                          : ""}
                      </span>
                      <span className="w-9 text-right font-bold text-white">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#262626]">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesPerCategory;
