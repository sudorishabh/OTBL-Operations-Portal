import { CheckCircle2, IndianRupee, MapPin } from "lucide-react";
import React, { useState } from "react";
import ClientStatCard from "./client-stat-card";
import TotalSitesDialog from "./client-stats-dialogs/total-sites-dialog";
import CompletedWODialog from "./client-stats-dialogs/completed-wo-dialog";
import TotalBudgetDialog from "./client-stats-dialogs/total-budget-dialog";
import TotalExpenseDialog from "./client-stats-dialogs/total-expense-dialog";

interface Props {
  stats:
    | {
        siteCount: number;
        completedWorkOrders: number;
        totalBudgetAmount: number;
        totalExpenseAmount: number;
      }
    | undefined;
  clientId: string;
}

const ClientStats = ({ stats, clientId }: Props) => {
  const [isTotalSiteDialog, setIsTotalSiteDialog] = useState(false);
  const [isCompletedWODialog, setIsCompletedWODialog] = useState(false);
  const [isTotalBudgetDialog, setIsTotalBudgetDialog] = useState(false);
  const [isTotalExpenseDialog, setIsTotalExpenseDialog] = useState(false);

  const fmt = (n: number | undefined) =>
    (Number.isFinite(Number(n)) ? Number(n) : 0).toLocaleString();

  return (
    <>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4'>
        <ClientStatCard
          Icon={MapPin}
          title='Total Sites'
          stat={stats ? fmt(stats.siteCount) : "0"}
          openDialog={isTotalSiteDialog}
          setOpenDialog={setIsTotalSiteDialog}
        />
        <ClientStatCard
          Icon={CheckCircle2}
          title='Completed Work Orders'
          stat={stats ? fmt(stats.completedWorkOrders) : "0"}
          openDialog={isCompletedWODialog}
          setOpenDialog={setIsCompletedWODialog}
        />
        <ClientStatCard
          Icon={IndianRupee}
          title='Total Budget'
          stat={stats ? fmt(stats.totalBudgetAmount) : "0"}
          openDialog={isTotalBudgetDialog}
          setOpenDialog={setIsTotalBudgetDialog}
        />
        <ClientStatCard
          Icon={IndianRupee}
          title='Total Expense'
          stat={stats ? fmt(stats.totalExpenseAmount) : "0"}
          openDialog={isTotalExpenseDialog}
          setOpenDialog={setIsTotalExpenseDialog}
        />
      </div>
      <TotalSitesDialog
        open={isTotalSiteDialog}
        setOpen={setIsTotalSiteDialog}
      />
      <CompletedWODialog
        open={isCompletedWODialog}
        setOpen={setIsCompletedWODialog}
      />
      <TotalBudgetDialog
        open={isTotalBudgetDialog}
        setOpen={setIsTotalBudgetDialog}
      />
      <TotalExpenseDialog
        open={isTotalExpenseDialog}
        setOpen={setIsTotalExpenseDialog}
      />
    </>
  );
};

export default ClientStats;
