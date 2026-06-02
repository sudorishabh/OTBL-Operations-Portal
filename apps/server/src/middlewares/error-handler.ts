import { ErrorRequestHandler } from "express";
import { HTTPSTATUS } from "../utils/http-config";

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next
): any => {
  console.error(`Error occured on PATH: ${req.path}`, error);

  if (error instanceof SyntaxError) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      message: "Invalid JSON format, please check your request body",
    });
  }

  const isDev = process.env.NODE_ENV !== "production";
  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    ...(isDev ? { error: error?.message || "Unknown error occurred" } : {}),
  });
};
