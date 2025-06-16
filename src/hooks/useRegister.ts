import { api } from "../trpc/react"

export function useRegister() {
  // tRPC registration mutation
  const registerMutation = api.auth.register.useMutation()

  // Helper function for registration
  const register = async (data: {
    name: string
    email: string
    password: string
    phone: string
    role: "DOCTOR" | "PATIENT"
    specialty?: string
    license?: string
  }) => {
    return await registerMutation.mutateAsync(data)
  }

  return {
    // Registration function
    register,
    
    // Loading state
    isRegistering: registerMutation.isPending,
    
    // Error state
    registerError: registerMutation.error,
    
    // Success state
    isSuccess: registerMutation.isSuccess,
    
    // Reset function
    resetRegister: registerMutation.reset,
    
    // Raw mutation data
    registerData: registerMutation.data,
  }
} 