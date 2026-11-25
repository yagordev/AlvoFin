"use client";

import { ColumnDef } from "@tanstack/react-table";
import { SparklesIcon, ClockIcon, CheckCircle2Icon } from "lucide-react";
import TransactionTypeBadge from "../_components/type-badge";
import EditTransactionButton, {
  SerializedTransaction,
} from "../_components/edit-transaction-button";
import DeleteTransactionButton from "../_components/delete-transaction-button";
import { CategoryDTO } from "@/app/_data/get-categories";
import { Badge } from "@/app/_components/ui/badge";

export const getTransactionColumns = (
  categories: CategoryDTO[],
): ColumnDef<SerializedTransaction>[] => [
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row: { original: transaction } }) => (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white">
          {transaction.description || transaction.categoryName}
        </span>
        {transaction.createdByAi && (
          <Badge className="bg-[#55B02E]/15 px-1.5 py-0 text-[10px] text-[#55B02E] hover:bg-[#55B02E]/20">
            <SparklesIcon className="mr-1 h-2.5 w-2.5" />
            IA
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row: { original: transaction } }) => (
      <TransactionTypeBadge type={transaction.type} />
    ),
  },
  {
    accessorKey: "categoryName",
    header: "Categoria",
    cell: ({ row: { original: transaction } }) => (
      <span className="text-sm text-[#D1D5DB]">{transaction.categoryName}</span>
    ),
  },
  {
    accessorKey: "isFuture",
    header: "Situação",
    cell: ({ row: { original: transaction } }) =>
      transaction.isFuture ? (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-xs text-amber-300"
        >
          <ClockIcon className="mr-1.5 h-3 w-3" />
          Previsto
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300"
        >
          <CheckCircle2Icon className="mr-1.5 h-3 w-3" />
          Realizado
        </Badge>
      ),
  },
  {
    accessorKey: "date",
    header: "Data",
    cell: ({ row: { original: transaction } }) =>
      new Date(transaction.date).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
  },
  {
    accessorKey: "amount",
    header: "Valor",
    cell: ({ row: { original: transaction } }) => {
      const formatted = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(transaction.amount));
      return (
        <span
          className={`font-semibold ${
            transaction.type === "INCOME" ? "text-[#55B02E]" : "text-[#F6352E]"
          }`}
        >
          {transaction.type === "INCOME" ? `+ ${formatted}` : `- ${formatted}`}
        </span>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "Ações",
    cell: ({ row: { original: transaction } }) => (
      <div className="flex items-center gap-1">
        <EditTransactionButton
          transaction={transaction}
          categories={categories}
        />
        <DeleteTransactionButton transactionId={transaction.id} />
      </div>
    ),
  },
];
