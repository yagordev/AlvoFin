import { TransactionType } from "@prisma/client";
import { z } from "zod";

export const upsertCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "O nome da categoria deve ter pelo menos 2 caracteres.")
    .max(255, "O nome da categoria deve ter no máximo 255 caracteres."),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({
      message: "Selecione o tipo da categoria (Receita ou Despesa).",
    }),
  }),
});

export const categoryIdSchema = z.object({
  id: z.string().uuid("Identificador de categoria inválido."),
});

export type UpsertCategoryInput = z.infer<typeof upsertCategorySchema>;
