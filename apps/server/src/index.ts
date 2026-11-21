import express, { json, urlencoded } from "express";
import { toNodeHandler } from "better-auth/node";
import helmet from "helmet";
import cors from "./config/cors";
import { authRateLimiter, trpcRateLimiter } from "./config/rate-limit";
import { auth } from "./auth";
import appEnv from "./config/app-env";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "@pkg/trpc";
import { createContext } from "./context";
import { errorHandler } from "./middlewares/error-handler";
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const app = express();

// Rate limiting keys on req.ip, so Express must know how many proxy hops to
// unwind. Defaults to `false` (no proxy) unless TRUST_PROXY says otherwise:
// behind an untrusted proxy, req.ip is the proxy's address and every client
// collapses into a single shared bucket.
app.set("trust proxy", appEnv.TRUST_PROXY);

app.use(helmet());

app.use(cors);

// Better Auth: signing in and out, sessions and passwords. It reads the raw
// request body itself, so it is mounted before the body parsers.
app.use(
  ["/api/auth/sign-in", "/api/auth/change-password"],
  authRateLimiter
);
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(json({ limit: "10mb" }));
app.use(urlencoded({ extended: true, limit: "10mb" }));

app.use("/trpc", trpcRateLimiter);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: createContext,
  })
);

app.use(errorHandler);

const PORT = process.env.PORT ? parseInt(process.env.PORT as string, 10) : 7200;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

export default app;
