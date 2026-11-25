"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { AuthSidePanel } from "../_components/auth-side-panel";
import { AlvoFinLogo } from "../_components/alvofin-logo";
import { registerAction } from "../_actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const result = await registerAction({
        name,
        email,
        password,
        confirmPassword,
      });

      if (!result.success) {
        setErrorMessage(
          result.error || "Não foi possível concluir o cadastro.",
        );
        toast.error(result.error || "Verifique os dados informados.");
        setLoading(false);
        return;
      }

      toast.success(
        "Cadastro realizado com sucesso! Categorias padrão disponibilizadas.",
      );
      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage("Erro inesperado ao criar sua conta.");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-[#0F0F0F] text-white lg:grid-cols-[44%_56%]">
      {/* ESQUERDA */}
      <AuthSidePanel />

      {/* DIREITA */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-[440px]">
          <div className="mb-8 lg:hidden">
            <AlvoFinLogo size="md" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white">
            Crie sua conta
          </h2>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            Comece a organizar sua vida financeira.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="block text-xs font-medium text-[#D1D5DB]"
              >
                Nome
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="h-12 w-full rounded-xl border border-white/10 bg-[#141414] px-4 text-sm text-white placeholder-[#6B7280] outline-none transition focus:border-[#55B02E] focus:ring-1 focus:ring-[#55B02E]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#D1D5DB]"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="h-12 w-full rounded-xl border border-white/10 bg-[#141414] px-4 text-sm text-white placeholder-[#6B7280] outline-none transition focus:border-[#55B02E] focus:ring-1 focus:ring-[#55B02E]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#D1D5DB]"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha segura"
                className="h-12 w-full rounded-xl border border-white/10 bg-[#141414] px-4 text-sm text-white placeholder-[#6B7280] outline-none transition focus:border-[#55B02E] focus:ring-1 focus:ring-[#55B02E]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-[#D1D5DB]"
              >
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                className="h-12 w-full rounded-xl border border-white/10 bg-[#141414] px-4 text-sm text-white placeholder-[#6B7280] outline-none transition focus:border-[#55B02E] focus:ring-1 focus:ring-[#55B02E]"
              />
            </div>

            <p className="pt-1 text-[11px] text-[#6B7280]">
              Ao criar sua conta, você concorda com os termos de uso e política
              de privacidade.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-[#55B02E] px-6 text-sm font-semibold text-white transition hover:bg-[#499826] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar conta"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#9CA3AF]">
            Já possui uma conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#55B02E] hover:underline"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
