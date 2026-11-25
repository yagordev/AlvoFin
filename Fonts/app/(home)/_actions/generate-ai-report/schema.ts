import { z } from "zod";

export const generateAiReportSchema = z.object({
  referenceMonth: z
    .number()
    .int()
    .min(1, "Mês inválido.")
    .max(12, "Mês inválido."),
  referenceYear: z
    .number()
    .int()
    .min(2000, "Ano inválido.")
    .max(2100, "Ano inválido."),
});

export type GenerateAiReportSchema = z.infer<typeof generateAiReportSchema>;
