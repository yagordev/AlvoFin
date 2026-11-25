import React from "react";

interface AlvoFinLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const AlvoFinLogo = ({
  className = "",
  size = "md",
}: AlvoFinLogoProps) => {
  const iconDimensions =
    size === "sm" ? "h-6 w-6" : size === "lg" ? "h-9 w-9" : "h-7 w-7";
  const innerDimensions =
    size === "sm" ? "h-2.5 w-2.5" : size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3";
  const textSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        className={`flex ${iconDimensions} items-center justify-center rounded-full bg-[#55B02E]`}
      >
        <div className={`${innerDimensions} rounded-full bg-[#111311]`} />
      </div>
      <span className={`${textSize} font-bold tracking-tight text-white`}>
        AlvoFin
      </span>
    </div>
  );
};
