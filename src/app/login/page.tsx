"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin">("user");
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    const result = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
      role: role,
    });

    if (result?.error) {
      setError(result.error);
    } else {
      if (role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
      router.refresh();
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 pt-36">
      <Card className="w-full max-w-md glass rounded-[24px] p-2 shadow-xl">
        <CardHeader className="text-center pb-2 pt-6">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6">
            <div className="relative flex w-48 h-10 bg-muted/80 rounded-full p-1 border border-border">
              <div 
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-card border border-border/40 shadow-sm rounded-full transition-all duration-300 ease-in-out"
                style={{ left: role === "user" ? "4px" : "calc(50%)" }}
              />
              <button 
                type="button"
                onClick={() => setRole("user")}
                className={`relative z-10 flex-1 flex items-center justify-center text-sm font-bold transition-colors ${role === "user" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                User
              </button>
              <button 
                type="button"
                onClick={() => setRole("admin")}
                className={`relative z-10 flex-1 flex items-center justify-center text-sm font-bold transition-colors ${role === "admin" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground" htmlFor="email">Email</label>
              <Input id="email" type="email" placeholder="name@example.com" {...register("email")} className="bg-background border-border focus-visible:ring-ring h-12 rounded-xl text-foreground placeholder:text-muted-foreground" />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none text-foreground" htmlFor="password">Password</label>
              </div>
              <Input id="password" type="password" {...register("password")} className="bg-background border-border focus-visible:ring-ring h-12 rounded-xl text-foreground" />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            
            {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}
            
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl font-bold text-[15px] shadow-sm transition-all" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-foreground hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
