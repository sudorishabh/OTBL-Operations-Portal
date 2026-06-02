"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useApiError } from "@/hooks/useApiError";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSchemas, type authTypes } from "@pkg/schema";

const LoginForm = () => {
  const router = useRouter();
  const { setUser } = useAuthContext();
  const { handleError } = useApiError();

  const form = useForm<authTypes.loginType>({
    resolver: zodResolver(authSchemas.loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = trpc.authMutation.login.useMutation({
    onSuccess: (data: { user: User }) => {
      router.push("/dashboard");
      setUser(data.user);
    },
    onError: (error: unknown) => {
      handleError(error, { showToast: true });
    },
  });

  type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };

  const onSubmit = (data: authTypes.loginType) => {
    loginMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-5'>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-gray-700 dark:text-gray-300 font-medium'>
                Email Address
              </FormLabel>
              <FormControl>
                <Input
                  type='email'
                  placeholder='your.email@example.com'
                  className='h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-gray-700 dark:text-gray-300 font-medium'>
                Password
              </FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='f3#••••••••'
                  className='h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type='submit'
          className='w-full mt-6 h-11 bg-emerald-600 hover:bg-emerald-700/90 cursor-pointer text-white shadow-md transition-colors duration-200 font-medium'
          size='lg'>
          Sign In
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;
