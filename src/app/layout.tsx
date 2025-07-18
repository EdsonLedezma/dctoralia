import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import Providers from "~/components/providers/Providers";

export const metadata: Metadata = {
  title: "MediCare Pro",
  description: "Sistema de gestión médica",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
