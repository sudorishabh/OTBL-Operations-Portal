import cookieParser from "cookie-parser";
import express, { json, urlencoded } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "./config/cors";
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

app.use(helmet());

app.use(cors);
app.use(json({ limit: "10mb" }));
app.use(urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/trpc/authMutation", authRateLimiter);
app.use("/trpc/authQuery", authRateLimiter);
app.use("/trpc", generalRateLimiter);

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
