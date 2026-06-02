import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@pkg/trpc";
import type { inferRouterOutputs } from "@trpc/server";

export const trpc: any = createTRPCReact<any>();
export type RouterOutputs = inferRouterOutputs<AppRouter>;
