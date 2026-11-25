"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellIcon,
  LogOutIcon,
  UserIcon,
  AlertTriangleIcon,
  CheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AlvoFinLogo } from "./alvofin-logo";
import { logoutAction, updateProfileAction } from "../_actions/auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { formatCurrency } from "../_utils/currency";

interface ActiveAlert {
  id: string;
  threshold: number;
  referenceMonth: number;
  referenceYear: number;
  categoryName: string;
  limitAmount: number;
}

interface UserInfo {
  userId: string;
  name: string;
  email: string;
}

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Movimentações" },
  { href: "/limits", label: "Limites" },
  { href: "/goals", label: "Objetivos" },
  { href: "/reports", label: "Relatórios" },
];

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        if (data.user) {
          setUser(data.user);
          setEditName(data.user.name);
        }
        if (Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    await logoutAction();
    toast.success("Sessão encerrada.");
    router.push("/login");
    router.refresh();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const res = await updateProfileAction({ name: editName });
    setSavingProfile(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao atualizar perfil.");
      return;
    }
    setUser((prev) => (prev ? { ...prev, name: editName } : prev));
    setProfileOpen(false);
    toast.success("Perfil atualizado com sucesso!");
  };

  // Deduplica para exibir o maior patamar atingido por categoria no sino de alertas
  const highestAlertsByCategory = Object.values(
    alerts.reduce<Record<string, ActiveAlert>>((acc, item) => {
      if (
        !acc[item.categoryName] ||
        item.threshold > acc[item.categoryName].threshold
      ) {
        acc[item.categoryName] = item;
      }
      return acc;
    }, {}),
  );

  return (
    <>
      <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-[#0F0F0F] px-6 py-4 lg:px-8">
        {/* ESQUERDA: LOGO + LINKS */}
        <div className="flex flex-wrap items-center gap-6 lg:gap-10">
          <Link href="/">
            <AlvoFinLogo size="md" />
          </Link>

          <div className="flex flex-wrap items-center gap-5 lg:gap-8">
            {NAV_LINKS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? "text-sm font-semibold text-[#55B02E]"
                      : "text-sm font-medium text-[#9CA3AF] transition hover:text-white"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* DIREITA: CENTRAL DE ALERTAS (UC011) + PERFIL DO USUÁRIO */}
        <div className="flex items-center gap-3">
          {/* BOTÃO DE ALERTAS INTERNOS (UC011 / RF018 / RN030 / RN031) */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Consultar alertas financeiros"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#141414] text-[#D1D5DB] transition hover:border-white/20 hover:text-white"
              >
                <BellIcon className="h-4 w-4" />
                {highestAlertsByCategory.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                    {highestAlertsByCategory.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 border-white/10 bg-[#161616] p-4 text-white shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-sm font-semibold">
                  Alertas de Limites (Mês Atual)
                </span>
                <Link
                  href="/limits"
                  className="text-xs font-medium text-[#55B02E] hover:underline"
                >
                  Ver limites
                </Link>
              </div>
              {highestAlertsByCategory.length === 0 ? (
                <p className="py-4 text-center text-xs text-[#9CA3AF]">
                  Nenhum alerta de limite atingido neste mês.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {highestAlertsByCategory.map((alert) => {
                    const isExceeded = alert.threshold >= 100;
                    const isHigh = alert.threshold === 90;
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-xs ${
                          isExceeded
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : isHigh
                              ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="font-semibold">
                            {alert.categoryName}: {alert.threshold}% do limite
                          </p>
                          <p className="mt-0.5 text-[11px] opacity-85">
                            Limite mensal definido:{" "}
                            {formatCurrency(alert.limitAmount)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* PÍLULA DO USUÁRIO LOGADO CONFORME PROTÓTIPO */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#141414] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20"
              >
                <span className="h-3.5 w-3.5 rounded-full bg-[#55B02E]" />
                <span className="max-w-[160px] truncate">
                  {user?.name || "Minha Conta"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-60 border-white/10 bg-[#161616] p-2 text-white shadow-2xl"
            >
              {user && (
                <div className="border-b border-white/10 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-[#9CA3AF]">
                    {user.email}
                  </p>
                </div>
              )}
              <div className="mt-1 space-y-1">
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#D1D5DB] transition hover:bg-white/5 hover:text-white"
                >
                  <UserIcon className="h-4 w-4" />
                  Editar dados da conta
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Sair da conta
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </nav>

      {/* MODAL EDITAR CONTA (RF001) */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="border-white/10 bg-[#161616] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Conta</DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Atualize seu nome de exibição no AlvoFin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#D1D5DB]">Nome</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="border-white/10 bg-[#111111]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#D1D5DB]">
                E-mail (identificador único)
              </label>
              <Input
                value={user?.email || ""}
                disabled
                className="border-white/10 bg-[#111111] opacity-60"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfileOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingProfile}
                className="bg-[#55B02E] text-white hover:bg-[#499826]"
              >
                <CheckIcon className="mr-1.5 h-4 w-4" />
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navbar;
