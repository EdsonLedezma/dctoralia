import { useSession, signIn } from "next-auth/react";
import { api } from "~/trpc/react";

export function useAuth() {
  const { data: session, status } = useSession();
  
  // tRPC mutations
  const signinMutation = api.auth.signin.useMutation();
  const updateProfileMutation = api.auth.updateProfile.useMutation();
  const changePasswordMutation = api.auth.changePassword.useMutation();
  
  // tRPC queries
  const profileQuery = api.auth.getProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });
  
  // Enhanced signin that combines tRPC validation with NextAuth session creation
  const signin = async (email: string, password: string) => {
    try {
      // First, validate credentials with tRPC
      const tRPCResult = await signinMutation.mutateAsync({ email, password });
      
      if (tRPCResult.status === 200) {
        // If tRPC validation succeeds, create NextAuth session
        const nextAuthResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (nextAuthResult?.error) {
          throw new Error("Error en la autenticación");
        }

        return {
          success: true,
          user: tRPCResult.user,
          nextAuthResult,
        };
      }
      
      throw new Error("Credenciales inválidas");
    } catch (error) {
      // Re-throw the error so it can be caught by the calling component
      throw error;
    }
  };

  const updateProfile = async (data: {
    name?: string;
    phone?: string;
    image?: string;
    specialty?: string;
    about?: string;
    experience?: number;
    birthDate?: Date;
    gender?: string;
    address?: string;
  }) => {
    return await updateProfileMutation.mutateAsync(data);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    return await changePasswordMutation.mutateAsync({
      currentPassword,
      newPassword,
    });
  };

  return {
    // Session data from NextAuth
    user: session?.user,
    session,
    isAuthenticated: !!session?.user,
    isLoading: status === "loading",
    
    // User profile data from tRPC
    profile: profileQuery.data,
    isProfileLoading: profileQuery.isLoading,
    profileError: profileQuery.error,
    
    // Auth functions
    signin,
    updateProfile,
    changePassword,
    
    // Loading states
    isSigningIn: signinMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    
    // Error states
    signinError: signinMutation.error,
    updateProfileError: updateProfileMutation.error,
    changePasswordError: changePasswordMutation.error,
    
    // Reset functions
    resetSigninError: signinMutation.reset,
    resetUpdateProfileError: updateProfileMutation.reset,
    resetChangePasswordError: changePasswordMutation.reset,
  };
} 