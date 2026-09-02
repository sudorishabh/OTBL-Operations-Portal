import cookieParser from "cookie-parser";
import express, { json, urlencoded } from "express";
import helmet from "helmet";
import cors from "./config/cors";
import { trpcRateLimiter } from "./config/rate-limit";
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
app.use(json({ limit: "10mb" }));
app.use(urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

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
