"use client";

import React, { useState } from "react";
import { GoalTransactionType } from "@prisma/client";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  PartyPopperIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
  Trash2Icon,
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
import { Input } from "@/app/_components/ui/input";
import { MoneyInput } from "@/app/_components/money-input";
import { DatePicker } from "@/app/_components/ui/date-picker";
import { Badge } from "@/app/_components/ui/badge";
import { formatCurrency } from "@/app/_utils/currency";
import {
  addGoalTransactionAction,
  deleteFinancialGoalAction,
  deleteGoalTransactionAction,
  upsertFinancialGoalAction,
} from "@/app/_actions/goals";

export interface GoalMovementDTO {
  id: string;
  type: GoalTransactionType;
  amount: number;
  date: string;
  description: string | null;
}

export interface FinancialGoalDTO {
  id: string;
  name: string;
  targetAmount: number;
  currentBalance: number;
  percentage: number;
  deadline: string | null;
  movements: GoalMovementDTO[];
}

interface GoalsClientProps {
  goals: FinancialGoalDTO[];
}

export const GoalsClient = ({ goals }: GoalsClientProps) => {
  // Estado Modal Criar/Editar Meta
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState<number>(0);
  const [goalDeadline, setGoalDeadline] = useState<Date | undefined>(undefined);
  const [savingGoal, setSavingGoal] = useState(false);

  // Estado Modal Aporte / Retirada
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoalDTO | null>(
    null,
  );
  const [txType, setTxType] = useState<GoalTransactionType>(
    GoalTransactionType.CONTRIBUTION,
  );
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDate, setTxDate] = useState<Date>(new Date());
  const [txDescription, setTxDescription] = useState("");
  const [savingTx, setSavingTx] = useState(false);

  // Estado Modal de Meta Atingida (RN019 / RN032 / CT09)
  const [celebrationGoal, setCelebrationGoal] = useState<{
    goalId: string;
    goalName: string;
    currentBalance: number;
    targetAmount: number;
    percentage: number;
  } | null>(null);
  const [newTargetAmount, setNewTargetAmount] = useState<number>(0);

  const openNewGoal = () => {
    setEditingGoalId(null);
    setGoalName("");
    setGoalTarget(0);
    setGoalDeadline(undefined);
    setGoalModalOpen(true);
  };

  const openEditGoal = (goal: FinancialGoalDTO) => {
    setEditingGoalId(goal.id);
    setGoalName(goal.name);
    setGoalTarget(goal.targetAmount);
    setGoalDeadline(goal.deadline ? new Date(goal.deadline) : undefined);
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGoal(true);
    const res = await upsertFinancialGoalAction({
      id: editingGoalId ?? undefined,
      name: goalName,
      targetAmount: goalTarget,
      deadline: goalDeadline ?? null,
    });
    setSavingGoal(false);

    if (!res.success) {
      toast.error(res.error || "Erro ao salvar objetivo.");
      return;
    }

    toast.success(
      editingGoalId
        ? "Objetivo financeiro atualizado!"
        : "Objetivo financeiro criado com sucesso!",
    );
    setGoalModalOpen(false);
  };

  const handleDeleteGoal = async (goal: FinancialGoalDTO) => {
    const res = await deleteFinancialGoalAction({ id: goal.id });
    if (!res.success) {
      toast.error(res.error || "Erro ao excluir objetivo.");
      return;
    }
    toast.success(`Objetivo "${goal.name}" excluído.`);
  };

  const openMovementModal = (
    goal: FinancialGoalDTO,
    type: GoalTransactionType,
  ) => {
    setSelectedGoal(goal);
    setTxType(type);
    setTxAmount(0);
    setTxDate(new Date());
    setTxDescription("");
    setTxModalOpen(true);
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;

    setSavingTx(true);
    const res = await addGoalTransactionAction({
      goalId: selectedGoal.id,
      type: txType,
      amount: txAmount,
      date: txDate,
      description: txDescription,
    });
    setSavingTx(false);

    if (!res.success) {
      toast.error(res.error || "Não foi possível registrar a operação.");
      return;
    }

    setTxModalOpen(false);
    toast.success(
      txType === "CONTRIBUTION"
        ? "Contribuição adicionada à meta!"
        : "Retirada registrada na meta!",
    );

    // RN019 / RN032: Apresenta mensagem em tela informando que a meta foi atingida e oferece aumentar o valor-alvo
    if (res.goalReached) {
      setCelebrationGoal(res.goalReached);
      setNewTargetAmount(
        Math.round(res.goalReached.currentBalance * 1.25 * 100) / 100,
      );
    }
  };

  const handleIncreaseTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!celebrationGoal) return;

    if (newTargetAmount <= celebrationGoal.targetAmount) {
      toast.error("Informe um novo valor-alvo superior à meta atual.");
      return;
    }

    setSavingGoal(true);
    const goalObj = goals.find((g) => g.id === celebrationGoal.goalId);
    const res = await upsertFinancialGoalAction({
      id: celebrationGoal.goalId,
      name: celebrationGoal.goalName,
      targetAmount: newTargetAmount,
      deadline: goalObj?.deadline ? new Date(goalObj.deadline) : null,
    });
    setSavingGoal(false);

    if (!res.success) {
      toast.error(res.error || "Não foi possível atualizar o valor-alvo.");
      return;
    }

    toast.success("Novo valor-alvo definido para o seu objetivo!");
    setCelebrationGoal(null);
  };

  const handleDeleteMovement = async (movementId: string) => {
    const res = await deleteGoalTransactionAction({ id: movementId });
    if (!res.success) {
      toast.error(res.error || "Erro ao remover lançamento da meta.");
      return;
    }
    toast.success("Lançamento removido da meta.");
  };

  return (
    <div className="flex flex-col space-y-6 p-6 lg:px-8">
      {/* CABEÇALHO */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Objetivos Financeiros
          </h1>
          <p className="text-xs text-[#9CA3AF]">
            Crie e acompanhe metas financeiras independentes do saldo principal
            de receitas e despesas (RN016 a RN019).
          </p>
        </div>

        <Button
          onClick={openNewGoal}
          className="rounded-full bg-[#55B02E] px-6 font-semibold text-white hover:bg-[#499826]"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Novo objetivo
        </Button>
      </div>

      {/* GRID DE OBJETIVOS */}
      {goals.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-10 text-center">
          <TargetIcon className="mx-auto mb-3 h-8 w-8 text-[#55B02E]" />
          <p className="text-base font-semibold text-white">
            Nenhum objetivo financeiro cadastrado
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Crie uma meta (ex.: Reserva de emergência, Viagem, Notebook) e
            registre seus aportes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {goals.map((goal) => {
            const barWidth = Math.min(goal.percentage, 100);
            const isReached = goal.currentBalance >= goal.targetAmount;

            return (
              <div
                key={goal.id}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#141414] p-6"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">
                          {goal.name}
                        </h3>
                        {isReached && (
                          <Badge className="bg-[#55B02E]/20 text-xs text-[#55B02E]">
                            Meta atingida ({goal.percentage}%)
                          </Badge>
                        )}
                      </div>
                      {goal.deadline ? (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          Prazo:{" "}
                          {new Date(goal.deadline).toLocaleDateString("pt-BR", {
                            timeZone: "UTC",
                          })}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[#6B7280]">
                          Sem prazo definido (RN018)
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Editar objetivo"
                        onClick={() => openEditGoal(goal)}
                        className="h-8 w-8 text-[#9CA3AF] hover:text-white"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Excluir objetivo"
                        onClick={() => handleDeleteGoal(goal)}
                        className="h-8 w-8 text-[#9CA3AF] hover:text-red-400"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* SALDO ACUMULADO E PROGRESSO */}
                  <div className="mt-5 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-white">
                        {formatCurrency(goal.currentBalance)}
                      </span>
                      <span className="ml-2 text-xs text-[#9CA3AF]">
                        de {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[#55B02E]">
                      {goal.percentage}%
                    </span>
                  </div>

                  <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-[#262626]">
                    <div
                      className="h-full rounded-full bg-[#55B02E] transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {/* BOTÕES APORTE / RETIRADA */}
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        openMovementModal(
                          goal,
                          GoalTransactionType.CONTRIBUTION,
                        )
                      }
                      className="rounded-full bg-[#55B02E] text-xs font-semibold text-white hover:bg-[#499826]"
                    >
                      <ArrowUpRightIcon className="mr-1.5 h-3.5 w-3.5" />
                      Adicionar contribuição
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openMovementModal(goal, GoalTransactionType.WITHDRAWAL)
                      }
                      disabled={goal.currentBalance <= 0}
                      className="rounded-full border-white/15 bg-[#111111] text-xs text-[#D1D5DB] hover:bg-white/10"
                    >
                      <ArrowDownLeftIcon className="mr-1.5 h-3.5 w-3.5 text-red-400" />
                      Retirar valor
                    </Button>
                  </div>
                </div>

                {/* HISTÓRICO DE APORTES E RETIRADAS DA META */}
                <div className="mt-5 border-t border-white/[0.06] pt-4">
                  <p className="mb-2 text-xs font-semibold text-[#9CA3AF]">
                    Movimentações da meta ({goal.movements.length})
                  </p>
                  {goal.movements.length === 0 ? (
                    <p className="text-xs text-[#6B7280]">
                      Nenhuma contribuição ou retirada registrada ainda.
                    </p>
                  ) : (
                    <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                      {goal.movements.map((mov) => (
                        <div
                          key={mov.id}
                          className="flex items-center justify-between rounded-lg bg-[#111111] px-3 py-2 text-xs"
                        >
                          <div>
                            <span className="font-medium text-white">
                              {mov.description ||
                                (mov.type === "CONTRIBUTION"
                                  ? "Contribuição"
                                  : "Retirada")}
                            </span>
                            <span className="ml-2 text-[11px] text-[#6B7280]">
                              {new Date(mov.date).toLocaleDateString("pt-BR", {
                                timeZone: "UTC",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${
                                mov.type === "CONTRIBUTION"
                                  ? "text-[#55B02E]"
                                  : "text-[#F6352E]"
                              }`}
                            >
                              {mov.type === "CONTRIBUTION" ? "+" : "-"}{" "}
                              {formatCurrency(mov.amount)}
                            </span>
                            <button
                              type="button"
                              title="Excluir lançamento"
                              onClick={() => handleDeleteMovement(mov.id)}
                              className="text-[#6B7280] hover:text-red-400"
                            >
                              <Trash2Icon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CRIAR / EDITAR OBJETIVO */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="border-white/10 bg-[#161616] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGoalId
                ? "Editar Objetivo Financeiro"
                : "Novo Objetivo Financeiro"}
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Defina o nome, o valor desejado e, opcionalmente, um prazo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGoal} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#D1D5DB]">
                Nome do Objetivo *
              </label>
              <Input
                placeholder="Ex.: Reserva de emergência"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                required
                className="border-white/10 bg-[#111111]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#D1D5DB]">
                Valor Desejado (Meta) *
              </label>
              <MoneyInput
                placeholder="R$ 0,00"
                value={goalTarget}
                onValueChange={({ floatValue }) =>
                  setGoalTarget(floatValue ?? 0)
                }
                className="border-white/10 bg-[#111111]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#D1D5DB]">
                  Prazo (opcional — RN018)
                </label>
                {goalDeadline && (
                  <button
                    type="button"
                    onClick={() => setGoalDeadline(undefined)}
                    className="text-[11px] text-[#9CA3AF] hover:text-white"
                  >
                    Limpar prazo
                  </button>
                )}
              </div>
              <DatePicker value={goalDeadline} onChange={setGoalDeadline} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setGoalModalOpen(false)}
                disabled={savingGoal}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingGoal}
                className="bg-[#55B02E] text-white hover:bg-[#499826]"
              >
                Salvar Objetivo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL APORTE / RETIRADA */}
      <Dialog open={txModalOpen} onOpenChange={setTxModalOpen}>
        <DialogContent className="border-white/10 bg-[#161616] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {txType === "CONTRIBUTION"
                ? `Adicionar Contribuição — ${selectedGoal?.name}`
                : `Retirar Valor — ${selectedGoal?.name}`}
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {txType === "CONTRIBUTION"
                ? "O valor informado será somado ao saldo desta meta sem alterar seu saldo principal de receitas e despesas (RN016)."
                : `Saldo disponível na meta: ${formatCurrency(
                    selectedGoal?.currentBalance ?? 0,
                  )}.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMovement} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#D1D5DB]">
                Valor *
              </label>
              <MoneyInput
                placeholder="R$ 0,00"
                value={txAmount}
                onValueChange={({ floatValue }) => setTxAmount(floatValue ?? 0)}
                className="border-white/10 bg-[#111111]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#D1D5DB]">
                Data *
              </label>
              <DatePicker
                value={txDate}
                onChange={(d) => d && setTxDate(d)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#D1D5DB]">
                Descrição (opcional)
              </label>
              <Input
                placeholder="Ex.: Aporte mensal de setembro"
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                className="border-white/10 bg-[#111111]"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTxModalOpen(false)}
                disabled={savingTx}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingTx}
                className="bg-[#55B02E] text-white hover:bg-[#499826]"
              >
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE META ATINGIDA COM OPÇÃO DE AUMENTAR VALOR-ALVO (RN019 / RN032 / CT09) */}
      <Dialog
        open={Boolean(celebrationGoal)}
        onOpenChange={(open) => !open && setCelebrationGoal(null)}
      >
        <DialogContent className="border-[#55B02E]/40 bg-[#161616] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#55B02E]">
              <PartyPopperIcon className="h-5 w-5" />
              Parabéns! Meta Atingida!
            </DialogTitle>
            <DialogDescription className="text-[#D1D5DB]">
              Seu objetivo <strong>{celebrationGoal?.goalName}</strong> atingiu{" "}
              <strong>{celebrationGoal?.percentage}%</strong> (
              {formatCurrency(celebrationGoal?.currentBalance ?? 0)} de{" "}
              {formatCurrency(celebrationGoal?.targetAmount ?? 0)}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleIncreaseTarget} className="space-y-4">
            <p className="text-xs text-[#9CA3AF]">
              Sua meta permanece ativa para novos aportes (RN019). Se desejar,
              você pode ampliar o valor-alvo abaixo:
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#D1D5DB]">
                Novo Valor-Alvo Desejado
              </label>
              <MoneyInput
                value={newTargetAmount}
                onValueChange={({ floatValue }) =>
                  setNewTargetAmount(floatValue ?? 0)
                }
                className="border-white/10 bg-[#111111]"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCelebrationGoal(null)}
              >
                Manter valor atual
              </Button>
              <Button
                type="submit"
                disabled={savingGoal}
                className="bg-[#55B02E] text-white hover:bg-[#499826]"
              >
                Aumentar valor-alvo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
