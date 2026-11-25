"use client";

import React, { useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  HistoryIcon,
  PencilIcon,
  PlusIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/_components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { MoneyInput } from "@/app/_components/money-input";
import { Badge } from "@/app/_components/ui/badge";
import { formatCurrency } from "@/app/_utils/currency";
import { CategoryDTO } from "@/app/_data/get-categories";
import {
  closeSpendingLimitAction,
  upsertSpendingLimitAction,
} from "@/app/_actions/limits";

export interface ActiveLimitDTO {
  id: string;
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  consumedRealized: number;
  consumedPlanned: number;
  percentageRealized: number;
  effectiveFrom: string;
  alertsTriggered: number[]; // ex: [75, 90]
}

export interface HistoricalLimitDTO {
  id: string;
  categoryName: string;
  limitAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface LimitsClientProps {
  expenseCategories: CategoryDTO[];
  activeLimits: ActiveLimitDTO[];
  historicalLimits: HistoricalLimitDTO[];
  currentMonthLabel: string;
}

export const LimitsClient = ({
  expenseCategories,
  activeLimits,
  historicalLimits,
  currentMonthLabel,
}: LimitsClientProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    expenseCategories[0]?.id || "",
  );
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(
    null,
  );

  const openCreateModal = () => {
    setEditingCategoryName(null);
    setSelectedCategoryId(expenseCategories[0]?.id || "");
    setAmount(0);
    setModalOpen(true);
  };

  const openEditModal = (limit: ActiveLimitDTO) => {
    setEditingCategoryName(limit.categoryName);
    setSelectedCategoryId(limit.categoryId);
    setAmount(limit.limitAmount);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      toast.error("Selecione uma categoria de despesa.");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Informe um valor limite maior que zero.");
      return;
    }

    setLoading(true);
    const res = await upsertSpendingLimitAction({
      categoryId: selectedCategoryId,
      amount,
    });
    setLoading(false);

    if (!res.success) {
      toast.error(res.error || "Erro ao salvar limite.");
      return;
    }

    toast.success(
      editingCategoryName
        ? `Novo limite registrado para "${editingCategoryName}" (vigência anterior preservada no histórico).`
        : "Limite mensal de gastos salvo com sucesso!",
    );

    if (res.triggeredAlert) {
      toast.warning(
        `Alerta de Consumo: A categoria "${res.triggeredAlert.categoryName}" já está em ${res.triggeredAlert.percentage}% do limite definido (patamar ${res.triggeredAlert.threshold}%).`,
      );
    }

    setModalOpen(false);
  };

  const handleCloseLimit = async (limit: ActiveLimitDTO) => {
    setLoading(true);
    const res = await closeSpendingLimitAction({ id: limit.id });
    setLoading(false);

    if (!res.success) {
      toast.error(res.error || "Não foi possível encerrar o limite.");
      return;
    }

    toast.success(
      `Limite da categoria "${limit.categoryName}" encerrado e mantido no histórico de vigências.`,
    );
  };

  return (
    <div className="flex flex-col space-y-6 p-6 lg:px-8">
      {/* CABEÇALHO */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Limites de Gastos ({currentMonthLabel})
          </h1>
          <p className="text-xs text-[#9CA3AF]">
            Defina e acompanhe tetos mensais por categoria de despesa com
            alertas em 75%, 90% e 100% (RN013 a RN015).
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="rounded-full bg-[#55B02E] px-6 font-semibold text-white hover:bg-[#499826]"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Definir limite
        </Button>
      </div>

      {/* LISTA DE LIMITES VIGENTES */}
      {activeLimits.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-10 text-center">
          <p className="text-base font-semibold text-white">
            Nenhum limite mensal ativo
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Clique em &ldquo;Definir limite&rdquo; para acompanhar seus gastos
            por categoria e receber alertas automáticos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeLimits.map((limit) => {
            const pct = limit.percentageRealized;
            const barWidth = Math.min(pct, 100);

            const statusColor =
              pct >= 100
                ? "bg-[#F6352E]"
                : pct >= 90
                  ? "bg-orange-500"
                  : pct >= 75
                    ? "bg-amber-500"
                    : "bg-[#55B02E]";

            return (
              <div
                key={limit.id}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#141414] p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {limit.categoryName}
                      </h3>
                      <p className="text-[11px] text-[#9CA3AF]">
                        Vigente desde{" "}
                        {new Date(limit.effectiveFrom).toLocaleDateString(
                          "pt-BR",
                          { timeZone: "UTC" },
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Alterar valor do limite"
                        onClick={() => openEditModal(limit)}
                        className="h-8 w-8 text-[#9CA3AF] hover:text-white"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Encerrar limite vigente"
                        onClick={() => handleCloseLimit(limit)}
                        className="h-8 w-8 text-[#9CA3AF] hover:text-red-400"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* VALORES E BARRA */}
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-sm text-[#D1D5DB]">
                      {formatCurrency(limit.consumedRealized)}{" "}
                      <span className="text-xs text-[#9CA3AF]">
                        de {formatCurrency(limit.limitAmount)}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-white">{pct}%</span>
                  </div>

                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#262626]">
                    <div
                      className={`h-full rounded-full transition-all ${statusColor}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {limit.consumedPlanned > 0 && (
                    <p className="mt-2 text-[11px] text-[#9CA3AF]">
                      + {formatCurrency(limit.consumedPlanned)} em despesas
                      previstas (futuras) neste mês
                    </p>
                  )}
                </div>

                {/* ALERTAS DE PATAMAR (75%, 90%, 100% - RN015) */}
                <div className="mt-4 border-t border-white/[0.06] pt-3">
                  {pct >= 100 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      <ShieldAlertIcon className="h-4 w-4 shrink-0" />
                      <span>
                        Limite atingido/ultrapassado ({pct}%). Novas despesas
                        continuam permitidas (RN015).
                      </span>
                    </div>
                  ) : pct >= 90 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
                      <AlertTriangleIcon className="h-4 w-4 shrink-0" />
                      <span>
                        Alerta de 90%: você já utilizou {pct}% deste limite!
                      </span>
                    </div>
                  ) : pct >= 75 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                      <AlertTriangleIcon className="h-4 w-4 shrink-0" />
                      <span>
                        Atenção (75%): consumo atingiu {pct}% do limite.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-[#55B02E]">
                      <CheckCircle2Icon className="h-4 w-4 shrink-0" />
                      <span>Dentro do planejado ({100 - pct}% disponível)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HISTÓRICO DE VIGÊNCIAS (CT07 / Seção 2.4 e 4.5 do Modelo de Dados) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-5">
        <div className="mb-4 flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-[#55B02E]" />
          <h2 className="text-base font-bold text-white">
            Histórico de Vigências de Limites
          </h2>
        </div>

        {historicalLimits.length === 0 ? (
          <p className="text-xs text-[#9CA3AF]">
            Nenhum registro de limite cadastrado até o momento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#9CA3AF]">
                  <th className="pb-2 font-medium">Categoria</th>
                  <th className="pb-2 font-medium">Valor Mensal</th>
                  <th className="pb-2 font-medium">Início da Vigência</th>
                  <th className="pb-2 font-medium">Fim da Vigência</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {historicalLimits.map((item) => (
                  <tr key={item.id} className="text-[#D1D5DB]">
                    <td className="py-2.5 font-semibold text-white">
                      {item.categoryName}
                    </td>
                    <td className="py-2.5">
                      {formatCurrency(item.limitAmount)}
                    </td>
                    <td className="py-2.5">
                      {new Date(item.effectiveFrom).toLocaleDateString(
                        "pt-BR",
                        { timeZone: "UTC" },
                      )}
                    </td>
                    <td className="py-2.5">
                      {item.effectiveTo
                        ? new Date(item.effectiveTo).toLocaleDateString(
                            "pt-BR",
                            { timeZone: "UTC" },
                          )
                        : "Em aberto"}
                    </td>
                    <td className="py-2.5">
                      {item.effectiveTo === null ? (
                        <Badge className="bg-[#55B02E]/15 text-[10px] text-[#55B02E]">
                          Vigente
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-white/10 text-[10px] text-[#9CA3AF]"
                        >
                          Encerrado
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CRIAR / ALTERAR LIMITE */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="border-white/10 bg-[#161616] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategoryName
                ? `Alterar Limite — ${editingCategoryName}`
                : "Definir Limite Mensal de Gastos"}
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {editingCategoryName
                ? "Ao alterar o valor, a vigência anterior será encerrada e preservada no histórico e uma nova vigência será iniciada (CT07)."
                : "Selecione uma categoria de despesa e defina o teto mensal desejado."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#D1D5DB]">
                Categoria de Despesa *
              </label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
                disabled={Boolean(editingCategoryName)}
              >
                <SelectTrigger className="border-white/10 bg-[#111111]">
                  <SelectValue placeholder="Selecione uma categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#D1D5DB]">
                Valor Limite Mensal *
              </label>
              <MoneyInput
                placeholder="R$ 0,00"
                value={amount}
                onValueChange={({ floatValue }) => setAmount(floatValue ?? 0)}
                className="border-white/10 bg-[#111111]"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#55B02E] text-white hover:bg-[#499826]"
              >
                Salvar Limite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
