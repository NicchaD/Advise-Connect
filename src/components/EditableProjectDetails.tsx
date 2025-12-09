import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Edit, Save, X, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectData {
  projectId?: string;
  projectName?: string;
  accountName?: string;
  projectOwningUnit?: string;
  projectPM?: string;
  projectPOCEmail?: string;
  projectDomain?: string;
  projectType?: string;
  deliveryExcellencePOC?: string;
  los?: string;
  vertical?: string;
  businessUnit?: string;
  marketUnit?: string;
  [key: string]: any;
}

interface EditableProjectDetailsProps {
  requestId: string;
  projectData: ProjectData;
  onUpdate: (updatedData: ProjectData) => void;
}

export const EditableProjectDetails: React.FC<EditableProjectDetailsProps> = ({
  requestId,
  projectData,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ProjectData>(projectData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEditedData(projectData || {});
  }, [projectData]);

  const readOnlyFields = ['projectId', 'projectName', 'accountName'];
  
  // Essential fields that are always visible
  const essentialFields = ['projectId', 'accountName', 'projectPM'];
  
  const fieldLabels: Record<string, string> = {
    projectId: 'Project ID',
    projectName: 'Project Name',
    accountName: 'Account Name',
    projectOwningUnit: 'Owning Unit',
    projectPM: 'Project Manager',
    projectPOCEmail: 'POC Email',
    projectDomain: 'Domain',
    projectType: 'Type',
    deliveryExcellencePOC: 'Delivery Excellence POC',
    los: 'Line of Service',
    vertical: 'Vertical',
    businessUnit: 'Business Unit',
    marketUnit: 'Market Unit'
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          project_data: editedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      onUpdate(editedData);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Project details updated successfully"
      });
    } catch (error) {
      console.error('Error updating project details:', error);
      toast({
        title: "Error",
        description: "Failed to update project details",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData(projectData || {});
    setIsEditing(false);
  };

  const renderField = (key: string, value: any) => {
    const isReadOnly = readOnlyFields.includes(key);
    const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').trim();
    const displayValue = String(value) || '';

    if (!isEditing) {
      return (
        <div key={key} className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border/50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {label}
            </p>
            <p className="font-semibold text-foreground break-words">
              {displayValue || 'Not provided'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key} className="text-sm font-medium">
          {label}
          {isReadOnly && <span className="text-muted-foreground ml-1">(Read-only)</span>}
        </Label>
        <Input
          id={key}
          value={editedData[key] || ''}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          disabled={isReadOnly}
          className={isReadOnly ? "bg-muted cursor-not-allowed" : ""}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <Card className="bg-muted/30 border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            Project Details
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {projectData && Object.keys(projectData).length > 0 ? (
          <div className="space-y-4">
            {isEditing ? (
              // Editing Mode - Show all fields
              <div className="grid gap-4">
                {Object.entries(projectData).map(([key, value]) => renderField(key, value))}
              </div>
            ) : (
              // View Mode - Show essential fields + collapsible additional fields
              <>
                {/* Essential Fields - Always Visible */}
                <div className="space-y-3">
                  {essentialFields
                    .filter(key => projectData[key] !== undefined && projectData[key] !== null && projectData[key] !== '')
                    .map(key => renderField(key, projectData[key]))}
                </div>

                {/* Additional Fields - Collapsible */}
                {Object.keys(projectData).some(key => !essentialFields.includes(key) && projectData[key] !== undefined && projectData[key] !== null && projectData[key] !== '') && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/70 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium text-muted-foreground">
                          Additional Details
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {Object.keys(projectData).filter(key => !essentialFields.includes(key) && projectData[key] !== undefined && projectData[key] !== null && projectData[key] !== '').length} fields
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                        {Object.entries(projectData)
                          .filter(([key, value]) => !essentialFields.includes(key) && value !== undefined && value !== null && value !== '')
                          .map(([key, value]) => renderField(key, value))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No project details available</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="mt-3 gap-2"
            >
              <Edit className="h-4 w-4" />
              Add Project Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};