"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import UpsertTransactionDialog from "./upsert-transaction-dialog";
import { CategoryDTO } from "../_data/get-categories";

interface AddTransactionButtonProps {
  categories: CategoryDTO[];
  label?: string;
}

const AddTransactionButton = ({
  categories,
  label = "Nova movimentação",
}: AddTransactionButtonProps) => {
  const [dialogIsOpen, setDialogIsOpen] = useState(false);

  return (
    <>
      <Button
        className="rounded-full bg-[#55B02E] px-6 font-semibold text-white hover:bg-[#499826]"
        onClick={() => setDialogIsOpen(true)}
      >
        <PlusIcon className="mr-1.5 h-4 w-4" />
        {label}
      </Button>
      <UpsertTransactionDialog
        isOpen={dialogIsOpen}
        setIsOpen={setDialogIsOpen}
        categories={categories}
      />
    </>
  );
};

export default AddTransactionButton;
