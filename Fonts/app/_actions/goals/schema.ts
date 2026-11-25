import { GoalTransactionType } from "@prisma/client";
import { z } from "zod";

export const upsertFinancialGoalSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "O nome do objetivo deve ter pelo menos 2 caracteres.")
    .max(255, "O nome do objetivo deve ter no máximo 255 caracteres."),
  targetAmount: z
    .number({ invalid_type_error: "Informe um valor desejado válido." })
    .positive("O valor desejado (meta) deve ser maior que zero."),
  deadline: z.coerce.date().optional().nullable(),
});

export const createGoalTransactionSchema = z.object({
  goalId: z.string().uuid("Objetivo inválido."),
  type: z.nativeEnum(GoalTransactionType, {
    errorMap: () => ({
      message: "Selecione o tipo da operação (Aporte ou Retirada).",
    }),
  }),
  amount: z
    .number({ invalid_type_error: "Informe um valor válido." })
    .positive("O valor deve ser estritamente positivo."),
  date: z.coerce.date({
    required_error: "A data da movimentação é obrigatória.",
  }),
  description: z.string().trim().max(500).optional().nullable(),
});

export const idSchema = z.object({
  id: z.string().uuid("Identificador inválido."),
});

export type UpsertFinancialGoalInput = z.infer<
  typeof upsertFinancialGoalSchema
>;
export type CreateGoalTransactionInput = z.infer<
  typeof createGoalTransactionSchema
>;
