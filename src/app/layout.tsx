import "~/styles/globals.css";
import { Analytics } from "@vercel/analytics/react";
import { type Metadata, type Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import Providers from "~/components/providers/Providers";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "Dopilot",
  applicationName: "Dopilot",
  description: "Agenda y automatiza tu consultorio médico",
  icons: [{ rel: "icon", url: "/dopilot-icono.svg" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
  ],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return (
    <html
      lang="es-MX"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <body>
        <Providers session={session}>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
