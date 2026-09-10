import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";

/**
 * Hook for accessing the current authenticated user.
 *
 * - `loading`: true while the auth query is in flight.
 * - `user`: the authenticated user object, or null/undefined if not signed in.
 * - `logout`: call to sign out and redirect.
 */
export function useAuth() {
  const authQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      // After logout, redirect to login
      startLogin();
    },
  });

  return {
    loading: authQuery.isLoading,
    user: authQuery.data ?? null,
    error: authQuery.error,
    logout: () => logoutMutation.mutate(),
  };
}
