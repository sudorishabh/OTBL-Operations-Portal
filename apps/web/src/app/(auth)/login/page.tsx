import React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import LoginBgEffect from "@/components/login/login-bg-effect";
import LoginForm from "@/components/login/login-form";

const LoginPage = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950 p-4 relative overflow-hidden'>
      <LoginBgEffect />
      <div className='relative z-10 w-full max-w-md mx-auto space-y-6'>
        <div className='text-center space-y-3'>
          <div className='inline-flex items-center'>
            <Image
              src='/Otbl-logo_transparent.png'
              alt='OTBL Logo'
              width={112}
              height={64}
              className='h-16 w-28 object-contain'
              priority
            />
          </div>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-emerald-800 dark:text-gray-100'>
              ONGC TERI Biotech Limited
            </h1>
            <p className='text-gray-600 dark:text-gray-400'>
              Management System Portal
            </p>
          </div>
        </div>

        <Card className='border-0 shadow-md bg-white dark:bg-gray-900'>
          <CardHeader className='text-center pb-6'>
            <CardTitle className='text-xl text-gray-700 dark:text-gray-100'>
              Welcome Back
            </CardTitle>
            <CardDescription className='text-sm'>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <div className='text-center text-xs text-gray-500 dark:text-gray-400'>
          <p>© {new Date().getFullYear()} OTBL. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
