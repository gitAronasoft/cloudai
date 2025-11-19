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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Case } from "@shared/schema";
import { UserCheck, Mail } from "lucide-react";

const assignmentFormSchema = z.object({
  assignedTo: z.string().min(1, "Please select a team member"),
  notes: z.string().optional(),
});

type AssignmentFormData = z.infer<typeof assignmentFormSchema>;

interface CaseAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  caseData: Case | null;
}

export function CaseAssignmentDialog({ open, onClose, caseData }: CaseAssignmentDialogProps) {
  const { toast } = useToast();
  const [sendEmail, setSendEmail] = useState(true);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      assignedTo: caseData?.assignedTo || "",
      notes: "",
    },
  });

  // Fetch team members (excluding admins)
  const { data: teamMembers, isLoading: loadingTeamMembers } = useQuery({
    queryKey: ["/api/admin/team-members-only"],
  });

  const assignCaseMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const response = await apiRequest("POST", `/api/cases/${caseData?.id}/assign`, {
        assignedTo: data.assignedTo,
        sendEmail: sendEmail,
      });
      return response.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });

      const selectedMember = (teamMembers as User[] || []).find(
        (member) => member.id === form.getValues("assignedTo")
      );

      const emailNotification = response.emailSent ? " and email notification sent" : "";
      
      toast({
        title: "Case assigned successfully",
        description: `Case for ${caseData?.clientName} has been assigned to ${selectedMember?.firstName} ${selectedMember?.lastName}${emailNotification}.`,
      });

      form.reset();
      setSendEmail(true);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign case",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: AssignmentFormData) => {
    assignCaseMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setSendEmail(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            <UserCheck className="h-5 w-5" />
            Assign Case
          </DialogTitle>
        </DialogHeader>

        {caseData && (
          <div className="bg-muted p-3 rounded-lg mb-4">
            <h4 className="font-medium">Case Details</h4>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium">Client:</span> {caseData.clientName}
            </p>
            {caseData.address && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Address:</span> {caseData.address}
              </p>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Member *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-assign-member">
                        <SelectValue placeholder="Select team member to assign" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingTeamMembers ? (
                        <SelectItem value="loading" disabled>
                          Loading team members...
                        </SelectItem>
                      ) : (
                        (teamMembers as User[] || []).map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium">
                                  {member.firstName} {member.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignment Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any specific instructions or notes for this assignment (optional)"
                      className="min-h-[80px]"
                      data-testid="textarea-assignment-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email notification option */}
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <input
                type="checkbox"
                id="send-email"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                data-testid="checkbox-send-email"
              />
              <Mail className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="send-email" className="text-sm">
                Send email notification to assigned team member
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-assignment"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignCaseMutation.isPending}
                data-testid="button-assign-case"
              >
                {assignCaseMutation.isPending ? "Assigning..." : "Assign Case"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}