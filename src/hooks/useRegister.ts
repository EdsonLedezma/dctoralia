import { api } from "../trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

export function useRegister() {
  // tRPC registration mutation
  const registerMutation = api.auth.register.useMutation();

  // Helper function for registration
  const register = async (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: "DOCTOR" | "PATIENT";
    specialty?: string;
    license?: string;
  }) => {
    return unwrapTrpcResult(await registerMutation.mutateAsync(data));
  };

  return {
    // Registration function
    register,

    // Loading state
    isRegistering: registerMutation.isPending,

    // Error state
    registerError:
      registerMutation.error ??
      (registerMutation.data?.error
        ? new Error(registerMutation.data.message)
        : null),

    // Success state
    isSuccess:
      registerMutation.isSuccess && registerMutation.data?.error === null,

    // Reset function
    resetRegister: registerMutation.reset,

    // Raw mutation data
    registerData: registerMutation.data,
  };
}
