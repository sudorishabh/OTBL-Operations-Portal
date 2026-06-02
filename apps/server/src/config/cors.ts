import cors from "cors";
import appEnv from "./app-env";

const allowedOrigins = [
  appEnv.WEB_CLIENT,
  appEnv.MOBILE_CLIENT,
  "https://site.otbl.co.in",
  "https://otbl.co.in",
  "https://otbl.teri.res.in",
].filter((o): o is string => Boolean(o));

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      const isDev = process.env.NODE_ENV !== "production";
      return callback(null, isDev);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      console.warn(`Origin blocked by CORS: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

export default cors(corsOptions);
