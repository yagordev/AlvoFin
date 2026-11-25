import { TransactionType } from "@prisma/client";

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.INCOME]: "Receita",
  [TransactionType.EXPENSE]: "Despesa",
};

export const TRANSACTION_TYPE_OPTIONS = [
  {
    value: TransactionType.EXPENSE,
    label: "Despesa",
  },
  {
    value: TransactionType.INCOME,
    label: "Receita",
  },
];

export const MONTHS_OPTIONS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

/**
 * Determina se uma data é futura em relação ao dia atual (RN001 / RN002).
 * Datas futuras são classificadas como "Prevista" e datas até hoje como "Realizada".
 */
export function isFutureTransactionDate(date: Date | string): boolean {
  const txDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const txDay = Date.UTC(
    txDate.getUTCFullYear(),
    txDate.getUTCMonth(),
    txDate.getUTCDate(),
  );
  const todayDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return txDay > todayDay;
}
