import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, UserPlus, Search, Edit, UserX, UserCheck, Trash2, Calendar, FileText, Shield, MoreHorizontal, Mail, Key, AtSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "team_member"]),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const localTeamSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  role: z.enum(["admin", "team_member"]),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type InviteForm = z.infer<typeof inviteSchema>;
type LocalTeamForm = z.infer<typeof localTeamSchema>;

const editMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "team_member"]),
});

type EditMemberForm = z.infer<typeof editMemberSchema>;


export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("team");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMember, setEditingMember] = useState<any>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [teamCreationMode, setTeamCreationMode] = useState<"invitation" | "local">("invitation");

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "team_member",
      firstName: "",
      lastName: "",
    },
  });

  const localTeamForm = useForm<LocalTeamForm>({
    resolver: zodResolver(localTeamSchema),
    defaultValues: {
      username: "",
      role: "team_member",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const editForm = useForm<EditMemberForm>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "team_member",
    },
  });


  // Fetch team members
  const { data: teamMembers = [], isLoading: isLoadingTeam } = useQuery<any[]>({
    queryKey: ["/api/admin/team-members"],
    enabled: user?.role === "admin",
  });

  // Fetch team members for dropdown (excludes admins)
  const { data: teamMembersOnly = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/team-members-only"],
    enabled: user?.role === "admin",
  });


  // Invite team member mutation
  const inviteMutation = useMutation({
    mutationFn: async (inviteData: InviteForm) => {
      const res = await apiRequest("POST", "/api/admin/invite", inviteData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members-only"] });
      inviteForm.reset();
      setShowInviteDialog(false);
      
      const invitationUrl = data.invitationUrl;
      const fullUrl = /^https?:\/\//.test(invitationUrl) 
        ? invitationUrl 
        : `${window.location.origin}${invitationUrl}`;
      
      toast({
        title: "Invitation sent!",
        description: `Invitation sent to ${data.email}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const localTeamMutation = useMutation({
    mutationFn: async (localTeamData: LocalTeamForm) => {
      const res = await apiRequest("POST", "/api/admin/create-local-team", localTeamData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members-only"] });
      localTeamForm.reset();
      setShowInviteDialog(false);
      
      toast({
        title: "Local team member created!",
        description: `User ${data.user.username} has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create local team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update team member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EditMemberForm }) => {
      const res = await apiRequest("PATCH", `/api/admin/team-member/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members-only"] });
      setEditingMember(null);
      toast({
        title: "Team member updated!",
        description: "The team member has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revoke access mutation
  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/revoke-access/${id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members-only"] });
      toast({
        title: "Access revoked!",
        description: "The team member's access has been revoked.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to revoke access",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Restore access mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/restore-access/${id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members-only"] });
      toast({
        title: "Access restored!",
        description: "The team member's access has been restored.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to restore access",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete member mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/team-member/${id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members-only"] });
      toast({
        title: "Team member deleted!",
        description: "The team member has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  if (user?.role !== "admin") {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access team management.</p>
          </div>
        </div>
      </div>
    );
  }

  const onInvite = (data: InviteForm) => {
    inviteMutation.mutate(data);
  };

  const onCreateLocal = (data: LocalTeamForm) => {
    localTeamMutation.mutate(data);
  };

  const onEditMember = (member: any) => {
    setEditingMember(member);
    editForm.reset({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      role: member.role || "team_member",
    });
  };

  const onUpdateMember = (data: EditMemberForm) => {
    if (editingMember) {
      updateMemberMutation.mutate({ id: editingMember.id, updates: data });
    }
  };


  const getStatusBadge = (member: any) => {
    if (member.isActive === 0) {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (member.invitationStatus === "accepted") {
      return <Badge variant="outline">Active</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };


  // Filter team members
  const filteredTeamMembers = teamMembers.filter(member =>
    (member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.username?.toLowerCase().includes(searchTerm.toLowerCase())) ?? false
  );


  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 md:pl-16 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">Manage your team members</p>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto" data-testid="button-invite-member">
                <UserPlus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Team Member</span>
                <span className="sm:hidden">Add Member</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Choose how to add a new team member to your organization.
                </DialogDescription>
              </DialogHeader>

              <Tabs value={teamCreationMode} onValueChange={(value) => setTeamCreationMode(value as "invitation" | "local")} className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                  <TabsTrigger value="invitation" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Invitation
                  </TabsTrigger>
                  <TabsTrigger value="local" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Local Team
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="invitation" className="space-y-4 overflow-y-auto flex-1">
                  <div className="text-sm text-muted-foreground mb-4">
                    Send an email invitation. The user will create their account by accepting the invitation.
                  </div>
                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit(onInvite)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={inviteForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={inviteForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="team_member">Team Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={inviteMutation.isPending} data-testid="button-send-invitation">
                      {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
              </TabsContent>

              <TabsContent value="local" className="space-y-4 overflow-y-auto flex-1">
                <div className="text-sm text-muted-foreground mb-4">
                  Create a local team member with username and password.
                </div>
                <Form {...localTeamForm}>
                  <form onSubmit={localTeamForm.handleSubmit(onCreateLocal)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={localTeamForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} data-testid="input-local-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={localTeamForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} data-testid="input-local-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={localTeamForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="johndoe" {...field} data-testid="input-username" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={localTeamForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={localTeamForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} data-testid="input-confirm-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={localTeamForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-local-role">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="team_member">Team Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={localTeamMutation.isPending} data-testid="button-create-local">
                        {localTeamMutation.isPending ? "Creating..." : "Create Local User"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList>
            <TabsTrigger value="team" data-testid="tab-team">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-6">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-team"
              />
            </div>

            {/* Users Table */}
            {isLoadingTeam ? (
              <div className="bg-card rounded-lg border">
                <div className="p-8 text-center">
                  <div className="animate-pulse space-y-3">
                    <div className="bg-muted h-6 w-full rounded"></div>
                    <div className="bg-muted h-6 w-full rounded"></div>
                    <div className="bg-muted h-6 w-full rounded"></div>
                  </div>
                </div>
              </div>
            ) : filteredTeamMembers.length === 0 ? (
              <div className="bg-card rounded-lg border">
                <div className="text-center py-12 px-4">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm ? "No team members found" : "No team members yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? "Try adjusting your search terms." : "Invite your first team member to get started."}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setShowInviteDialog(true)} data-testid="button-invite-first-member">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Team Member
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px] sm:w-[250px]">Name</TableHead>
                      <TableHead className="hidden md:table-cell">Role</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell min-w-[150px]">User Type</TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[120px]">Created/Invited</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeamMembers.map((member) => (
                      <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span data-testid={`text-member-name-${member.id}`}>
                              {member.firstName} {member.lastName}
                            </span>
                            {member.email && (
                              <span className="text-xs text-muted-foreground">{member.email}</span>
                            )}
                            {member.username && !member.email && (
                              <span className="text-xs text-muted-foreground">@{member.username}</span>
                            )}
                            {/* Mobile-only info */}
                            <div className="flex flex-wrap gap-2 md:hidden">
                              {getStatusBadge(member)}
                              <Badge variant={member.role === 'admin' ? 'default' : 'outline'} className="text-xs">
                                {member.role === 'admin' ? 'Admin' : 'Team Member'}
                              </Badge>
                              {member.username && !member.email ? (
                                <Badge variant="secondary" className="flex items-center gap-1 text-xs" data-testid={`badge-local-user-${member.id}`}>
                                  <Key className="h-3 w-3" />
                                  Local
                                </Badge>
                              ) : member.email && member.invitedAt ? (
                                <Badge variant="outline" className="flex items-center gap-1 text-xs" data-testid={`badge-invited-user-${member.id}`}>
                                  <Mail className="h-3 w-3" />
                                  Invited
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                            {member.role === 'admin' ? 'Admin' : 'Team Member'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getStatusBadge(member)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {member.username && !member.email ? (
                            <div className="flex items-center gap-2">
                              <Key className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Local User</span>
                            </div>
                          ) : member.email && member.invitedAt ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Invited User</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {member.invitedAt ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(member.invitedAt).toLocaleDateString()}
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                data-testid={`button-actions-${member.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditMember(member)} data-testid={`button-edit-${member.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {member.isActive === 1 && member.id !== user?.id && (
                                <DropdownMenuItem 
                                  onClick={() => revokeMutation.mutate(member.id)}
                                  data-testid={`button-revoke-${member.id}`}
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Revoke Access
                                </DropdownMenuItem>
                              )}
                              {member.isActive === 0 && (
                                <DropdownMenuItem 
                                  onClick={() => restoreMutation.mutate(member.id)}
                                  data-testid={`button-restore-${member.id}`}
                                >
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Restore Access
                                </DropdownMenuItem>
                              )}
                              {member.id !== user?.id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid={`button-delete-${member.id}`}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {member.firstName} {member.lastName}? This action cannot be undone and will permanently remove their account and any associated data.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => deleteMutation.mutate(member.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

        </Tabs>
      </main>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the team member's information and role.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onUpdateMember)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} data-testid="input-edit-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} data-testid="input-edit-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="team_member">Team Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateMemberMutation.isPending} data-testid="button-update-member">
                  {updateMemberMutation.isPending ? "Updating..." : "Update Member"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}