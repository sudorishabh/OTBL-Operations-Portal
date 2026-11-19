import React from "react";
import { Mail, Phone, UserCog, Users } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import CustomButton from "@/components/shared/btn";
import ProcessSectionHeader from "@/components/work-order/process-section-header";
import useHandleParams from "@/hooks/useHandleParams";
import { cn } from "@/lib/utils";
import type { OfficeDetails, OfficeMember } from "./office-types";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

const MemberCard = ({
  member,
  isManager,
}: {
  member: OfficeMember;
  isManager: boolean;
}) => {
  const name = capitalizeEachWord(member.name);

  return (
    <li className='flex min-w-0 items-start gap-3 rounded-lg border border-gray-200 px-4 py-3'>
      <span
        aria-hidden='true'
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1",
          isManager
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : "bg-gray-50 text-gray-600 ring-gray-200",
        )}>
        {initials(member.name)}
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex min-w-0 items-center gap-2'>
          <p
            className='truncate text-sm font-medium text-gray-900'
            title={name}>
            {name}
          </p>
        </div>
        <p className='text-xs text-gray-500'>
          {isManager ? "Office manager" : "Office operator"}
        </p>
        <div className='mt-1.5 space-y-0.5 text-xs text-gray-600'>
          <a
            href={`mailto:${member.email}`}
            title={member.email}
            className='flex min-w-0 items-center gap-1.5 hover:text-emerald-700 hover:underline'>
            <Mail className='size-3.5 shrink-0 text-gray-400' />
            <span className='truncate'>{member.email}</span>
          </a>
          {member.contact_number && (
            <a
              href={`tel:${member.contact_number}`}
              className='flex items-center gap-1.5 hover:text-emerald-700 hover:underline'>
              <Phone className='size-3.5 shrink-0 text-gray-400' />
              {member.contact_number}
            </a>
          )}
        </div>
      </div>
    </li>
  );
};

// The office's manager and office operators, and how to reach them.
const OfficeMembers = ({ details }: { details: OfficeDetails }) => {
  const { office, manager, operators, canManage } = details;
  const { setParams } = useHandleParams();

  return (
    <section className='rounded-lg border bg-white p-4 sm:p-6'>
      <ProcessSectionHeader
        Icon={Users}
        title='Members'
        description={`${manager ? "A manager" : "No manager"} and ${plural(
          operators.length,
          "office operator",
        )}`}>
        {canManage && (
          <CustomButton
            text='Manage members'
            variant='outline'
            Icon={UserCog}
            onClick={() =>
              setParams({
                dialog: "manage-office-members",
                officeId: String(office.id),
                officeName: office.name,
              })
            }
          />
        )}
      </ProcessSectionHeader>

      {!manager && operators.length === 0 ? (
        <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-400'>
          No one is assigned to this office yet.
        </p>
      ) : (
        <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          {manager && (
            <MemberCard
              member={manager}
              isManager
            />
          )}
          {operators.map((operator) => (
            <MemberCard
              key={operator.id}
              member={operator}
              isManager={false}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export default OfficeMembers;
