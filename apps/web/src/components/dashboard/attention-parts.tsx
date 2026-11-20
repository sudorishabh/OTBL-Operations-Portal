"use client";
import React, { type ComponentType } from "react";
import {
  ClipboardList,
  FileClock,
  FileSignature,
  ReceiptText,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { constants } from "@pkg/utils";
import type { RouterOutputs } from "@/lib/trpc";
import { SubHeading } from "./dashboard-card";
import { formatCount } from "./format";

// What the needs-attention card and its dialog share.

const { CONTRACT_ORDER_TYPE } = constants;

type Attention = RouterOutputs["dashboardQuery"]["getAttention"];

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from today to a date: negative once it has passed.
const daysFromToday = (value: Date | string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / DAY_MS);
};

// "Today", "In 3 days", "12 days late".
export const dueLabel = (value: Date | string) => {
  const days = daysFromToday(value);
  if (days === 0) return "Today";
  if (days > 0) return `In ${days} day${days === 1 ? "" : "s"}`;
  return `${-days} day${days === -1 ? "" : "s"} late`;
};

// A count of records waiting on something, with what they wait on.
const FollowUp = ({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
}) => (
  <li className='flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5'>
    <Icon
      aria-hidden='true'
      className='size-3.5 shrink-0 text-gray-400'
    />
    <span className='min-w-0 flex-1 text-[11px] leading-tight text-gray-600'>
      {label}
    </span>
    <span className='shrink-0 text-[13px] font-semibold tabular-nums text-gray-900'>
      {value === undefined ? "—" : formatCount(value)}
    </span>
  </li>
);

// The job orders, contract orders and proposals still waiting on a document
// or a decision. Proposals show only when their count is given.
export const PaperworkFollowUps = ({
  attention,
  proposalsPending,
}: {
  attention: Attention;
  proposalsPending?: number;
}) => {
  const pendingOrders = (type: string) => {
    const orders = attention.contractOrders[type];
    return orders ? orders.total - orders.completed : 0;
  };

  return (
    <div>
      <SubHeading>Waiting on paperwork</SubHeading>
      <ul className='grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3'>
        <FollowUp
          icon={FileClock}
          label='Job orders to certify'
          value={attention.jobOrders.awaitingCertificate}
        />
        <FollowUp
          icon={ReceiptText}
          label='Certified job orders to invoice'
          value={attention.jobOrders.awaitingInvoice}
        />
        <FollowUp
          icon={ShoppingCart}
          label='Purchase orders to complete'
          value={pendingOrders(CONTRACT_ORDER_TYPE.PURCHASE_ORDER)}
        />
        <FollowUp
          icon={Truck}
          label='Sub-contracts to complete'
          value={pendingOrders(CONTRACT_ORDER_TYPE.SUB_CONTRACT)}
        />
        {proposalsPending !== undefined && (
          <FollowUp
            icon={FileSignature}
            label='Proposals awaiting a decision'
            value={proposalsPending}
          />
        )}
        <FollowUp
          icon={ClipboardList}
          label='Open job orders'
          value={attention.jobOrders.open}
        />
      </ul>
    </div>
  );
};
