"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  HistoryIcon,
  LightbulbIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/_components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { MONTHS_OPTIONS } from "@/app/_constants/transactions";
import { formatCurrency } from "@/app/_utils/currency";
import {
  generateAiReport,
  getAiAnalysesHistory,
  SavedAiAnalysisDTO,
} from "../_actions/generate-ai-report";

interface AiReportButtonProps {
  month: number;
  year: number;
}

const AiReportButton = ({ month, year }: AiReportButtonProps) => {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(month));
  const [selectedYear, setSelectedYear] = useState(String(year));
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SavedAiAnalysisDTO[]>([]);
  const [activeAnalysis, setActiveAnalysis] =
    useState<SavedAiAnalysisDTO | null>(null);

  useEffect(() => {
    setSelectedMonth(String(month));
    setSelectedYear(String(year));
  }, [month, year]);

  useEffect(() => {
    if (!open) return;
    getAiAnalysesHistory()
      .then((items) => {
        setHistory(items);
        if (!activeAnalysis && items.length > 0) {
          setActiveAnalysis(items[0]);
        }
      })
      .catch(() => {});
  }, [open, activeAnalysis]);

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateAiReport({
      referenceMonth: Number(selectedMonth),
      referenceYear: Number(selectedYear),
    });
    setLoading(false);

    if (!res.success || !res.analysis) {
      toast.error(
        res.error || "Não foi possível gerar a análise para o mês selecionado.",
      );
      return;
    }

    setActiveAnalysis(res.analysis);
    setHistory((prev) => [res.analysis!, ...prev]);
    toast.success("Análise financeira gerada e salva no histórico!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-[#141414] px-5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
        >
          Análise IA
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#161616] text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-[#55B02E]" />
            Análise Financeira com Inteligência Artificial
          </DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            Selecione o mês e solicite uma análise inteligente das suas receitas
            e despesas (UC010 / RN025 a RN029).
          </DialogDescription>
        </DialogHeader>

        {/* BARRA DE SELEÇÃO DE PERÍODO E SOLICITAÇÃO */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-[#111111] p-4">
          <div className="min-w-[150px] flex-1">
            <label className="mb-1 block text-xs font-medium text-[#9CA3AF]">
              Mês de referência (RN025)
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="border-white/10 bg-[#181818]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-28">
            <label className="mb-1 block text-xs font-medium text-[#9CA3AF]">
              Ano
            </label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="border-white/10 bg-[#181818]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[year - 1, year, year + 1].map((yr) => (
                  <SelectItem key={yr} value={String(yr)}>
                    {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="bg-[#55B02E] font-semibold text-white hover:bg-[#499826]"
          >
            {loading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <SparklesIcon className="mr-2 h-4 w-4" />
                Solicitar Análise
              </>
            )}
          </Button>
        </div>

        {/* SELETOR DE HISTÓRICO DE ANÁLISES (RN029 / CT11) */}
        {history.length > 0 && (
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#9CA3AF]">
              <HistoryIcon className="h-3.5 w-3.5 text-[#55B02E]" />
              Histórico de Análises Salvas ({history.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {history.map((item) => {
                const isSelected = activeAnalysis?.id === item.id;
                const monthName =
                  MONTHS_OPTIONS.find(
                    (m) => m.value === String(item.referenceMonth),
                  )?.label || item.referenceMonth;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveAnalysis(item)}
                    className={`rounded-lg border px-3 py-1.5 text-left text-xs transition ${
                      isSelected
                        ? "border-[#55B02E] bg-[#55B02E]/15 text-white"
                        : "border-white/10 bg-[#111111] text-[#9CA3AF] hover:text-white"
                    }`}
                  >
                    <span className="font-semibold">
                      {monthName}/{item.referenceYear}
                    </span>
                    <span className="ml-1.5 text-[10px] opacity-75">
                      (
                      {new Date(item.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      )
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* EXIBIÇÃO ESTRUTURADA DO RESULTADO (JSONB analysis_data) */}
        {activeAnalysis ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-[#111111] p-4">
            <div>
              <h4 className="text-sm font-bold text-white">
                Resumo do Período (
                {String(activeAnalysis.referenceMonth).padStart(2, "0")}/
                {activeAnalysis.referenceYear})
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">
                {activeAnalysis.analysisData.summary}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#9CA3AF]">
                {activeAnalysis.analysisData.period_comparison}
              </p>
            </div>

            {/* CATEGORIAS COM MAIOR VOLUME DE GASTOS */}
            {activeAnalysis.analysisData.top_categories.length > 0 && (
              <div>
                <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  Categorias com Maior Volume de Gastos
                </h5>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activeAnalysis.analysisData.top_categories.map(
                    (cat, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-white/10 bg-[#181818] p-3 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-white">
                          <span>{cat.category}</span>
                          <span>
                            {formatCurrency(cat.amount)} ({cat.share_percentage}
                            %)
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#9CA3AF]">
                          {cat.observation}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* COMPORTAMENTOS POSITIVOS (RF017) E PONTOS DE ATENÇÃO (RF016) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
                <h5 className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2Icon className="h-4 w-4" />
                  Comportamentos Positivos
                </h5>
                <ul className="mt-2 space-y-1.5 text-xs text-[#D1D5DB]">
                  {activeAnalysis.analysisData.positive_points.map((pt, i) => (
                    <li key={i}>• {pt}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
                <h5 className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <AlertTriangleIcon className="h-4 w-4" />
                  Pontos de Atenção e Variações
                </h5>
                <ul className="mt-2 space-y-1.5 text-xs text-[#D1D5DB]">
                  {activeAnalysis.analysisData.warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* SUGESTÕES COM VALORES ESTIMADOS (RN028) */}
            <div>
              <h5 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#55B02E]">
                <LightbulbIcon className="h-4 w-4" />
                Oportunidades de Melhoria e Sugestões
              </h5>
              <div className="space-y-2">
                {activeAnalysis.analysisData.suggestions.map((sug, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/10 bg-[#181818] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>{sug.title}</span>
                      {typeof sug.estimated_savings === "number" &&
                        sug.estimated_savings > 0 && (
                          <span className="text-[#55B02E]">
                            Economia estimada:{" "}
                            {formatCurrency(sug.estimated_savings)}/mês
                          </span>
                        )}
                    </div>
                    <p className="mt-1 text-[#9CA3AF]">{sug.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="border-t border-white/10 pt-2 text-[11px] italic text-[#6B7280]">
              {activeAnalysis.analysisData.disclaimer}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#111111] p-8 text-center text-xs text-[#9CA3AF]">
            Clique em &ldquo;Solicitar Análise&rdquo; para consolidar as
            receitas e despesas do mês selecionado e gerar insights.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AiReportButton;
