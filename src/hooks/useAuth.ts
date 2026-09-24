import { useSession, signIn } from "next-auth/react";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

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
      const tRPCResult = unwrapTrpcResult(
        await signinMutation.mutateAsync({ email, password }),
      );

      if (tRPCResult.user) {
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
    return unwrapTrpcResult(await updateProfileMutation.mutateAsync(data));
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    return unwrapTrpcResult(
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      }),
    );
  };

  return {
    // Session data from NextAuth
    user: session?.user,
    session,
    isAuthenticated: !!session?.user,
    isLoading: status === "loading",

    // User profile data from tRPC
    profile: profileQuery.data?.result ?? null,
    isProfileLoading: profileQuery.isLoading,
    profileError:
      profileQuery.error ??
      (profileQuery.data?.error ? new Error(profileQuery.data.message) : null),

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
    updateProfileError:
      updateProfileMutation.error ??
      (updateProfileMutation.data?.error
        ? new Error(updateProfileMutation.data.message)
        : null),
    changePasswordError:
      changePasswordMutation.error ??
      (changePasswordMutation.data?.error
        ? new Error(changePasswordMutation.data.message)
        : null),

    // Reset functions
    resetSigninError: signinMutation.reset,
    resetUpdateProfileError: updateProfileMutation.reset,
    resetChangePasswordError: changePasswordMutation.reset,
  };
}
