"use client";
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
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSchemas, type authTypes } from "@pkg/schema";

// Where to go once signed in: the page that sent the user here, if it is one
// of the app's own, else the dashboard.
const useReturnUrl = () => {
  const returnUrl = useSearchParams().get("return-url");
  return returnUrl?.startsWith("/") && !returnUrl.startsWith("//")
    ? returnUrl
    : "/dashboard";
};

// Signs in with Better Auth, which sets the session cookie the API reads.
const LoginForm = () => {
  const router = useRouter();
  const returnUrl = useReturnUrl();
  const utils = trpc.useUtils();
  const { user, isUserLoading } = useAuthContext();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const form = useForm<authTypes.loginType>({
    resolver: zodResolver(authSchemas.loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Someone already signed in has no need of this page.
  useEffect(() => {
    if (!isUserLoading && user) router.replace(returnUrl);
  }, [isUserLoading, user, router, returnUrl]);

  const onSubmit = async (data: authTypes.loginType) => {
    setIsSigningIn(true);
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setIsSigningIn(false);
      toast.error(
        authErrorMessage(error, "Couldn't sign in. Please try again."),
      );
      return;
    }
    // Everything loaded so far was for no one; start afresh as this user.
    await utils.invalidate();
    router.push(returnUrl);
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
                  autoComplete='username'
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
                  autoComplete='current-password'
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
          size='lg'
          disabled={isSigningIn}>
          {isSigningIn ? "Signing in…" : "Sign In"}
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;
