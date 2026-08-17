export interface SiteActivity {
  id: number;
  work_order_site_id: number;
  activity: string;
  created_at: Date;
  updated_at: Date;
}

export interface ActivityDataEntry {
  id: number;
  site_activity_id: number | null;
  work_order_site_id: number;
  estimated_quantity: string;
  amount: string | null;
  transportation_km: string | null;
  type: "sub_wo" | "estimate" | "completion";
}

export interface WorkOrderSiteDetails {
  id: number;
  work_order_id: number;
  client_id: number;
  site_id: number;
  date: Date;
  end_date: Date;
  process_type: string;
  status: "pending" | "completed" | "cancelled";
  created_at: Date;
  updated_at: Date;
  site?: {
    id: number;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  work_order?: {
    id: number;
    code: string;
    title: string;
    process_type: string;
    job_number: string;
    area: string;
    installation_type: string;
    joint_estimate_number: string;
    land_owner_name: string;
    remarks: string;
  };
  activities?: SiteActivity[];
}

export interface ActivityDataByPhase {
  sub_wo: ActivityDataEntry[];
  estimate: ActivityDataEntry[];
  completion: ActivityDataEntry[];
}
