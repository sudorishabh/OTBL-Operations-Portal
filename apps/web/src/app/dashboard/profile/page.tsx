"use client";

import { PageWrapper } from "@/components/wrapper/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form } from "@/components/ui/form";
import Input from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { useAuthContext } from "@/contexts/AuthContext";
import { userSchemas, type userTypes } from "@pkg/schema";
import { capitalFirstLetter } from "@pkg/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Shield,
  User,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatJoinedAt(value: Date | string | null | undefined) {
  if (value == null) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfilePage() {
  const { refetchUser } = useAuthContext();
  const { handleError } = useApiError();
  const trpcUtils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { data: profile, isLoading } = trpc.userQuery.me.useQuery(undefined, {
    retry: false,
  });

  const profileForm = useForm<userTypes.UpdateUserType>({
    resolver: zodResolver(userSchemas.updateUserSchema),
    defaultValues: {
      id: 0,
      name: "",
      email: "",
      contact_number: "",
      role: "office_operator",
    },
  });

  const passwordForm = useForm<userTypes.UpdateUserPasswordType>({
    resolver: zodResolver(userSchemas.updateUserPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    profileForm.reset({
      id: profile.id,
      name: profile.name ?? "",
      email: profile.email ?? "",
      contact_number: profile.contact_number ?? "",
      role: profile.role as userTypes.CreateUserType["role"],
    });
  }, [profile, profileForm]);

  const updateProfile = trpc.userMutation.updateUserByAdmin.useMutation({
    onSuccess: async () => {
      toast.success("Profile updated");
      setEditing(false);
      await trpcUtils.userQuery.me.invalidate();
      refetchUser();
    },
    onError: (error: any) => handleError(error, { showToast: true }),
  });

  const changePassword = trpc.userMutation.updateUserPassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed");
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => handleError(error, { showToast: true }),
  });

  const handleCancelEdit = () => {
    if (profile) {
      profileForm.reset({
        id: profile.id,
        name: profile.name ?? "",
        email: profile.email ?? "",
        contact_number: profile.contact_number ?? "",
        role: profile.role as userTypes.CreateUserType["role"],
      });
    }
    setEditing(false);
  };

  if (isLoading || !profile) {
    return (
      <PageWrapper
        title='Profile'
        description='View and update your account details'>
        <div className='mt-6 max-w-2xl space-y-3'>
          <Skeleton className='h-28 w-full rounded-xl' />
          <Skeleton className='h-56 w-full rounded-xl' />
          <Skeleton className='h-52 w-full rounded-xl' />
        </div>
      </PageWrapper>
    );
  }

  const isActive = profile.status === "active";

  return (
    <PageWrapper
      title='Profile'
      description='View and update your account details'>
      <div className='mt-6 flex max-w-2xl flex-col gap-4'>

        <Card className='shadow-sm border-cyan-900/10'>
          <CardContent className='p-5'>
            <div className='flex items-center gap-4'>
              <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-800 text-white text-lg font-bold select-none'>
                {getInitials(profile.name)}
              </div>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-base font-semibold text-cyan-900'>
                  {capitalFirstLetter(profile.name)}
                </p>
                <div className='mt-1 flex flex-wrap items-center gap-1.5'>
                  <Badge
                    variant='outline'
                    className='h-5 px-1.5 text-[10px] capitalize font-medium border-cyan-900/20 text-cyan-800'>
                    {profile.role}
                  </Badge>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className={cn(
                      "h-5 px-1.5 text-[10px] font-medium",
                      isActive && "bg-green-600 hover:bg-green-700 border-transparent",
                    )}>
                    {profile.status}
                  </Badge>
                </div>
              </div>
              <div className='hidden sm:flex flex-col items-end text-right shrink-0'>
                <p className='text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                  Member since
                </p>
                <p className='mt-0.5 text-xs font-medium text-cyan-900'>
                  {formatJoinedAt(profile.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5'>
            Account details
          </p>
          <Card className='shadow-sm border-cyan-900/10'>
            <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0 px-5 pt-4 pb-3'>
              <div>
                <CardTitle className='text-sm font-semibold text-cyan-900'>
                  Personal information
                </CardTitle>
                <CardDescription className='text-xs mt-0.5'>
                  Your name, email, and contact number as stored in OTBL.
                </CardDescription>
              </div>
              {!editing && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 shrink-0 gap-1.5 px-2.5 text-xs border-cyan-900/20 text-cyan-800 hover:bg-cyan-50 hover:border-cyan-900/30'
                  onClick={() => setEditing(true)}>
                  <Pencil className='h-3 w-3' />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className='px-5 pb-5'>
              {!editing ? (
                <div className='space-y-0 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/50 overflow-hidden'>
                  <InfoRow icon={User} label='Name' value={capitalFirstLetter(profile.name)} />
                  <InfoRow icon={Mail} label='Email' value={profile.email} />
                  <InfoRow
                    icon={Phone}
                    label='Contact'
                    value={profile.contact_number?.trim() || "—"}
                  />
                  <InfoRow
                    icon={Calendar}
                    label='Member since'
                    value={formatJoinedAt(profile.created_at)}
                    className='sm:hidden'
                  />
                </div>
              ) : (
                <Form {...profileForm}>
                  <form
                    onSubmit={profileForm.handleSubmit((values) =>
                      updateProfile.mutate({ ...values, password: undefined }),
                    )}
                    className='space-y-4'>
                    <Input
                      control={profileForm.control}
                      fieldName='name'
                      Label='Name'
                      LabelIcon={User}
                      placeholder='Your name'
                    />
                    <Input
                      control={profileForm.control}
                      fieldName='email'
                      Label='Email'
                      LabelIcon={Mail}
                      type='email'
                      placeholder='Email address'
                    />
                    <Input
                      control={profileForm.control}
                      fieldName='contact_number'
                      Label='Contact number'
                      LabelIcon={Phone}
                      type='tel'
                      placeholder='Mobile number'
                      optional
                    />
                    <p className='text-xs text-muted-foreground'>
                      Role and account status can only be changed by an administrator.
                    </p>
                    <div className='flex justify-end gap-2 pt-1'>
                      <CustomButton
                        text='Cancel'
                        type='button'
                        variant='outline'
                        onClick={handleCancelEdit}
                      />
                      <CustomButton
                        text='Save changes'
                        type='submit'
                        variant='primary'
                        disableForViewer
                      />
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <p className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5'>
            Security
          </p>
          <Card className='shadow-sm border-cyan-900/10'>
            <CardHeader className='px-5 pt-4 pb-3'>
              <CardTitle className='flex items-center gap-2 text-sm font-semibold text-cyan-900'>
                <KeyRound className='h-4 w-4' />
                Change password
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Use a strong password you do not reuse on other sites.
              </CardDescription>
            </CardHeader>
            <CardContent className='px-5 pb-5'>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit((values) =>
                    changePassword.mutate(values),
                  )}
                  className='space-y-4'>
                  <Input
                    control={passwordForm.control}
                    fieldName='currentPassword'
                    Label='Current password'
                    LabelIcon={Shield}
                    type='password'
                    placeholder='Current password'
                  />
                  <Input
                    control={passwordForm.control}
                    fieldName='newPassword'
                    Label='New password'
                    LabelIcon={KeyRound}
                    type={showNewPassword ? "text" : "password"}
                    placeholder='New password'
                    inputIconButton={{
                      icon: showNewPassword ? EyeOff : Eye,
                      onClick: () => setShowNewPassword((s) => !s),
                    }}
                  />
                  <Input
                    control={passwordForm.control}
                    fieldName='confirmPassword'
                    Label='Confirm new password'
                    LabelIcon={KeyRound}
                    type={showNewPassword ? "text" : "password"}
                    placeholder='Confirm new password'
                  />
                  <div className='flex justify-end pt-1'>
                    <CustomButton
                      text='Update password'
                      type='submit'
                      variant='primary'
                      disableForViewer
                    />
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

      </div>
    </PageWrapper>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", className)}>
      <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-900/8 text-cyan-800'>
        <Icon className='h-3.5 w-3.5' />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {label}
        </p>
        <p className='mt-0.5 truncate text-sm font-medium text-cyan-900'>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}
