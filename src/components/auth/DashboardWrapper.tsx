"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface DashboardWrapperProps {
  children: React.ReactNode
  allowedRoles?: ("DOCTOR" | "PATIENT" | "ADMIN")[]
  redirectTo?: string
}

export default function DashboardWrapper({ 
  children, 
  allowedRoles = ["DOCTOR"], 
  redirectTo = "/login" 
}: DashboardWrapperProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push(redirectTo)
      return
    }

    // Check if user role is allowed
    if (!allowedRoles.includes(session.user.role)) {
      // Redirect based on role
      if (session.user.role === "DOCTOR") {
        router.push("/dashboard")
      } else if (session.user.role === "PATIENT") {
        router.push("/patient/dashboard")
      } else {
        router.push(redirectTo)
      }
      return
    }
  }, [session, status, router, allowedRoles, redirectTo])

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Verificando acceso...</span>
        </div>
      </div>
    )
  }

  // Don't render content if not authenticated or not authorized
  if (!session || !allowedRoles.includes(session.user.role)) {
    return null
  }

  return <>{children}</>
} 