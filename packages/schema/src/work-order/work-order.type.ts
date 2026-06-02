import { z } from "zod";
import {
  baseWorkOrderSchema,
  createWorkOrderSchema,
  updateWorkOrderSchema,
  scheduleOfRateSchema,
} from "./work-order.schema";

export type workOrderType = {
  id: number;
  code: string;
  agreement_number: string;
  rate_contract_number: string;
  title: string;
  proposal_id: number;
  client_id: number;
  office_id: number;
  start_date: string;
  end_date: string;
  handing_over_date: string;
  document_key: string;
  process_type: "bioremediation" | "restoration" | "bioremediation_restoration";
  description: string | null;
  status: "pending" | "completed" | "cancelled";
  cancellation_reason: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type ScheduleOfRateType = {
  id: number;
  work_order_id: number;
  activity: string;
  unit: string;
  estimated_quantity: string;
  rc_unit_rate: string;
  gst_percentage: string;
  unit_rate_inc_gst: string;
  total_cost: string;
  transportation_km: string;
  created_at: string;
  updated_at: string;
};

export type BaseWorkOrderInput = z.input<typeof baseWorkOrderSchema>;
export type ScheduleOfRateInput = z.input<typeof scheduleOfRateSchema>;

export type BaseWorkOrderOutput = z.output<typeof baseWorkOrderSchema>;
export type CreateWorkOrderType = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderType = z.output<typeof updateWorkOrderSchema>;
export type ScheduleOfRateOutput = z.output<typeof scheduleOfRateSchema>;

export type CreateWorkOrderInputType = z.input<typeof createWorkOrderSchema>;
