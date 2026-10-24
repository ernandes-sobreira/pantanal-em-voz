import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pantanal em Voz",
  description: "Salas coletivas para conversar, responder e construir mensagens sobre o Pantanal.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
