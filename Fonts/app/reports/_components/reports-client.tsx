"use client";

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BarChart3Icon,
  CalendarRangeIcon,
  InfoIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Input } from "@/app/_components/ui/input";
import { Badge } from "@/app/_components/ui/badge";
import { MONTHS_OPTIONS } from "@/app/_constants/transactions";
import { formatCurrency } from "@/app/_utils/currency";
import { CategoryDTO } from "@/app/_data/get-categories";
import { SerializedTransaction } from "@/app/transactions/_components/edit-transaction-button";

interface ReportsClientProps {
  transactions: SerializedTransaction[];
  categories: CategoryDTO[];
}

type PeriodMode = "MONTHLY" | "ANNUAL" | "CUSTOM";

export const ReportsClient = ({
  transactions,
  categories,
}: ReportsClientProps) => {
  const now = new Date();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("MONTHLY");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(now.getMonth() + 1),
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    String(now.getFullYear()),
  );
  const [customStart, setCustomStart] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [customEnd, setCustomEnd] = useState<string>(
    now.toISOString().slice(0, 10),
  );
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">(
    "ALL",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Calcula os intervalos do período principal e do período de comparação (RN020 / RF007)
  const { currentRange, comparisonRange, periodLabel, comparisonLabel } =
    useMemo(() => {
      const yr = Number(selectedYear);
      const mo = Number(selectedMonth);

      if (periodMode === "MONTHLY") {
        const start = new Date(Date.UTC(yr, mo - 1, 1));
        const end = new Date(Date.UTC(yr, mo, 0, 23, 59, 59, 999));

        const prevMonth = mo === 1 ? 12 : mo - 1;
        const prevYear = mo === 1 ? yr - 1 : yr;
        const compStart = new Date(Date.UTC(prevYear, prevMonth - 1, 1));
        const compEnd = new Date(
          Date.UTC(prevYear, prevMonth, 0, 23, 59, 59, 999),
        );

        const mLabel =
          MONTHS_OPTIONS.find((m) => m.value === String(mo))?.label || mo;
        const prevMLabel =
          MONTHS_OPTIONS.find((m) => m.value === String(prevMonth))?.label ||
          prevMonth;

        return {
          currentRange: { start, end },
          comparisonRange: { start: compStart, end: compEnd },
          periodLabel: `${mLabel} de ${yr}`,
          comparisonLabel: `${prevMLabel} de ${prevYear}`,
        };
      }

      if (periodMode === "ANNUAL") {
        const start = new Date(Date.UTC(yr, 0, 1));
        const end = new Date(Date.UTC(yr, 11, 31, 23, 59, 59, 999));

        const compStart = new Date(Date.UTC(yr - 1, 0, 1));
        const compEnd = new Date(Date.UTC(yr - 1, 11, 31, 23, 59, 59, 999));

        return {
          currentRange: { start, end },
          comparisonRange: { start: compStart, end: compEnd },
          periodLabel: `Ano de ${yr}`,
          comparisonLabel: `Ano de ${yr - 1}`,
        };
      }

      // Período personalizado
      const start = customStart
        ? new Date(`${customStart}T00:00:00Z`)
        : new Date(Date.UTC(yr, mo - 1, 1));
      const end = customEnd
        ? new Date(`${customEnd}T23:59:59Z`)
        : new Date(Date.UTC(yr, mo, 0, 23, 59, 59));

      const durationMs = Math.max(
        end.getTime() - start.getTime(),
        24 * 3600 * 1000,
      );
      const compEnd = new Date(start.getTime() - 1000);
      const compStart = new Date(compEnd.getTime() - durationMs);

      return {
        currentRange: { start, end },
        comparisonRange: { start: compStart, end: compEnd },
        periodLabel: `${start.toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        })} até ${end.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`,
        comparisonLabel: `${compStart.toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        })} até ${compEnd.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`,
      };
    }, [periodMode, selectedMonth, selectedYear, customStart, customEnd]);

  const filterTx = (
    txs: SerializedTransaction[],
    range: { start: Date; end: Date },
  ) =>
    txs.filter((t) => {
      const d = new Date(t.date);
      if (d < range.start || d > range.end) return false;
      if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
      if (categoryFilter !== "ALL" && t.categoryId !== categoryFilter)
        return false;
      return true;
    });

  const currentTransactions = useMemo(
    () => filterTx(transactions, currentRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, currentRange, typeFilter, categoryFilter],
  );

  const comparisonTransactions = useMemo(
    () => filterTx(transactions, comparisonRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, comparisonRange, typeFilter, categoryFilter],
  );

  const summarize = (txs: SerializedTransaction[]) => {
    let realizedIncome = 0;
    let realizedExpense = 0;
    let plannedIncome = 0;
    let plannedExpense = 0;

    const byCategory = new Map<
      string,
      {
        categoryName: string;
        type: "INCOME" | "EXPENSE";
        realized: number;
        planned: number;
      }
    >();

    for (const t of txs) {
      if (t.isFuture) {
        if (t.type === "INCOME") plannedIncome += t.amount;
        else plannedExpense += t.amount;
      } else {
        if (t.type === "INCOME") realizedIncome += t.amount;
        else realizedExpense += t.amount;
      }

      const key = `${t.type}:${t.categoryName}`;
      const existing = byCategory.get(key);
      if (existing) {
        if (t.isFuture) existing.planned += t.amount;
        else existing.realized += t.amount;
      } else {
        byCategory.set(key, {
          categoryName: t.categoryName,
          type: t.type,
          realized: t.isFuture ? 0 : t.amount,
          planned: t.isFuture ? t.amount : 0,
        });
      }
    }

    const realizedBalance = realizedIncome - realizedExpense;
    const projectedBalance =
      realizedIncome + plannedIncome - (realizedExpense + plannedExpense);

    return {
      count: txs.length,
      realizedIncome,
      realizedExpense,
      realizedBalance,
      plannedIncome,
      plannedExpense,
      projectedBalance,
      categoriesBreakdown: Array.from(byCategory.values()).sort(
        (a, b) => b.realized + b.planned - (a.realized + a.planned),
      ),
    };
  };

  const currentSummary = useMemo(
    () => summarize(currentTransactions),
    [currentTransactions],
  );
  const comparisonSummary = useMemo(
    () => summarize(comparisonTransactions),
    [comparisonTransactions],
  );

  const chartData = [
    {
      name: "Período Anterior",
      Receitas: Number(comparisonSummary.realizedIncome.toFixed(2)),
      Despesas: Number(comparisonSummary.realizedExpense.toFixed(2)),
      Previsto: Number(
        (
          comparisonSummary.plannedIncome + comparisonSummary.plannedExpense
        ).toFixed(2),
      ),
    },
    {
      name: "Período Selecionado",
      Receitas: Number(currentSummary.realizedIncome.toFixed(2)),
      Despesas: Number(currentSummary.realizedExpense.toFixed(2)),
      Previsto: Number(
        (currentSummary.plannedIncome + currentSummary.plannedExpense).toFixed(
          2,
        ),
      ),
    },
  ];

  const calcDeltaPercent = (curr: number, prev: number) => {
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const incomeDelta = calcDeltaPercent(
    currentSummary.realizedIncome,
    comparisonSummary.realizedIncome,
  );
  const expenseDelta = calcDeltaPercent(
    currentSummary.realizedExpense,
    comparisonSummary.realizedExpense,
  );

  return (
    <div className="flex flex-col space-y-6 p-6 lg:px-8">
      {/* CABEÇALHO */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Relatórios Financeiros
          </h1>
          <p className="text-xs text-[#9CA3AF]">
            Analise receitas e despesas por período mensal, anual ou
            personalizado, diferencie valores realizados e previstos e compare
            períodos (RF006, RF007, RN020).
          </p>
        </div>

        {/* SELETOR DO MODO DE CONSULTA (RN020) */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#141414] p-1">
          {(
            [
              { key: "MONTHLY", label: "Mensal" },
              { key: "ANNUAL", label: "Anual" },
              { key: "CUSTOM", label: "Personalizado" },
            ] as const
          ).map((mode) => (
            <button
              key={mode.key}
              type="button"
              onClick={() => setPeriodMode(mode.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                periodMode === mode.key
                  ? "bg-[#55B02E] text-white"
                  : "text-[#9CA3AF] hover:text-white"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* BARRA DE FILTROS DO RELATÓRIO */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/[0.08] bg-[#141414] p-4 sm:grid-cols-2 lg:grid-cols-4">
        {periodMode === "MONTHLY" && (
          <>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#9CA3AF]">
                Mês
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="border-white/10 bg-[#111111]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#9CA3AF]">
                Ano
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="border-white/10 bg-[#111111]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    now.getFullYear() - 2,
                    now.getFullYear() - 1,
                    now.getFullYear(),
                    now.getFullYear() + 1,
                  ].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {periodMode === "ANNUAL" && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-[#9CA3AF]">
              Ano de Referência
            </label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="border-white/10 bg-[#111111]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  now.getFullYear() - 2,
                  now.getFullYear() - 1,
                  now.getFullYear(),
                  now.getFullYear() + 1,
                ].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {periodMode === "CUSTOM" && (
          <>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#9CA3AF]">
                Data Inicial
              </label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border-white/10 bg-[#111111]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#9CA3AF]">
                Data Final
              </label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border-white/10 bg-[#111111]"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#9CA3AF]">
            Tipo de Movimentação
          </label>
          <Select
            value={typeFilter}
            onValueChange={(v) =>
              setTypeFilter(v as "ALL" | "INCOME" | "EXPENSE")
            }
          >
            <SelectTrigger className="border-white/10 bg-[#111111]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Receitas e Despesas</SelectItem>
              <SelectItem value="INCOME">Apenas Receitas</SelectItem>
              <SelectItem value="EXPENSE">Apenas Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#9CA3AF]">
            Categoria
          </label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="border-white/10 bg-[#111111]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CASO DE USO UC006-A1 / CT14: PERÍODO SEM DADOS */}
      {currentSummary.count === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-12 text-center">
          <InfoIcon className="mx-auto mb-3 h-8 w-8 text-[#9CA3AF]" />
          <p className="text-base font-bold text-white">
            Não existem dados para o período selecionado ({periodLabel})
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Nenhuma receita ou despesa atende aos critérios filtrados neste
            intervalo (UC006-A1).
          </p>
        </div>
      ) : (
        <>
          {/* INDICADORES CONSOLIDADOS E COMPARAÇÃO COM PERÍODO ANTERIOR */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-5">
              <p className="text-xs text-[#9CA3AF]">
                Receitas Realizadas ({periodLabel})
              </p>
              <p className="mt-2 text-2xl font-bold text-[#55B02E]">
                {formatCurrency(currentSummary.realizedIncome)}
              </p>
              {currentSummary.plannedIncome > 0 && (
                <p className="mt-1 text-[11px] text-amber-300">
                  + {formatCurrency(currentSummary.plannedIncome)} previstas
                </p>
              )}
              {incomeDelta !== null && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                  {incomeDelta >= 0 ? (
                    <ArrowUpRightIcon className="h-3.5 w-3.5 text-[#55B02E]" />
                  ) : (
                    <ArrowDownRightIcon className="h-3.5 w-3.5 text-red-400" />
                  )}
                  {incomeDelta >= 0 ? `+${incomeDelta}%` : `${incomeDelta}%`} vs{" "}
                  {comparisonLabel}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-5">
              <p className="text-xs text-[#9CA3AF]">
                Despesas Realizadas ({periodLabel})
              </p>
              <p className="mt-2 text-2xl font-bold text-[#F6352E]">
                {formatCurrency(currentSummary.realizedExpense)}
              </p>
              {currentSummary.plannedExpense > 0 && (
                <p className="mt-1 text-[11px] text-amber-300">
                  + {formatCurrency(currentSummary.plannedExpense)} previstas
                </p>
              )}
              {expenseDelta !== null && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                  {expenseDelta <= 0 ? (
                    <ArrowDownRightIcon className="h-3.5 w-3.5 text-[#55B02E]" />
                  ) : (
                    <ArrowUpRightIcon className="h-3.5 w-3.5 text-red-400" />
                  )}
                  {expenseDelta >= 0 ? `+${expenseDelta}%` : `${expenseDelta}%`}{" "}
                  vs {comparisonLabel}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-5">
              <p className="text-xs text-[#9CA3AF]">
                Saldo Realizado (RN010)
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {formatCurrency(currentSummary.realizedBalance)}
              </p>
              <p className="mt-2 text-[11px] text-[#9CA3AF]">
                Anterior ({comparisonLabel}):{" "}
                {formatCurrency(comparisonSummary.realizedBalance)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-5">
              <p className="text-xs text-[#9CA3AF]">
                Saldo Previsto do Período (RN002)
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-300">
                {formatCurrency(currentSummary.projectedBalance)}
              </p>
              <p className="mt-2 text-[11px] text-[#9CA3AF]">
                Inclui lançamentos futuros do período
              </p>
            </div>
          </div>

          {/* GRÁFICO COMPARATIVO ENTRE PERÍODOS E TABELA POR CATEGORIA */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* GRÁFICO DE COMPARAÇÃO */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-6">
              <div className="mb-4 flex items-center gap-2">
                <CalendarRangeIcon className="h-4 w-4 text-[#55B02E]" />
                <h2 className="text-base font-bold text-white">
                  Comparativo entre Períodos ({comparisonLabel} vs {periodLabel}
                  )
                </h2>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#181818",
                        borderColor: "#333",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="Receitas"
                      fill="#55B02E"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="Despesas"
                      fill="#F6352E"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="Previsto"
                      fill="#F59E0B"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DETALHAMENTO POR CATEGORIA (REALIZADO VS PREVISTO) */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3Icon className="h-4 w-4 text-[#55B02E]" />
                <h2 className="text-base font-bold text-white">
                  Consolidação por Categoria ({periodLabel})
                </h2>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {currentSummary.categoriesBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          item.type === "INCOME"
                            ? "bg-[#55B02E]"
                            : "bg-[#F6352E]"
                        }`}
                      />
                      <span className="font-semibold text-white">
                        {item.categoryName}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-white/10 text-[10px] text-[#9CA3AF]"
                      >
                        {item.type === "INCOME" ? "Receita" : "Despesa"}
                      </Badge>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-white">
                        Realizado: {formatCurrency(item.realized)}
                      </p>
                      {item.planned > 0 && (
                        <p className="text-[11px] text-amber-300">
                          Previsto: {formatCurrency(item.planned)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
