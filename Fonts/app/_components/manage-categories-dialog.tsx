"use client";

import React, { useState } from "react";
import { TransactionType } from "@prisma/client";
import {
  FolderKanbanIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { CategoryDTO } from "../_data/get-categories";
import {
  reactivateCategoryAction,
  removeOrDeactivateCategoryAction,
  upsertCategoryAction,
} from "../_actions/categories";

interface ManageCategoriesDialogProps {
  categories: CategoryDTO[];
}

export const ManageCategoriesDialog = ({
  categories,
}: ManageCategoriesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [tabType, setTabType] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setType(TransactionType.EXPENSE);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    setLoading(true);
    const res = await upsertCategoryAction({
      id: editingId ?? undefined,
      name: name.trim(),
      type,
    });
    setLoading(false);

    if (!res.success) {
      toast.error(res.error || "Não foi possível salvar a categoria.");
      return;
    }

    toast.success(
      editingId
        ? "Categoria atualizada com sucesso!"
        : "Categoria personalizada criada com sucesso!",
    );
    resetForm();
  };

  const handleEdit = (cat: CategoryDTO) => {
    if (cat.isDefault) {
      toast.error("Categorias padrão não podem ser editadas (RN007).");
      return;
    }
    setEditingId(cat.id);
    setName(cat.name);
    setType(cat.type);
  };

  const handleRemove = async (cat: CategoryDTO) => {
    if (cat.isDefault) {
      toast.error("Categorias padrão não podem ser excluídas (RN007).");
      return;
    }
    setLoading(true);
    const res = await removeOrDeactivateCategoryAction({ id: cat.id });
    setLoading(false);

    if (!res.success) {
      toast.error(res.error || "Erro ao remover categoria.");
      return;
    }

    if (res.mode === "deactivated") {
      toast.info(
        `A categoria "${cat.name}" possui vínculos e foi marcada como inativa para preservar seu histórico (RN009).`,
      );
    } else {
      toast.success(`Categoria "${cat.name}" removida com sucesso.`);
    }
  };

  const handleReactivate = async (cat: CategoryDTO) => {
    setLoading(true);
    const res = await reactivateCategoryAction({ id: cat.id });
    setLoading(false);

    if (!res.success) {
      toast.error(res.error || "Não foi possível reativar a categoria.");
      return;
    }

    toast.success(`Categoria "${cat.name}" reativada!`);
  };

  const filtered = categories.filter((c) =>
    tabType === "ALL" ? true : c.type === tabType,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full border-white/15 bg-[#141414] text-white hover:bg-white/10"
        >
          <FolderKanbanIcon className="mr-2 h-4 w-4 text-[#55B02E]" />
          Categorias
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#161616] text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            Crie e organize suas categorias personalizadas de receitas e
            despesas. Categorias padrão do AlvoFin são protegidas.
          </DialogDescription>
        </DialogHeader>

        {/* FORMULÁRIO NOVA / EDITAR CATEGORIA */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/10 bg-[#111111] p-4"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
            {editingId ? "Editar Categoria Personalizada" : "Nova Categoria"}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,160px,auto]">
            <Input
              placeholder="Nome da categoria (ex.: Pet, Assinaturas...)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-white/10 bg-[#181818]"
            />

            <Select
              value={type}
              onValueChange={(val) => setType(val as TransactionType)}
            >
              <SelectTrigger className="border-white/10 bg-[#181818]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TransactionType.EXPENSE}>Despesa</SelectItem>
                <SelectItem value={TransactionType.INCOME}>Receita</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#55B02E] text-white hover:bg-[#499826]"
              >
                <PlusIcon className="mr-1.5 h-4 w-4" />
                {editingId ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </form>

        {/* FILTRO POR TIPO */}
        <div className="flex items-center gap-2 pt-2">
          {(
            [
              { key: "ALL", label: "Todas" },
              { key: "EXPENSE", label: "Despesas" },
              { key: "INCOME", label: "Receitas" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTabType(item.key)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                tabType === item.key
                  ? "bg-[#55B02E] text-white"
                  : "bg-[#111111] text-[#9CA3AF] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* LISTA DE CATEGORIAS */}
        <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                cat.isActive
                  ? "border-white/10 bg-[#121212]"
                  : "border-white/5 bg-[#121212]/50 opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    cat.type === "INCOME" ? "bg-[#55B02E]" : "bg-[#F6352E]"
                  }`}
                />
                <span className="text-sm font-semibold text-white">
                  {cat.name}
                </span>
                <Badge
                  variant="outline"
                  className="border-white/10 text-[10px] text-[#9CA3AF]"
                >
                  {cat.type === "INCOME" ? "Receita" : "Despesa"}
                </Badge>
                {cat.isDefault ? (
                  <Badge className="bg-white/10 text-[10px] text-[#D1D5DB] hover:bg-white/10">
                    <LockIcon className="mr-1 h-2.5 w-2.5" />
                    Padrão
                  </Badge>
                ) : (
                  <Badge className="bg-[#55B02E]/15 text-[10px] text-[#55B02E] hover:bg-[#55B02E]/20">
                    Personalizada
                  </Badge>
                )}
                {!cat.isActive && (
                  <Badge className="bg-amber-500/20 text-[10px] text-amber-300">
                    Inativa
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                {cat.isDefault ? (
                  <span className="text-[11px] text-[#6B7280]">Sistema</span>
                ) : cat.isActive ? (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Editar categoria"
                      onClick={() => handleEdit(cat)}
                      disabled={loading}
                      className="h-8 w-8 text-[#9CA3AF] hover:text-white"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title={
                        cat.usageCount > 0
                          ? "Desativar categoria (possui movimentações vinculadas)"
                          : "Remover categoria"
                      }
                      onClick={() => handleRemove(cat)}
                      disabled={loading}
                      className="h-8 w-8 text-[#9CA3AF] hover:text-red-400"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleReactivate(cat)}
                    disabled={loading}
                    className="h-7 border-white/10 text-xs"
                  >
                    <RotateCcwIcon className="mr-1 h-3 w-3" />
                    Reativar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
