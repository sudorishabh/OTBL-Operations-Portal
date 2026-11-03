import { useState } from "react";
import toast from "react-hot-toast";
import type { JobOrderWorkOrder } from "./job-order-dialog";
import {
  downloadCompletionCertificate,
  downloadJobOrderForm,
  type JobOrderFormContent,
} from "./job-order-form-pdf";

const FORMS = {
  job_order: { download: downloadJobOrderForm, name: "job order form" },
  completion: {
    download: downloadCompletionCertificate,
    name: "work completion certificate",
  },
};

// Downloads a job order as one of the client's forms, its job order form or
// its work completion certificate, and says so if it can't be made.
const useJobOrderFormDownload = (
  workOrder: JobOrderWorkOrder,
  form: keyof typeof FORMS = "job_order",
) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async (jobOrder: JobOrderFormContent) => {
    setIsDownloading(true);
    try {
      await FORMS[form].download(jobOrder, workOrder);
    } catch {
      toast.error(`Couldn't make the ${FORMS[form].name}. Try again.`);
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading };
};

export default useJobOrderFormDownload;
