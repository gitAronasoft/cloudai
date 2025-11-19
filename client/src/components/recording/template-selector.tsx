import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Heart, Stethoscope, Users, ChevronRight } from "lucide-react";

interface TemplateSelectorProps {
  open: boolean;
  onSelectTemplate: (template: string) => void;
  onCancel: () => void;
  fileName?: string;
}

const templates = [
  {
    id: "general",
    name: "General Assessment",
    description: "Standard assessment for general care evaluations and routine check-ins",
    icon: FileText,
    color: "text-blue-600"
  },
  {
    id: "care-assessment",
    name: "Care Assessment", 
    description: "Comprehensive care evaluation including nutrition, hygiene, and home environment",
    icon: Heart,
    color: "text-green-600"
  },
  {
    id: "medical",
    name: "Medical Review",
    description: "Medical-focused assessment for health status and medication reviews",
    icon: Stethoscope,
    color: "text-red-600"
  },
  {
    id: "family-meeting",
    name: "Family Meeting",
    description: "Family conference and care planning discussions",
    icon: Users,
    color: "text-purple-600"
  }
];

export function TemplateSelector({ open, onSelectTemplate, onCancel, fileName }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("general");

  const handleContinue = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="w-full max-w-2xl mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            Select Assessment Template
          </DialogTitle>
          {fileName && (
            <p className="text-sm text-muted-foreground">
              Processing: {fileName}
            </p>
          )}
        </DialogHeader>
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Choose the template that best matches your recording. This will help the AI generate more accurate and relevant assessment reports.
          </p>

          <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <div className="space-y-3">
              {templates.map((template) => {
                const Icon = template.icon;
                return (
                  <div key={template.id} className="flex items-start space-x-3">
                    <RadioGroupItem
                      value={template.id}
                      id={template.id}
                      className="mt-1"
                      data-testid={`radio-template-${template.id}`}
                    />
                    <Label
                      htmlFor={template.id}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                        <Icon className={`h-5 w-5 mt-0.5 ${template.color}`} />
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel-template"
            >
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedTemplate}
              data-testid="button-continue-template"
            >
              Continue Processing
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}