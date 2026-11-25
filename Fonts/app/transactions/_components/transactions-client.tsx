"use client";

import React, { useMemo, useState } from "react";
import { DataTable } from "@/app/_components/ui/data-table";
import AddTransactionButton from "@/app/_components/add-transaction-button";
import { AiTransactionButton } from "@/app/_components/ai-transaction-button";
import { ManageCategoriesDialog } from "@/app/_components/manage-categories-dialog";
import { CategoryDTO } from "@/app/_data/get-categories";
import { getTransactionColumns } from "../_columns";
import { SerializedTransaction } from "./edit-transaction-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { MONTHS_OPTIONS } from "@/app/_constants/transactions";
import { formatCurrency } from "@/app/_utils/currency";

interface TransactionsClientProps {
  transactions: SerializedTransaction[];
  categories: CategoryDTO[];
}

export const TransactionsClient = ({
  transactions,
  categories,
}: TransactionsClientProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear()),
  );
  const [selectedType, setSelectedType] = useState<
    "ALL" | "INCOME" | "EXPENSE"
  >("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<
    "ALL" | "REALIZED" | "PLANNED"
  >("ALL");

  const availableYears = useMemo(() => {
    const years = new Set<string>([String(new Date().getFullYear())]);
    transactions.forEach((t) => {
      const y = new Date(t.date).getUTCFullYear();
      if (Number.isFinite(y)) years.add(String(y));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      const txMonth = String(d.getUTCMonth() + 1);
      const txYear = String(d.getUTCFullYear());

      if (selectedYear !== "ALL" && txYear !== selectedYear) return false;
      if (selectedMonth !== "ALL" && txMonth !== selectedMonth) return false;
      if (selectedType !== "ALL" && t.type !== selectedType) return false;
      if (
        selectedCategoryId !== "ALL" &&
        t.categoryId !== selectedCategoryId
      )
        return false;
      if (selectedStatus === "REALIZED" && t.isFuture) return false;
      if (selectedStatus === "PLANNED" && !t.isFuture) return false;

      return true;
    });
  }, [
    transactions,
    selectedMonth,
    selectedYear,
    selectedType,
    selectedCategoryId,
    selectedStatus,
  ]);

  const totals = useMemo(() => {
    let realizedIncome = 0;
    let realizedExpense = 0;
    let plannedIncome = 0;
    let plannedExpense = 0;

    for (const tx of filteredTransactions) {
      if (tx.isFuture) {
        if (tx.type === "INCOME") plannedIncome += tx.amount;
        else plannedExpense += tx.amount;
      } else {
        if (tx.type === "INCOME") realizedIncome += tx.amount;
        else realizedExpense += tx.amount;
      }
    }

    return {
      realizedIncome,
      realizedExpense,
      realizedBalance: realizedIncome - realizedExpense,
      plannedNet: plannedIncome - plannedExpense,
    };
  }, [filteredTransactions]);

  const columns = useMemo(
    () => getTransactionColumns(categories),
    [categories],
  );

  return (
    <div className="flex flex-col space-y-6 p-6 lg:px-8">
      {/* CABEÇALHO E BOTÕES DE AÇÃO */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Movimentações</h1>
          <p className="text-xs text-[#9CA3AF]">
            Gerencie receitas e despesas, filtre por período e organize suas
            categorias.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ManageCategoriesDialog categories={categories} />
          <AiTransactionButton categories={categories} />
          <AddTransactionButton categories={categories} />
        </div>
      </div>

      {/* BARRA DE FILTROS (RF003) */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/[0.08] bg-[#141414] p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#9CA3AF]">
            Ano
          </label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="border-white/10 bg-[#111111]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os anos</SelectItem>
              {availableYears.map((yr) => (
                <SelectItem key={yr} value={yr}>
                  {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#9CA3AF]">
            Mês
          </label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="border-white/10 bg-[#111111]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os meses</SelectItem>
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
            Tipo
          </label>
          <Select
            value={selectedType}
            onValueChange={(val) =>
              setSelectedType(val as "ALL" | "INCOME" | "EXPENSE")
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
          <Select
            value={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
          >
            <SelectTrigger className="border-white/10 bg-[#111111]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name} ({cat.type === "INCOME" ? "Receita" : "Despesa"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#9CA3AF]">
            Situação (RN002)
          </label>
          <Select
            value={selectedStatus}
            onValueChange={(val) =>
              setSelectedStatus(val as "ALL" | "REALIZED" | "PLANNED")
            }
          >
            <SelectTrigger className="border-white/10 bg-[#111111]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Realizadas e Previstas</SelectItem>
              <SelectItem value="REALIZED">Somente Realizadas</SelectItem>
              <SelectItem value="PLANNED">Somente Previstas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* RESUMO RÁPIDO DO FILTRO */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-4">
          <p className="text-xs text-[#9CA3AF]">Receitas Realizadas</p>
          <p className="mt-1 text-lg font-bold text-[#55B02E]">
            {formatCurrency(totals.realizedIncome)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-4">
          <p className="text-xs text-[#9CA3AF]">Despesas Realizadas</p>
          <p className="mt-1 text-lg font-bold text-[#F6352E]">
            {formatCurrency(totals.realizedExpense)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-4">
          <p className="text-xs text-[#9CA3AF]">Saldo Realizado (Filtro)</p>
          <p className="mt-1 text-lg font-bold text-white">
            {formatCurrency(totals.realizedBalance)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-4">
          <p className="text-xs text-[#9CA3AF]">Lançamentos Previstos (Futuros)</p>
          <p className="mt-1 text-lg font-bold text-amber-300">
            {formatCurrency(totals.plannedNet)}
          </p>
        </div>
      </div>

      {/* TABELA DE MOVIMENTAÇÕES */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-2">
        <DataTable columns={columns} data={filteredTransactions} />
      </div>
    </div>
  );
};
