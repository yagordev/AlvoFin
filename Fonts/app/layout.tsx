import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const mulish = Mulish({
  subsets: ["latin-ext"],
});

export const metadata: Metadata = {
  title: "AlvoFin — Gestão Financeira Pessoal com IA",
  description:
    "Sistema web de gestão financeira pessoal com apoio de Inteligência Artificial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${mulish.className} dark antialiased bg-[#0F0F0F]`}>
        <div className="flex min-h-screen flex-col">{children}</div>
        <Toaster richColors theme="dark" position="top-right" />
      </body>
    </html>
  );
}
