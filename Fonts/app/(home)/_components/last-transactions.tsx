import Link from "next/link";
import { RecentTransactionItem } from "@/app/_data/get-dashboard/types";
import { formatCurrency } from "@/app/_utils/currency";
import { Badge } from "@/app/_components/ui/badge";

interface LastTransactionsProps {
  lastTransactions: RecentTransactionItem[];
}

const LastTransactions = ({ lastTransactions }: LastTransactionsProps) => {
  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#141414] p-6">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <h3 className="text-base font-bold text-white">Transações recentes</h3>
        <Link
          href="/transactions"
          className="text-xs font-semibold text-[#55B02E] hover:underline"
        >
          Ver todas
        </Link>
      </div>

      {lastTransactions.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#9CA3AF]">
          Nenhuma movimentação encontrada para este mês.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {lastTransactions.map((transaction) => {
            const isIncome = transaction.type === "INCOME";
            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C1C1C]">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isIncome ? "bg-[#55B02E]" : "bg-[#F6352E]"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">
                        {transaction.description}
                      </p>
                      {transaction.isFuture && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-300"
                        >
                          Previsto
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#9CA3AF]">
                      {new Date(transaction.date).toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-sm font-bold ${
                    isIncome ? "text-[#55B02E]" : "text-[#F6352E]"
                  }`}
                >
                  {isIncome ? "+" : "-"} {formatCurrency(transaction.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LastTransactions;
