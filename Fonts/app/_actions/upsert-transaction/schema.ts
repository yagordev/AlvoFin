import { TransactionType } from "@prisma/client";
import { z } from "zod";

export const upsertTransactionSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: "Selecione o tipo da movimentação." }),
  }),
  amount: z
    .number({ invalid_type_error: "Informe um valor numérico válido." })
    .positive("O valor da movimentação deve ser estritamente positivo."),
  categoryId: z
    .string({ required_error: "Selecione uma categoria." })
    .uuid("Selecione uma categoria válida."),
  date: z.coerce.date({
    required_error: "A data é obrigatória.",
    invalid_type_error: "Informe uma data válida.",
  }),
  description: z.string().trim().max(500).optional().nullable(),
  createdByAi: z.boolean().optional().default(false),
});

export type UpsertTransactionInput = z.input<typeof upsertTransactionSchema>;
