import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { appRouter } from "../routers";
import type { TrpcContext } from "./context";
import { ENV } from "./env";
import { COOKIE_NAME } from "@shared/const";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Body parsing
  app.use(express.json({ limit: "250mb" }));

  app.use(cookieParser());

  // tRPC middleware
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }): TrpcContext => {
        let user = null;
        const token = req.cookies[COOKIE_NAME];
        if (token) {
          try {
            user = jwt.verify(token, ENV.jwtSecret) as any;
          } catch (e) {
            // invalid token
          }
        }
        return { req, res, user };
      },
    })
  );

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist/public in production
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));

    // Handle client-side routing - serve index.html for all routes
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  // Global error handler to ensure JSON responses for payload too large, etc.
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      res.status(err.status || 500).json({ error: { message: err.message || "Internal Server Error" } });
      return;
    }
    next();
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
