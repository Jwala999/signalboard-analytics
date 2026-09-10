import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { analyzeWithPython, answerDatasetQuestion, coerceChatMessages } from "./analytics";

import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ENV } from "./_core/env";

const USERS_FILE = path.join(process.cwd(), "users.json");
function getUsers(): any[] {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")); }
  catch { return []; }
}
function saveUsers(users: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    signup: publicProcedure
      .input(z.object({ name: z.string(), email: z.string().email(), password: z.string().min(4) }))
      .mutation(async ({ input, ctx }) => {
        const users = getUsers();
        if (users.find(u => u.email === input.email)) throw new Error("Email already registered");
        const openId = "u_" + Date.now().toString(36);
        const hashedPassword = await bcrypt.hash(input.password, 10);
        const newUser = { openId, name: input.name, email: input.email, password: hashedPassword, role: "user" };
        users.push(newUser);
        saveUsers(users);
        const token = jwt.sign({ openId, name: newUser.name, email: newUser.email, role: newUser.role }, ENV.jwtSecret, { expiresIn: "7d" });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 7 * 24 * 60 * 60 * 1000 });
        return { success: true };
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = getUsers().find(u => u.email === input.email);
        if (!user || !(await bcrypt.compare(input.password, user.password))) {
          throw new Error("Invalid email or password");
        }
        const token = jwt.sign({ openId: user.openId, name: user.name, email: user.email, role: user.role }, ENV.jwtSecret, { expiresIn: "7d" });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 7 * 24 * 60 * 60 * 1000 });
        return { success: true };
      }),
  }),
  analytics: router({
    analyze: publicProcedure
      .input(z.object({
        filename: z.string().min(1).max(255),
        base64Data: z.string().min(1).max(250_000_000),
      }))
      .mutation(({ input }) => analyzeWithPython(input.filename, input.base64Data)),
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().max(8_000) })).max(20),
        analysis: z.any(),
      }))
      .mutation(async ({ input }) => ({
        content: await answerDatasetQuestion(coerceChatMessages(input.messages), input.analysis),
      })),
  }),
});

export type AppRouter = typeof appRouter;
