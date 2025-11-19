import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPassword } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPassword>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPassword) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiRequest("POST", "/api/forgot-password", data);

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">CloudnotesAI</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered care assessment and team management
            </p>
          </div>

          <Card>
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-xl sm:text-2xl">Check your email</CardTitle>
              <CardDescription className="text-base">
                Password reset instructions sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="text-left">
                <Mail className="h-4 w-4" />
                <AlertDescription className="leading-relaxed">
                  If an account with that email exists, we've sent password reset instructions to your email address.
                  Please check your inbox and follow the link to reset your password.
                </AlertDescription>
              </Alert>

              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The reset link will expire in 1 hour for security reasons.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
              </div>

              <Link href="/auth">
                <Button className="w-full" data-testid="button-back-to-login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">CloudnotesAI</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered care assessment and team management
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-xl sm:text-2xl">Forgot your password?</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription data-testid="text-error-message">{error}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          {...field}
                          data-testid="input-email"
                          disabled={isLoading}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 text-base"
                  disabled={isLoading}
                  data-testid="button-send-reset-link"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center pt-2">
                  <Link href="/auth">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-11"
                      data-testid="link-back-to-login"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
