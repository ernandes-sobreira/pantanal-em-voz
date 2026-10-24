import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pantanal em Voz",
  description: "Roletas de conversa e salas coletivas para aproximar pessoas e falar sobre o Pantanal.",
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
