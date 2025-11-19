import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect, useLocation, Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { acceptInvitationSchema } from "@shared/schema";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;
type AcceptInvitationForm = z.infer<typeof acceptInvitationSchema>;

export default function AuthPage() {
  const { user, loginMutation, acceptInvitationMutation } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  
  // Extract token from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const invitationToken = urlParams.get('token');
  const isInvitationFlow = !!invitationToken;

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const invitationForm = useForm<AcceptInvitationForm>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      token: invitationToken || "",
      password: "",
      confirmPassword: "",
    },
  });

  // Fetch invitation details if token is provided
  const { data: invitationData, isLoading: isLoadingInvitation, error: invitationError } = useQuery<any>({
    queryKey: [`/api/invitation/${invitationToken}`],
    enabled: !!invitationToken,
    retry: false,
  });

  // Update form token when it changes
  useEffect(() => {
    if (invitationToken) {
      invitationForm.setValue('token', invitationToken);
    }
  }, [invitationToken, invitationForm]);

  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  // Show error if invitation is invalid
  if (isInvitationFlow && invitationError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/auth'} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onAcceptInvitation = (data: AcceptInvitationForm) => {
    acceptInvitationMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Account created successfully!",
          description: "You can now log in with your new credentials.",
        });
        // Redirect to login after successful invitation acceptance
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
      }
    });
  };

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
            <CardTitle>
              {isInvitationFlow ? "Accept Invitation" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isInvitationFlow 
                ? "Set up your account to get started" 
                : "Sign in to CloudnotesAI to continue"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isInvitationFlow ? (
              // Invitation acceptance form
              <>
                {isLoadingInvitation ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading invitation details...</p>
                  </div>
                ) : (
                  <>
                    {invitationData && (
                      <div className="mb-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">You've been invited to join as:</p>
                        <p className="font-medium">
                          {invitationData.firstName} {invitationData.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{invitationData.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Role: {invitationData.role === 'admin' ? 'Administrator' : 'Team Member'}
                        </p>
                      </div>
                    )}
                    
                    <Form {...invitationForm}>
                      <form onSubmit={invitationForm.handleSubmit(onAcceptInvitation)} className="space-y-4">
                        <FormField
                          control={invitationForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Create a secure password"
                                  {...field}
                                  data-testid="input-invitation-password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={invitationForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Confirm your password"
                                  {...field}
                                  data-testid="input-confirm-invitation-password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={acceptInvitationMutation.isPending}
                          data-testid="button-accept-invitation"
                        >
                          {acceptInvitationMutation.isPending ? "Creating Account..." : "Accept Invitation & Create Account"}
                        </Button>
                      </form>
                    </Form>
                  </>
                )}
              </>
            ) : (
              // Login form
              <>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="identifier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email or Username</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder="admin@audionotesai.com or username" 
                              {...field}
                              data-testid="input-identifier"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Enter your password"
                                {...field}
                                data-testid="input-password"
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                    <line x1="2" y1="2" x2="22" y2="22"/>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                  </svg>
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="text-right">
                      <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                        Forgot Password?
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}