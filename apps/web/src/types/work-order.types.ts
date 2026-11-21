export interface IWorkOrder {
  id: number;
  code: string;
  purchase_order_code: string | null;
  title: string;
  client_id: number;
  client_name: string | null;
  office_id: number;
  office_name: string | null;
  start_date: string | Date;
  end_date: string | Date;
  handing_over_date: string | Date;
  agreement_number: string;
  budget_amount?: string | null;
  status: "pending" | "completed";
  created_at: string | Date;
  updated_at: string | Date;
}

export interface IWorkOrderPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
}
