import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Causa Raiz La · Laboratório de investigação",
  description:
    "Investigue processos com Ishikawa, evidências, riscos e contramedidas 5W2H.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
