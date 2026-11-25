"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { AuthSidePanel } from "../_components/auth-side-panel";
import { AlvoFinLogo } from "../_components/alvofin-logo";
import { loginAction } from "../_actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const result = await loginAction({
        email,
        password,
        rememberMe,
      });

      if (!result.success) {
        setErrorMessage(result.error || "E-mail ou senha incorretos.");
        toast.error(result.error || "E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      toast.success("Login realizado com sucesso!");
      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage("Ocorreu um erro ao tentar acessar sua conta.");
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
            Bem-vindo de volta
          </h2>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            Acesse sua conta para continuar.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
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

            <div className="space-y-2">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-xl border border-white/10 bg-[#141414] px-4 text-sm text-white placeholder-[#6B7280] outline-none transition focus:border-[#55B02E] focus:ring-1 focus:ring-[#55B02E]"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[#9CA3AF]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-[#141414] accent-[#55B02E]"
                />
                <span>Lembrar acesso</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  toast.info(
                    "Para redefinir sua senha na versão acadêmica, crie uma nova conta ou contate o administrador.",
                  )
                }
                className="font-medium text-[#55B02E] hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-[#55B02E] px-6 text-sm font-semibold text-white transition hover:bg-[#499826] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-white/[0.08] pt-6 text-center text-xs text-[#9CA3AF]">
            Ainda não tem uma conta?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#55B02E] hover:underline"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
