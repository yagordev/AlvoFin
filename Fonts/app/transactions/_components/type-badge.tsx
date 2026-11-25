import { Badge } from "@/app/_components/ui/badge";
import { TransactionType } from "@prisma/client";
import { CircleIcon } from "lucide-react";

interface TransactionTypeBadgeProps {
  type: TransactionType;
}

const TransactionTypeBadge = ({ type }: TransactionTypeBadgeProps) => {
  if (type === TransactionType.INCOME) {
    return (
      <Badge className="bg-[#55B02E]/15 font-bold text-[#55B02E] hover:bg-[#55B02E]/20">
        <CircleIcon className="mr-2 fill-[#55B02E]" size={10} />
        Receita
      </Badge>
    );
  }

  return (
    <Badge className="bg-[#F6352E]/15 font-bold text-[#F6352E] hover:bg-[#F6352E]/20">
      <CircleIcon className="mr-2 fill-[#F6352E]" size={10} />
      Despesa
    </Badge>
  );
};

export default TransactionTypeBadge;
