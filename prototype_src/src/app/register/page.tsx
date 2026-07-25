"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Something went wrong");
      }

      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 pt-36">
      <Card className="w-full max-w-md glass rounded-[24px] p-2 shadow-xl">
        <CardHeader className="text-center pt-6 pb-2">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Enter your details below to create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground" htmlFor="name">Full Name</label>
              <Input id="name" placeholder="John Doe" {...register("name")} className="bg-background border-border focus-visible:ring-ring h-12 rounded-xl text-foreground placeholder:text-muted-foreground" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground" htmlFor="email">Email</label>
              <Input id="email" type="email" placeholder="name@example.com" {...register("email")} className="bg-background border-border focus-visible:ring-ring h-12 rounded-xl text-foreground placeholder:text-muted-foreground" />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground" htmlFor="password">Password</label>
              <Input id="password" type="password" {...register("password")} className="bg-background border-border focus-visible:ring-ring h-12 rounded-xl text-foreground" />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground" htmlFor="confirmPassword">Confirm Password</label>
              <Input id="confirmPassword" type="password" {...register("confirmPassword")} className="bg-background border-border focus-visible:ring-ring h-12 rounded-xl text-foreground" />
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>
            
            {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}
            
            <Button className="w-full bg-white text-zinc-900 border border-zinc-200 dark:border-transparent hover:bg-zinc-100 h-12 rounded-xl font-bold text-[15px] mt-2 shadow-sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
