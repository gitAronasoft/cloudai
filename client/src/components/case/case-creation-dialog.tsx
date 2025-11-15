import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

const caseFormSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  address: z.string().optional(),
  caseDetails: z.string().optional(),
  assignedTo: z.string().optional(),
});

type CaseFormData = z.infer<typeof caseFormSchema>;

interface CaseCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (caseData: any) => void;
}

export function CaseCreationDialog({ open, onClose, onSuccess }: CaseCreationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignNow, setAssignNow] = useState(false);

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      clientName: "",
      address: "",
      caseDetails: "",
      assignedTo: "",
    },
  });

  // Fetch team members for assignment (admin only)
  const { data: teamMembers } = useQuery({
    queryKey: ["/api/admin/team-members-only"],
    enabled: user?.role === "admin" && assignNow,
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: CaseFormData) => {
      // For admins, use the admin endpoint with assignment options
      // For team members, use the team member endpoint with auto-assignment
      if (user?.role === "admin") {
        // Only send assignedTo if assignNow is checked and a member is selected
        const assignedToValue = assignNow && data.assignedTo && data.assignedTo.trim() !== '' 
          ? data.assignedTo 
          : null;
        
        const response = await apiRequest("POST", "/api/admin/cases", {
          clientName: data.clientName,
          address: data.address || null,
          caseDetails: data.caseDetails || null,
          assignedTo: assignedToValue,
        });
        return response.json();
      } else {
        // Team member creates case with auto-assignment
        const response = await apiRequest("POST", "/api/cases", {
          clientName: data.clientName,
          address: data.address || null,
          caseDetails: data.caseDetails || null,
        });
        return response.json();
      }
    },
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Case created successfully",
        description: `Case for ${newCase.clientName} has been created.`,
      });
      if (onSuccess) {
        onSuccess(newCase);
      }
      form.reset();
      setAssignNow(false);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create case",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CaseFormData) => {
    // Validate assignment when checkbox is checked
    if (assignNow && (!data.assignedTo || data.assignedTo.trim() === '')) {
      toast({
        title: "Assignment required",
        description: "Please select a team member to assign the case to, or uncheck the assignment option.",
        variant: "destructive",
      });
      return;
    }
    
    createCaseMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setAssignNow(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create New Case</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter client name"
                      data-testid="input-client-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter client address (optional)"
                      data-testid="input-address"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="caseDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter case details or notes (optional)"
                      className="min-h-[80px]"
                      data-testid="textarea-case-details"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignment section - Admin only */}
            {user?.role === "admin" && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="assign-now"
                    checked={assignNow}
                    onChange={(e) => {
                      setAssignNow(e.target.checked);
                      if (!e.target.checked) {
                        form.setValue('assignedTo', '');
                      }
                    }}
                    data-testid="checkbox-assign-now"
                  />
                  <label htmlFor="assign-now" className="text-sm">
                    Assign to team member now
                  </label>
                </div>

                {assignNow && (
                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Team Member</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-team-member">
                              <SelectValue placeholder="Select team member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(teamMembers as User[] || []).map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.firstName} {member.lastName} ({member.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-case"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCaseMutation.isPending}
                data-testid="button-create-case"
              >
                {createCaseMutation.isPending ? "Creating..." : "Create Case"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}