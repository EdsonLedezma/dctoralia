import { useState } from "react";
import { getSession, useSession, signIn } from "next-auth/react";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

export function useAuth() {
  const { data: session, status } = useSession();

  // tRPC mutations
  const updateProfileMutation = api.auth.updateProfile.useMutation();
  const changePasswordMutation = api.auth.changePassword.useMutation();
  const [signinError, setSigninError] = useState<Error | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // tRPC queries
  const profileQuery = api.auth.getProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const signin = async (email: string, password: string) => {
    setSigninError(null);
    setIsSigningIn(true);
    try {
      const nextAuthResult = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (nextAuthResult?.error || !nextAuthResult?.ok) {
        throw new Error("El correo o la contraseña no son correctos.");
      }

      const authenticatedSession = await getSession();
      return {
        success: true,
        user: authenticatedSession?.user ?? null,
        nextAuthResult,
      };
    } catch (caughtError) {
      const error =
        caughtError instanceof Error
          ? caughtError
          : new Error("No se pudo iniciar sesión.");
      setSigninError(error);
      throw error;
    } finally {
      setIsSigningIn(false);
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
    isSigningIn,
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,

    // Error states
    signinError,
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
    resetSigninError: () => setSigninError(null),
    resetUpdateProfileError: updateProfileMutation.reset,
    resetChangePasswordError: changePasswordMutation.reset,
  };
}
