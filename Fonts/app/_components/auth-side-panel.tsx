import React from "react";
import { AlvoFinLogo } from "./alvofin-logo";

export const AuthSidePanel = () => {
  return (
    <div className="hidden min-h-screen flex-col justify-between border-r border-white/[0.06] bg-[#141414] px-12 py-12 lg:flex xl:px-16">
      {/* TOP LOGO */}
      <div>
        <AlvoFinLogo size="lg" />
      </div>

      {/* MIDDLE HERO & CARD */}
      <div className="my-auto max-w-[440px] space-y-10">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-[44px]">
            Organize suas finanças com mais clareza.
          </h1>
          <p className="text-base leading-relaxed text-[#9CA3AF]">
            Acompanhe receitas, despesas, limites e objetivos em um só lugar com
            apoio de inteligência artificial.
          </p>
        </div>

        {/* CARD RESUMO DO MÊS */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#181818] p-6 shadow-xl">
          <p className="text-sm font-medium text-[#D1D5DB]">Resumo do mês</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">
            R$ 4.850,00
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Saldo previsto</p>

          <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-[#2A2A2A]">
            <div className="h-full w-[68%] rounded-full bg-[#55B02E]" />
          </div>

          <p className="mt-4 text-xs text-[#9CA3AF]">
            Você está dentro do planejado este mês.
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div>
        <p className="text-xs text-[#6B7280]">
          Controle financeiro simples. Decisões melhores.
        </p>
      </div>
    </div>
  );
};
