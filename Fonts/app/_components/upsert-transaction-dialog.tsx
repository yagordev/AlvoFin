"use client";

import React, { useEffect } from "react";
import { TransactionType } from "@prisma/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { MoneyInput } from "./money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  TRANSACTION_TYPE_OPTIONS,
  isFutureTransactionDate,
} from "../_constants/transactions";
import { DatePicker } from "./ui/date-picker";
import { upsertTransaction } from "../_actions/upsert-transaction";
import { CategoryDTO } from "../_data/get-categories";

const formSchema = z.object({
  type: z.nativeEnum(TransactionType, {
    required_error: "O tipo é obrigatório.",
  }),
  amount: z
    .number({
      required_error: "O valor é obrigatório.",
      invalid_type_error: "Informe um valor válido.",
    })
    .positive({
      message: "O valor deve ser maior que zero.",
    }),
  categoryId: z
    .string({
      required_error: "A categoria é obrigatória.",
    })
    .uuid("Selecione uma categoria válida."),
  date: z.date({
    required_error: "A data é obrigatória.",
  }),
  description: z.string().trim().max(500).optional(),
  createdByAi: z.boolean().optional(),
});

export type TransactionFormValues = z.infer<typeof formSchema>;

interface UpsertTransactionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  categories: CategoryDTO[];
  defaultValues?: TransactionFormValues;
  transactionId?: string;
  aiReviewBanner?: string;
}

const UpsertTransactionDialog = ({
  isOpen,
  setIsOpen,
  categories,
  defaultValues,
  transactionId,
  aiReviewBanner,
}: UpsertTransactionDialogProps) => {
  const defaultExpenseCategory =
    categories.find((c) => c.type === "EXPENSE" && c.isActive)?.id || "";

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? {
      type: TransactionType.EXPENSE,
      amount: 0,
      categoryId: defaultExpenseCategory,
      date: new Date(),
      description: "",
      createdByAi: false,
    },
  });

  useEffect(() => {
    if (isOpen && defaultValues) {
      form.reset(defaultValues);
    } else if (isOpen && !defaultValues) {
      form.reset({
        type: TransactionType.EXPENSE,
        amount: 0,
        categoryId:
          categories.find((c) => c.type === "EXPENSE" && c.isActive)?.id || "",
        date: new Date(),
        description: "",
        createdByAi: false,
      });
    }
  }, [isOpen, defaultValues, categories, form]);

  const selectedType = form.watch("type");
  const selectedDate = form.watch("date");

  // Filtra apenas categorias compatíveis com o tipo selecionado (RN004 / RN006)
  // Permite manter uma categoria inativa somente se for a categoria já vinculada à movimentação em edição (RN009)
  const compatibleCategories = categories.filter(
    (c) =>
      c.type === selectedType &&
      (c.isActive || c.id === defaultValues?.categoryId),
  );

  // Ao trocar o tipo (Receita <-> Despesa), seleciona automaticamente uma categoria compatível
  const handleTypeChange = (newType: TransactionType) => {
    form.setValue("type", newType);
    const currentCatId = form.getValues("categoryId");
    const currentCatStillValid = categories.some(
      (c) => c.id === currentCatId && c.type === newType && c.isActive,
    );
    if (!currentCatStillValid) {
      const fallback = categories.find(
        (c) => c.type === newType && c.isActive,
      )?.id;
      if (fallback) {
        form.setValue("categoryId", fallback);
      }
    }
  };

  const onSubmit = async (data: TransactionFormValues) => {
    const res = await upsertTransaction({
      ...data,
      id: transactionId,
    });

    if (!res.success) {
      toast.error(res.error || "Erro ao salvar movimentação.");
      return;
    }

    toast.success(
      transactionId
        ? "Movimentação atualizada com sucesso!"
        : "Movimentação registrada com sucesso!",
    );

    if (res.triggeredAlert) {
      const { categoryName, threshold, percentage } = res.triggeredAlert;
      if (threshold >= 100) {
        toast.warning(
          `Alerta de Limite: Você atingiu ${percentage}% do limite mensal da categoria "${categoryName}" (RN015).`,
          { duration: 6000 },
        );
      } else {
        toast.info(
          `Alerta de Limite: O consumo da categoria "${categoryName}" atingiu ${percentage}% (patamar de ${threshold}%).`,
          { duration: 5000 },
        );
      }
    }

    setIsOpen(false);
    form.reset();
  };

  const isUpdate = Boolean(transactionId);
  const isFuture = selectedDate ? isFutureTransactionDate(selectedDate) : false;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          form.reset();
        }
      }}
    >
      <DialogContent className="border-white/10 bg-[#161616] text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {aiReviewBanner
              ? "Revisar Lançamento Interpretado por IA"
              : isUpdate
                ? "Editar movimentação"
                : "Nova movimentação"}
          </DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            {aiReviewBanner ||
              "Informe o tipo, valor, data, categoria e uma descrição opcional."}
          </DialogDescription>
        </DialogHeader>

        {aiReviewBanner && (
          <div className="rounded-xl border border-[#55B02E]/40 bg-[#55B02E]/10 px-3.5 py-2.5 text-xs text-[#D1D5DB]">
            Confira os campos interpretados pela IA abaixo. Você pode editar
            qualquer informação antes de confirmar ou cancelar (RN024).
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select
                      onValueChange={(val) =>
                        handleTypeChange(val as TransactionType)
                      }
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-white/10 bg-[#111111]">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRANSACTION_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor *</FormLabel>
                    <FormControl>
                      <MoneyInput
                        placeholder="R$ 0,00"
                        value={field.value}
                        onValueChange={({ floatValue }) =>
                          field.onChange(floatValue ?? 0)
                        }
                        onBlur={field.onBlur}
                        disabled={field.disabled}
                        className="border-white/10 bg-[#111111]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-white/10 bg-[#111111]">
                          <SelectValue placeholder="Selecione a categoria..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {compatibleCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                            {!cat.isActive ? " (Inativa)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <DatePicker value={field.value} onChange={field.onChange} />
                    {isFuture && (
                      <p className="text-[11px] font-medium text-amber-400">
                        Data futura: será classificada como Prevista (RN002).
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex.: Supermercado, Aluguel, Pagamento de cliente..."
                      {...field}
                      value={field.value ?? ""}
                      className="border-white/10 bg-[#111111]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-[#55B02E] text-white hover:bg-[#499826]"
              >
                {aiReviewBanner
                  ? "Confirmar Lançamento"
                  : isUpdate
                    ? "Salvar Alterações"
                    : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UpsertTransactionDialog;
