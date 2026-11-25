"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog";
import { Button } from "@/app/_components/ui/button";
import { TrashIcon } from "lucide-react";
import { deleteTransaction } from "../_actions/delete-transaction";
import { toast } from "sonner";

interface DeleteTransactionButtonProps {
  transactionId: string;
}

const DeleteTransactionButton = ({
  transactionId,
}: DeleteTransactionButtonProps) => {
  const handleConfirmDeleteClick = async () => {
    try {
      const res = await deleteTransaction({ transactionId });
      if (!res.success) {
        toast.error(res.error || "Não foi possível excluir a movimentação.");
        return;
      }
      toast.success("Movimentação excluída com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Ocorreu um erro ao excluir a movimentação.");
    }
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Excluir movimentação"
          className="text-muted-foreground hover:text-red-400"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-white/10 bg-[#161616] text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Deseja realmente excluir esta movimentação?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#9CA3AF]">
            A movimentação será removida dos saldos, relatórios e cálculos de
            limites (exclusão lógica preservando integridade referencial).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDeleteClick}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Confirmar exclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTransactionButton;
