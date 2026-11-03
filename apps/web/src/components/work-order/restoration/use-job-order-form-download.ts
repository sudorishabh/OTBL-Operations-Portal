import { useState } from "react";
import toast from "react-hot-toast";
import type { JobOrderWorkOrder } from "./job-order-dialog";
import {
  downloadJobOrderForm,
  type JobOrderFormContent,
} from "./job-order-form-pdf";

// Downloads a job order as the client's form, and says so if it can't be made.
const useJobOrderFormDownload = (workOrder: JobOrderWorkOrder) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async (jobOrder: JobOrderFormContent) => {
    setIsDownloading(true);
    try {
      await downloadJobOrderForm(jobOrder, workOrder);
    } catch {
      toast.error("Couldn't make the job order form. Try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading };
};

export default useJobOrderFormDownload;
