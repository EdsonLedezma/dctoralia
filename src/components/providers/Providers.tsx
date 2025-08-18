"use client"

import { SessionProvider } from "next-auth/react"
import { TRPCReactProvider } from "../../trpc/react"
import type { Session } from "next-auth"
import { Toaster } from "~/components/ui/sonner"

interface ProvidersProps {
  children: React.ReactNode
  session?: Session | null
}

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <TRPCReactProvider>
        {children}
        <Toaster richColors closeButton />
      </TRPCReactProvider>
    </SessionProvider>
  )
} 