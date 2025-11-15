import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPassword } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Extract token from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  // Fetch user details from token
  const { data: userData, isLoading, error } = useQuery<{ email: string; firstName?: string }>({
    queryKey: [`/api/reset-password/${token}`],
    enabled: !!token,
    retry: false,
  });

  const form = useForm<ResetPassword>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || "",
      password: "",
      confirmPassword: "",
    },
  });

  // Update token in form when it changes
  useEffect(() => {
    if (token) {
      form.setValue("token", token);
    }
  }, [token, form]);

  const onSubmit = async (data: ResetPassword) => {
    setIsSubmitting(true);

    try {
      await apiRequest("POST", "/api/reset-password", data);

      setIsSuccess(true);

      toast({
        title: "Password reset successful!",
        description: "Your password has been updated. You can now log in with your new password.",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        setLocation("/auth");
      }, 2000);
    } catch (err: any) {
      toast({
        title: "Password reset failed",
        description: err.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while validating token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">CloudnotesAI</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              AI-powered care assessment and team management
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-center text-muted-foreground">Validating reset token...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error if token is invalid or expired
  if (!token || error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">CloudnotesAI</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              AI-powered care assessment and team management
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Invalid Reset Link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription data-testid="text-error-message">
                  {error ? "The reset token has expired or is invalid." : "No reset token provided."}
                  Please request a new password reset link.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => setLocation("/forgot-password")}
                className="w-full"
                data-testid="button-request-new-link"
              >
                Request New Reset Link
              </Button>

              <Button
                onClick={() => setLocation("/auth")}
                variant="ghost"
                className="w-full"
                data-testid="button-back-to-login"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show success message after password reset
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">CloudnotesAI</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              AI-powered care assessment and team management
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Password Reset Successful!</CardTitle>
              <CardDescription>
                Your password has been updated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>

              <Alert>
                <AlertDescription data-testid="text-success-message">
                  Your password has been successfully reset. You can now log in with your new password.
                </AlertDescription>
              </Alert>

              <p className="text-center text-sm text-muted-foreground">
                Redirecting to login page...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">CloudnotesAI</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-powered care assessment and team management
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              {userData?.email && `Resetting password for ${userData.email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password (min. 6 characters)"
                          {...field}
                          data-testid="input-password"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your new password"
                          {...field}
                          data-testid="input-confirm-password"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-reset-password"
                >
                  {isSubmitting ? "Resetting Password..." : "Reset Password"}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setLocation("/auth")}
                    data-testid="link-back-to-login"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
