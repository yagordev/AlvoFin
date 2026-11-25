"use client";

import React from "react";
import { formatCurrency } from "@/app/_utils/currency";

interface TransactionsPieChartProps {
  budgetCommittedPercentage: number;
  realizedIncome: number;
  realizedExpense: number;
  projectedBalance: number;
}

const TransactionsPieChart = ({
  budgetCommittedPercentage,
  realizedIncome,
  realizedExpense,
  projectedBalance,
}: TransactionsPieChartProps) => {
  const clampedPct = Math.max(0, Math.min(budgetCommittedPercentage, 100));
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (clampedPct / 100) * circumference;

  const ringColor =
    budgetCommittedPercentage >= 100
      ? "#F6352E"
      : budgetCommittedPercentage >= 80
        ? "#F59E0B"
        : "#55B02E";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#141414] p-6">
      <h3 className="text-base font-bold text-white">Resumo do mês</h3>

      {/* ANEL CIRCULAR (DONUT) CONFORME PROTÓTIPO */}
      <div className="my-6 flex items-center justify-center">
        <div className="relative flex h-40 w-40 items-center justify-center">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 150 150">
            <circle
              cx="75"
              cy="75"
              r={radius}
              stroke="#242424"
              strokeWidth="14"
              fill="transparent"
            />
            <circle
              cx="75"
              cy="75"
              r={radius}
              stroke={ringColor}
              strokeWidth="14"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-white">
              {budgetCommittedPercentage}%
            </span>
            <span className="text-[11px] text-[#9CA3AF]">do orçamento</span>
          </div>
        </div>
      </div>

      {/* LEGENDA: RECEITAS, DESPESAS, PREVISTO */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#9CA3AF]">
            <span className="h-2 w-2 rounded-full bg-[#55B02E]" />
            <span>Receitas</span>
          </div>
          <span className="font-medium text-[#D1D5DB]">
            {formatCurrency(realizedIncome)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#9CA3AF]">
            <span className="h-2 w-2 rounded-full bg-[#F6352E]" />
            <span>Despesas</span>
          </div>
          <span className="font-medium text-[#D1D5DB]">
            {formatCurrency(realizedExpense)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#9CA3AF]">
            <span className="h-2 w-2 rounded-full bg-[#9CA3AF]" />
            <span>Previsto</span>
          </div>
          <span className="font-medium text-[#D1D5DB]">
            {formatCurrency(projectedBalance)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPieChart;
