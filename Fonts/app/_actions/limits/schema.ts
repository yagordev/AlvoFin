import { z } from "zod";

export const upsertSpendingLimitSchema = z.object({
  categoryId: z
    .string({ required_error: "Selecione uma categoria de despesa." })
    .uuid("Categoria inválida."),
  amount: z
    .number({ invalid_type_error: "Informe um valor numérico válido." })
    .positive("O valor do limite deve ser estritamente maior que zero."),
});

export const closeSpendingLimitSchema = z.object({
  id: z.string().uuid("Identificador de limite inválido."),
});

export type UpsertSpendingLimitInput = z.infer<
  typeof upsertSpendingLimitSchema
>;
