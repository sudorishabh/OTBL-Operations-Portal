"use client";
import React from "react";
import Link from "next/link";
import { capitalFirstLetter, formatCurrency } from "@pkg/utils";
import type { RouterOutputs } from "@/lib/trpc";
import { formatCompactRupees, formatCount } from "./format";
import { StatusStripe } from "./status-parts";

type Office =
  RouterOutputs["dashboardQuery"]["getOfficeBreakdown"]["offices"][number];

const HEAD =
  "px-4 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase";

// Offices with their work orders by status, their sites and what has been
// spent in their work orders, each leading to its page.
export const OfficeTable = ({ offices }: { offices: Office[] }) => (
  <div className='overflow-x-auto'>
    <table className='w-full min-w-[34rem] text-[13px]'>
      <thead className='border-b border-gray-200 bg-gray-50/60 text-left'>
        <tr>
          <th className={HEAD}>Office</th>
          <th className={HEAD}>Work orders</th>
          <th className={`${HEAD} text-right`}>Sites</th>
          <th className={`${HEAD} text-right`}>Spent</th>
        </tr>
      </thead>
      <tbody>
        {offices.map((office) => (
          <tr
            key={office.id}
            className='border-b border-gray-100 last:border-0'>
            <td className='max-w-[14rem] px-4 py-2'>
              <Link
                href={`/dashboard/office-site/${office.id}`}
                className='block truncate font-medium text-gray-800 hover:text-emerald-700 hover:underline'>
                {capitalFirstLetter(office.name)}
              </Link>
              <span className='block truncate text-[11px] text-gray-400'>
                {office.code} · {capitalFirstLetter(office.city)}
              </span>
            </td>
            <td className='w-[40%] px-4 py-2'>
              <span className='text-[12px] text-gray-600'>
                <span className='font-semibold text-gray-900'>
                  {formatCount(office.pending)}
                </span>{" "}
                pending · {formatCount(office.completed)} completed
              </span>
              <StatusStripe
                pending={office.pending}
                completed={office.completed}
              />
            </td>
            <td className='px-4 py-2 text-right tabular-nums text-gray-700'>
              {formatCount(office.sites)}
            </td>
            <td
              className='px-4 py-2 text-right tabular-nums text-gray-900'
              title={formatCurrency(office.spent)}>
              {formatCompactRupees(office.spent)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
