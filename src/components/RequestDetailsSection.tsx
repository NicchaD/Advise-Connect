import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  UserIcon, 
  Calendar, 
  Clock,
  Settings
} from 'lucide-react';
import { EditableProjectDetails } from '@/components/EditableProjectDetails';
import { TruncatedText } from '@/components/ui/truncated-text';
import { AISummarizeButton } from '@/components/AISummarizeButton';
import type { Request, RequestDetailsSectionProps } from '@/types/shared';

export const RequestDetailsSection: React.FC<RequestDetailsSectionProps> = ({
  request,
  requestorDisplayName,
  advisoryServiceMap = {},
  serviceOfferingMap = {},
  toolsMap = {},
  onProjectDataUpdate,
  formatDate = (date) => new Date(date).toLocaleDateString(),
  className,
  variant = 'default'
}) => {
  const getRequestorDisplayName = () => {
    if (requestorDisplayName) return requestorDisplayName;
    if (request.requestor_profile?.username) return request.requestor_profile.username;
    return request.requestor_id || 'Unknown';
  };

  const mapDisplayValue = (value: any, key?: string): string => {
    // Handle Assigned Consultant field
    if (key && (key.toLowerCase().includes('assigned consultant') || key.toLowerCase().includes('assignedconsultant'))) {
      return request.assignee_profile?.username || request.assigned_consultant_name || 'Not assigned';
    }
    
    // Handle Service Id field
    if (key && key.toLowerCase().includes('service') && key.toLowerCase().includes('id')) {
      const serviceName = request.service_specific_data?.serviceName as string;
      if (serviceName) return serviceName;
      const stringValue = String(value);
      return serviceOfferingMap[stringValue] || stringValue;
    }
    
    // Handle Selected Offerings field
    if (key && key.toLowerCase().includes('selected') && key.toLowerCase().includes('offering')) {
      if (Array.isArray(value)) {
        return value.map(item => 
          typeof item === 'string' ? (serviceOfferingMap[item] || advisoryServiceMap[item] || toolsMap[item] || item) : String(item)
        ).join(', ');
      } else {
        return typeof value === 'string' ? (serviceOfferingMap[value] || advisoryServiceMap[value] || toolsMap[value] || value) : String(value);
      }
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => 
        typeof item === 'string' ? (serviceOfferingMap[item] || advisoryServiceMap[item] || toolsMap[item] || item) : String(item)
      ).join(', ');
    }
    
    // Handle objects
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    
    // Handle single values
    const stringValue = String(value);
    return serviceOfferingMap[stringValue] || advisoryServiceMap[stringValue] || toolsMap[stringValue] || stringValue;
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Request Information Card */}
        <Card className="bg-muted/30 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              Request Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border/50">
                <div className="p-1.5 bg-muted rounded-md mt-0.5">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Requested by</p>
                  <p className="font-semibold text-foreground truncate">
                    {getRequestorDisplayName()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border/50">
                <div className="p-1.5 bg-muted rounded-md mt-0.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Submitted</p>
                  <p className="font-semibold text-foreground">
                    {formatDate(request.submission_date)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border/50">
                <div className="p-1.5 bg-muted rounded-md mt-0.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Last updated</p>
                  <p className="font-semibold text-foreground">
                    {formatDate(request.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Details Card */}
        <EditableProjectDetails
          requestId={request.id}
          projectData={request.project_data || {}}
          onUpdate={onProjectDataUpdate || (() => {})}
        />
      </div>

      {/* Description Section */}
      {request.description && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Description</h3>
            <AISummarizeButton text={request.description} />
          </div>
          <TruncatedText 
            text={request.description} 
            maxWords={50}
            className="text-muted-foreground"
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Advisory Services Section */}
        {request.advisory_services?.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Advisory Services</h3>
            <div className="flex flex-wrap gap-2">
              {request.advisory_services.map((service, index) => (
                <Badge key={index} variant="secondary">
                  {advisoryServiceMap[service] || service}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Support Required Section */}
        {request.selected_tools?.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Support Required</h3>
            <div className="flex flex-wrap gap-2">
              {request.selected_tools.map((tool, index) => (
                <Badge key={index} variant="outline">
                  {serviceOfferingMap[tool] || toolsMap[tool] || tool}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Service Specific Information Section */}
      {request.service_specific_data && Object.keys(request.service_specific_data).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Service Specific Information</h3>
          <div className="bg-muted p-4 rounded-lg space-y-3">
            {Object.entries(request.service_specific_data).map(([key, value]) => {
              const displayValue = mapDisplayValue(value, key);
              const isRequirementDetails = key.toLowerCase().includes('requirement') && key.toLowerCase().includes('details');

              return (
                <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-2">
                  <span className="font-medium text-sm capitalize min-w-fit">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                  </span>
                  {isRequirementDetails ? (
                    <div className="flex-1 space-y-2">
                      <TruncatedText 
                        text={displayValue} 
                        maxWords={50}
                        className="text-sm text-muted-foreground"
                      />
                      <AISummarizeButton text={displayValue} className="mt-2" />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {displayValue}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
