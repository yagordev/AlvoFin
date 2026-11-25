"use client";

import { Button } from "@/app/_components/ui/button";
import UpsertTransactionDialog from "@/app/_components/upsert-transaction-dialog";
import { CategoryDTO } from "@/app/_data/get-categories";
import { TransactionType } from "@prisma/client";
import { PencilIcon } from "lucide-react";
import { useState } from "react";

export interface SerializedTransaction {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string | null;
  createdByAi: boolean;
  isFuture: boolean;
}

interface EditTransactionButtonProps {
  transaction: SerializedTransaction;
  categories: CategoryDTO[];
}

const EditTransactionButton = ({
  transaction,
  categories,
}: EditTransactionButtonProps) => {
  const [dialogIsOpen, setDialogIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="Editar movimentação"
        className="text-muted-foreground hover:text-white"
        onClick={() => setDialogIsOpen(true)}
      >
        <PencilIcon className="h-4 w-4" />
      </Button>
      <UpsertTransactionDialog
        isOpen={dialogIsOpen}
        setIsOpen={setDialogIsOpen}
        categories={categories}
        defaultValues={{
          type: transaction.type,
          amount: Number(transaction.amount),
          categoryId: transaction.categoryId,
          date: new Date(transaction.date),
          description: transaction.description ?? "",
          createdByAi: transaction.createdByAi,
        }}
        transactionId={transaction.id}
      />
    </>
  );
};

export default EditTransactionButton;
