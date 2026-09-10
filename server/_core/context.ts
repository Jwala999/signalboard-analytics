import type { Request, Response } from "express";
import type { User } from "../../drizzle/schema";

export interface TrpcContext {
  req: Request;
  res: Response;
  user: User | null;
}
