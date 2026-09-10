import { publicProcedure, router } from "./trpc";

/**
 * System router — health check and metadata endpoints.
 */
export const systemRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  })),
});
