"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { MONTHS_OPTIONS } from "@/app/_constants/transactions";
import { useRouter, useSearchParams } from "next/navigation";

const TimeSelect = () => {
  const { push } = useRouter();
  const searchParams = useSearchParams();
  const currentMonth = String(
    Number(searchParams.get("month")) || new Date().getMonth() + 1,
  );
  const currentYear = String(
    Number(searchParams.get("year")) || new Date().getFullYear(),
  );

  const handleMonthChange = (month: string) => {
    push(`/?month=${month}&year=${currentYear}`);
  };

  return (
    <Select
      onValueChange={(value) => handleMonthChange(value)}
      value={currentMonth}
    >
      <SelectTrigger className="h-10 w-[150px] rounded-full border-white/15 bg-[#141414] px-5 text-sm font-semibold text-white">
        <SelectValue placeholder="Mês" />
      </SelectTrigger>
      <SelectContent>
        {MONTHS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TimeSelect;
