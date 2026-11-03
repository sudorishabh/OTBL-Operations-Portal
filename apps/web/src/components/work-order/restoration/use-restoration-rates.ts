import { useMemo } from "react";
import { constants } from "@pkg/utils";
import type { RestorationRate } from "./restoration-rates-table";

const { allActivityOptions } = constants;

// The work order's restoration activities, in schedule of rates order, and
// what they are estimated to cost in all.
const useRestorationRates = (scheduleOfRates: any[]) =>
  useMemo(() => {
    const rates: RestorationRate[] = allActivityOptions
      .filter((option) => !option.isBioremediation)
      .flatMap((option) => {
        const sor = scheduleOfRates.find(
          (row) => row.activity === option.value,
        );
        return sor ? [{ ...sor, label: option.label }] : [];
      });

    const estimatedTotal = rates.reduce(
      (sum, rate) => sum + (Number(rate.total_cost) || 0),
      0,
    );

    return { rates, estimatedTotal };
  }, [scheduleOfRates]);

export default useRestorationRates;
