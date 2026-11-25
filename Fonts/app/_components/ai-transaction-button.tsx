"use client";

import React, { useState } from "react";
import { SparklesIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import UpsertTransactionDialog, {
  TransactionFormValues,
} from "./upsert-transaction-dialog";
import { CategoryDTO } from "../_data/get-categories";
import { parseAiTransactionAction } from "../_actions/parse-ai-transaction";

interface AiTransactionButtonProps {
  categories: CategoryDTO[];
}

export const AiTransactionButton = ({
  categories,
}: AiTransactionButtonProps) => {
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [loading, setLoading] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDefaults, setReviewDefaults] = useState<
    TransactionFormValues | undefined
  >(undefined);
  const [originalPrompt, setOriginalPrompt] = useState("");

  const handleInterpret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) {
      toast.error("Descreva a movimentação que deseja registrar.");
      return;
    }

    setLoading(true);
    const res = await parseAiTransactionAction({ prompt: promptText });
    setLoading(false);

    if (!res.success || !res.suggestion) {
      // UC009-A4 / RNF005: Em caso de falha, informa o usuário e oferece lançamento manual
      toast.error(
        res.error ||
          "Não foi possível interpretar o lançamento com IA. Utilize o lançamento manual.",
      );
      return;
    }

    const { type, amount, date, description, categoryId } = res.suggestion;
    const [year, month, day] = date.split("-").map(Number);
    const parsedDate = new Date(year, month - 1, day, 12, 0, 0);

    setOriginalPrompt(promptText);
    setReviewDefaults({
      type,
      amount,
      categoryId,
      date: parsedDate,
      description,
      createdByAi: true,
    });

    setPromptOpen(false);
    setPromptText("");
    setReviewOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setPromptOpen(true)}
        className="rounded-full border-white/15 bg-[#141414] font-semibold text-white hover:bg-white/10"
      >
        <SparklesIcon className="mr-2 h-4 w-4 text-[#55B02E]" />
        Lançamento IA
      </Button>

      {/* ETAPA 1: DESCRIÇÃO EM LINGUAGEM NATURAL (RF013 / UC009) */}
      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="border-white/10 bg-[#161616] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-[#55B02E]" />
              Lançamento Inteligente com IA
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Descreva sua receita ou despesa em linguagem natural. A IA irá
              interpretar os dados e apresentará para sua revisão e confirmação
              antes de salvar (RN024).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInterpret} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#D1D5DB]">
                Sua descrição
              </label>
              <textarea
                rows={3}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder='Ex.: "Gastei R$ 80 no supermercado hoje" ou "Recebi R$ 1.250,00 de freelance dia 08/09"'
                className="w-full rounded-xl border border-white/10 bg-[#111111] p-3.5 text-sm text-white placeholder-[#6B7280] outline-none focus:border-[#55B02E]"
              />
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-3 text-xs text-[#9CA3AF]">
              <p className="font-semibold text-[#D1D5DB]">Exemplos rápidos:</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[
                  "Gastei R$ 80 no supermercado hoje",
                  "Recebi R$ 3900 de salário",
                  "Paguei R$ 129,90 de academia",
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setPromptText(sample)}
                    className="rounded-full border border-white/10 bg-[#181818] px-2.5 py-1 text-[11px] text-[#D1D5DB] transition hover:border-[#55B02E] hover:text-white"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPromptOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#55B02E] text-white hover:bg-[#499826]"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Interpretando...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="mr-2 h-4 w-4" />
                    Interpretar Lançamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ETAPA 2: REVISÃO, EDIÇÃO, CANCELAMENTO OU CONFIRMAÇÃO OBRIGATÓRIA (RF014 / RN024 / CT10) */}
      <UpsertTransactionDialog
        isOpen={reviewOpen}
        setIsOpen={setReviewOpen}
        categories={categories}
        defaultValues={reviewDefaults}
        aiReviewBanner={`Sugestão interpretada a partir de: "${originalPrompt}"`}
      />
    </>
  );
};
