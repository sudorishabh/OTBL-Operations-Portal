import { constants } from "@pkg/utils";

const { WO_PROCESS } = constants;

// Restoration and bioremediation sites each keep the vendors their work is
// ordered to, and record expenses under them.
export const keepsOwnContractors = (processType: string) =>
  processType === WO_PROCESS.RESTORATION ||
  processType === WO_PROCESS.BIOREMEDIATION;
