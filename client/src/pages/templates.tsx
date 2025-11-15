import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileCode, Plus, Settings, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Template } from "@shared/schema";

export default function Templates() {
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingSections, setEditingSections] = useState<string[]>([]);
  const [editingSection, setEditingSection] = useState<{index: number, name: string} | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  // Settings state
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingStatus, setEditingStatus] = useState('active');
  const [editingPriority, setEditingPriority] = useState('standard');
  const { toast } = useToast();

  // Fetch templates from API
  const { data: templates, isLoading } = useQuery({
    queryKey: ["/api/templates"],
  });

  const handleCustomize = (template: Template) => {
    setSelectedTemplate(template);
    setEditingSections([...template.sections]);
    setShowCustomizeDialog(true);
  };

  const handleSettings = (template: Template) => {
    setSelectedTemplate(template);
    setEditingName(template.name);
    setEditingDescription(template.description || '');
    setEditingStatus(template.status);
    setEditingPriority(template.priority || 'standard');
    setShowSettingsDialog(true);
  };

  const handleNewTemplate = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Template creation functionality will be available in a future update.",
    });
  };

  const handleEditSection = (index: number, currentName: string) => {
    setEditingSection({ index, name: currentName });
  };

  const handleSaveEdit = () => {
    if (editingSection && editingSection.name.trim()) {
      const newSections = [...editingSections];
      newSections[editingSection.index] = editingSection.name.trim();
      setEditingSections(newSections);
      setEditingSection(null);
      toast({
        title: "Section updated",
        description: "The section name has been updated successfully.",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
  };

  const handleRemoveSection = (index: number, sectionName: string) => {
    const newSections = editingSections.filter((_, i) => i !== index);
    setEditingSections(newSections);
    toast({
      title: "Section removed",
      description: `"${sectionName}" has been removed from the template.`,
    });
  };

  const handleAddSection = () => {
    if (newSectionName.trim()) {
      setEditingSections([...editingSections, newSectionName.trim()]);
      setNewSectionName('');
      setShowAddSection(false);
      toast({
        title: "Section added",
        description: `"${newSectionName.trim()}" has been added to the template.`,
      });
    }
  };

  // Mutation for updating template
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { id: string; sections: string[] }) => {
      const response = await apiRequest("PATCH", `/api/templates/${data.id}`, {
        sections: data.sections,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Changes saved",
        description: "Template customizations have been saved successfully.",
      });
      setShowCustomizeDialog(false);
      setEditingSection(null);
      setShowAddSection(false);
      setNewSectionName('');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save changes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating template settings
  const updateTemplateSettingsMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string; status: string; priority: string }) => {
      const response = await apiRequest("PATCH", `/api/templates/${data.id}`, {
        name: data.name,
        description: data.description,
        status: data.status,
        priority: data.priority,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Settings saved",
        description: "Template settings have been updated successfully.",
      });
      setShowSettingsDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    if (selectedTemplate) {
      updateTemplateSettingsMutation.mutate({
        id: selectedTemplate.id,
        name: editingName,
        description: editingDescription,
        status: editingStatus,
        priority: editingPriority,
      });
    }
  };

  const handleSaveChanges = () => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({
        id: selectedTemplate.id,
        sections: editingSections,
      });
    }
  };

  const handleCloseCustomizeDialog = () => {
    setShowCustomizeDialog(false);
    setEditingSection(null);
    setShowAddSection(false);
    setNewSectionName('');
    // Reset to original sections
    if (selectedTemplate) {
      setEditingSections([...selectedTemplate.sections]);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 md:pl-16 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Templates</h1>
            <p className="text-sm text-muted-foreground">Manage assessment templates and customize evaluation criteria</p>
          </div>
          <Button onClick={handleNewTemplate} className="w-full sm:w-auto" data-testid="button-new-template">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 space-y-6">
        
        {/* Current Templates */}
        <div>
          <h2 className="text-base sm:text-lg font-medium text-foreground mb-3 sm:mb-4">Assessment Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {isLoading ? (
              // Loading skeleton
              [...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="bg-muted h-6 w-3/4 rounded mb-2"></div>
                    <div className="bg-muted h-4 w-1/2 rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted h-4 w-full rounded mb-2"></div>
                    <div className="bg-muted h-4 w-2/3 rounded mb-4"></div>
                    <div className="flex gap-2">
                      <div className="bg-muted h-8 w-20 rounded"></div>
                      <div className="bg-muted h-8 w-20 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              (templates as Template[] || []).map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                      {template.status === 'active' ? 'Active' : 
                       template.status === 'draft' ? 'Draft' : 
                       template.status === 'archived' ? 'Archived' : 'Coming Soon'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {template.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">Assessment Sections:</h4>
                      <div className="flex flex-wrap gap-2">
                        {template.sections.map((section) => (
                          <Badge key={section} variant="outline" className="text-xs">
                            {section}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      {template.status === 'active' ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCustomize(template)}
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Customize
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSettings(template)}
                            data-testid={`button-settings-template-${template.id}`}
                          >
                            <Settings className="mr-1 h-3 w-3" />
                            Settings
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" disabled>
                            {template.status === 'draft' ? 'Draft' : 'Available Soon'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSettings(template)}
                            data-testid={`button-settings-template-${template.id}`}
                          >
                            <Settings className="mr-1 h-3 w-3" />
                            Settings
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))
            )}
          </div>
        </div>

        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle>About Assessment Templates</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-muted-foreground">
              Assessment templates define the structure and content of AI-generated care reports. Each template 
              includes specific sections and evaluation criteria tailored to different types of care assessments.
            </p>
            
            <div className="mt-4">
              <h4 className="font-medium text-foreground mb-2">Template Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Customizable assessment sections and criteria</li>
                <li>• AI prompt optimization for specific care types</li>
                <li>• Standardized reporting formats</li>
                <li>• Integration with case management workflows</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Customize Template Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={handleCloseCustomizeDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Customize Template: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Modify the assessment sections and evaluation criteria for this template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div>
              <h4 className="font-medium mb-2">Current Sections:</h4>
              <div className="space-y-2">
                {editingSections.map((section: string, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    {editingSection?.index === index ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingSection.name}
                          onChange={(e) => setEditingSection({...editingSection, name: e.target.value})}
                          className="flex-1 p-1 border rounded text-sm"
                          autoFocus
                        />
                        <Button variant="outline" size="sm" onClick={handleSaveEdit}>
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm">{section}</span>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditSection(index, section)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRemoveSection(index, section)}
                          >
                            Remove
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Add Section */}
            {showAddSection ? (
              <div className="flex items-center gap-2 p-2 border rounded bg-muted">
                <input
                  type="text"
                  placeholder="Enter section name..."
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="flex-1 p-1 border rounded text-sm"
                  autoFocus
                />
                <Button variant="outline" size="sm" onClick={handleAddSection}>
                  Add
                </Button>
                <Button variant="outline" size="sm" onClick={() => {setShowAddSection(false); setNewSectionName('');}}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddSection(true)}>
                  Add Section
                </Button>
                <Button onClick={handleSaveChanges}>Save Changes</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Template Settings: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Configure general settings for this assessment template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <input 
                type="text"
                className="w-full p-2 border rounded" 
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Status</label>
              <select 
                className="w-full p-2 border rounded"
                value={editingStatus}
                onChange={(e) => setEditingStatus(e.target.value)}
                data-testid="select-template-status"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea 
                className="w-full p-2 border rounded" 
                rows={3}
                value={editingDescription}
                onChange={(e) => setEditingDescription(e.target.value)}
                data-testid="textarea-template-description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Processing Priority</label>
              <select 
                className="w-full p-2 border rounded"
                value={editingPriority}
                onChange={(e) => setEditingPriority(e.target.value)}
                data-testid="select-ai-priority"
              >
                <option value="standard">Standard</option>
                <option value="high">High Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Controls the priority level for AI processing of assessments using this template.
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowSettingsDialog(false)}
                data-testid="button-cancel-settings"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSettings}
                disabled={updateTemplateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateTemplateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}