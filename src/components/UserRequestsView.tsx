import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Search,
  FileText,
  Clock,
  User,
  Calendar,
  Filter,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader,
  Calculator,
  MessageSquare
} from 'lucide-react';
import { TruncatedText } from '@/components/ui/truncated-text';
import { EditableProjectDetails } from '@/components/EditableProjectDetails';
import { AISummarizeButton } from '@/components/AISummarizeButton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import RequestFeedbackForm from '@/components/RequestFeedbackForm';

// Mapping for tool/offering IDs to display names
const TOOL_ID_TO_NAME_MAP: Record<string, string> = {
  // Engineering Excellence
  'github': 'GitHub',
  'jenkins': 'Jenkins',
  'azure-devops': 'Azure DevOps',
  'jira': 'JIRA',
  'sonarqube': 'SonarQube',
  'junit': 'JUnit',
  'nunit': 'NUnit',
  'github-copilot': 'GitHub Copilot',
  
  // Innovation Management
  'innovation-strategy': 'Innovation Strategy',
  'idea-management': 'Idea Management',
  'innovation-workshops': 'Innovation Workshops',
  'innovation-metrics': 'Innovation Metrics',
  
  // Delivery Transformation
  'delivery-process-optimization': 'Delivery Process Optimization',
  'governance-framework': 'Governance Framework',
  'quality-assurance': 'Quality Assurance',
  'risk-management': 'Risk Management',
  
  // Deep Dive Assessment
  'current-state-analysis': 'Current State Analysis',
  'gap-analysis': 'Gap Analysis',
  'capability-assessment': 'Capability Assessment',
  'recommendations-report': 'Recommendations Report',
  
  // Process Consulting
  'process-mapping': 'Process Mapping',
  'process-optimization': 'Process Optimization',
  'change-management': 'Change Management',
  'training-development': 'Training & Development',
  
  // Knowledge Management
  'knowledge-audit': 'Knowledge Audit',
  'knowledge-base-setup': 'Knowledge Base Setup',
  'documentation-standards': 'Documentation Standards',
  'documentation-strategy': 'Documentation Strategy',
  'knowledge-sharing-culture': 'Knowledge Sharing Culture'
};

// Mapping for advisory service IDs to display names
const ADVISORY_SERVICE_ID_TO_NAME_MAP: Record<string, string> = {
  'engineering-excellence': 'Engineering Excellence',
  'innovation-management': 'Innovation Management',
  'delivery-transformation': 'Delivery Transformation and Governance Service',
  'deep-dive-assessment': 'Deep Dive Assessment',
  'process-consulting': 'Process Consulting',
  'knowledge-management': 'Knowledge Management'
};

interface Request {
  id: string;
  request_id: string;
  status: string;
  description: string;
  submission_date: string;
  project_data: any;
  service_specific_data: any;
  advisory_services: string[];
  selected_tools: string[];
  current_assignee_name?: string;
  original_assignee_name?: string;
}

interface UserRequestsViewProps {
  onClose: () => void;
}

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800',
  'Pending Review': 'bg-orange-100 text-orange-800',
  'Review': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-purple-100 text-purple-800',
  'Approval': 'bg-emerald-600 text-white',
  'Estimation': 'bg-indigo-100 text-indigo-800',
  'Implementing': 'bg-emerald-100 text-emerald-800',
  'Awaiting Feedback': 'bg-amber-100 text-amber-800',
  'Feedback Received': 'bg-violet-600 text-white',
  'Implemented': 'bg-green-100 text-green-800',
  'Under Discussion': 'bg-pink-100 text-pink-800',
  'Cancelled': 'bg-red-100 text-red-800',
  'Closed': 'bg-slate-600 text-white',
  'Reject': 'bg-red-600 text-white'
};

const STATUS_ICONS = {
  'New': AlertCircle,
  'Pending Review': Clock,
  'Review': Eye,
  'Approved': CheckCircle2,
  'Estimation': Calculator,
  'Implementing': Loader,
  'Awaiting Feedback': MessageSquare,
  'Feedback Received': CheckCircle2,
  'Implemented': CheckCircle2,
  'Under Discussion': MessageSquare,
  'Cancelled': XCircle,
  'Closed': XCircle,
  'Reject': XCircle
};

export default function UserRequestsView({ onClose }: UserRequestsViewProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  const fetchUserRequests = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Error",
          description: "Please log in to view your requests",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('requests')
        .select('*, current_assignee_name, original_assignee_name')
        .eq('requestor_id', user.id)
        .order('submission_date', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.project_data?.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    setFilteredRequests(filtered);
  };

  const getStatusIcon = (status: string) => {
    const Icon = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };

  const getToolDisplayName = (toolId: string): string => {
    return TOOL_ID_TO_NAME_MAP[toolId] || toolId;
  };

  const getAdvisoryServiceDisplayName = (serviceId: string): string => {
    return ADVISORY_SERVICE_ID_TO_NAME_MAP[serviceId] || serviceId;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading your requests...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6 text-primary" />
                My Requests
              </CardTitle>
              <CardDescription>
                View and track your advisory service requests
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Pending Review">Pending Review</SelectItem>
                <SelectItem value="Review">Review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Estimation">Estimation</SelectItem>
                <SelectItem value="Implementing">Implementing</SelectItem>
                <SelectItem value="Awaiting Feedback">Awaiting Feedback</SelectItem>
                <SelectItem value="Feedback Received">Feedback Received</SelectItem>
                <SelectItem value="Implemented">Implemented</SelectItem>
                <SelectItem value="Under Discussion">Under Discussion</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Reject">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests List */}
          <div className="overflow-y-auto max-h-[60vh] space-y-4">
            {filteredRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Requests Found</h3>
                <p className="text-muted-foreground">
                  {requests.length === 0 
                    ? "You haven't submitted any requests yet." 
                    : "No requests match your current filters."}
                </p>
              </Card>
            ) : (
              filteredRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{request.request_id}</h3>
                          <Badge 
                            className={`${STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]} flex items-center gap-1`}
                          >
                            {getStatusIcon(request.status)}
                            {request.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <p className="font-medium">Project: {request.project_data?.projectName}</p>
                            <p className="text-muted-foreground">Account: {request.project_data?.accountName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Submitted: {format(new Date(request.submission_date), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-muted-foreground">Service: {getAdvisoryServiceDisplayName(request.service_specific_data?.serviceId || request.service_specific_data?.serviceName)}</p>
                          </div>
                        </div>

                        {request.description && (
                          <div className="mt-2">
                            <TruncatedText 
                              text={request.description} 
                              maxWords={50}
                              className="text-sm text-muted-foreground"
                            />
                          </div>
                        )}

                        {request.selected_tools?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {request.selected_tools.map((tool, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {getToolDisplayName(tool)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        className="ml-4"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Summary */}
          {requests.length > 0 && (
            <div className="border-t pt-4 text-sm text-muted-foreground">
              Showing {filteredRequests.length} of {requests.length} requests
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Request Details - {selectedRequest.request_id}</CardTitle>
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <EditableProjectDetails
                requestId={selectedRequest.id}
                projectData={selectedRequest.project_data || {}}
                onUpdate={(updatedData) => {
                  setSelectedRequest(prev => prev ? {
                    ...prev,
                    project_data: updatedData
                  } : null);
                  // Also update the request in the main list
                  setRequests(prev => prev.map(req => 
                    req.id === selectedRequest.id 
                      ? { ...req, project_data: updatedData }
                      : req
                  ));
                }}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Service Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Service:</strong> {getAdvisoryServiceDisplayName(selectedRequest.service_specific_data?.serviceId || selectedRequest.service_specific_data?.serviceName)}</p>
                    <p><strong>Status:</strong> 
                      <Badge className={`ml-2 ${STATUS_COLORS[selectedRequest.status as keyof typeof STATUS_COLORS]}`}>
                        {selectedRequest.status}
                      </Badge>
                    </p>
                    <p><strong>Submitted:</strong> {format(new Date(selectedRequest.submission_date), 'PPP')}</p>
                    {selectedRequest.service_specific_data?.expectedStartDate && (
                      <p><strong>Expected Start:</strong> {format(new Date(selectedRequest.service_specific_data.expectedStartDate), 'PPP')}</p>
                    )}
                    {selectedRequest.current_assignee_name && (
                      <p><strong>Current Assignee:</strong> {selectedRequest.current_assignee_name}</p>
                    )}
                    {selectedRequest.original_assignee_name && (
                      <p><strong>Original Assignee:</strong> {selectedRequest.original_assignee_name}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedRequest.description && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Requirements</h4>
                    <AISummarizeButton text={selectedRequest.description} />
                  </div>
                  <div className="text-sm bg-muted p-4 rounded-lg">
                    <TruncatedText 
                      text={selectedRequest.description} 
                      maxWords={50}
                    />
                  </div>
                </div>
              )}

              {selectedRequest.service_specific_data?.expectedBusinessImpact && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Expected Business Impact</h4>
                    <AISummarizeButton text={selectedRequest.service_specific_data.expectedBusinessImpact} />
                  </div>
                  <div className="text-sm bg-muted p-4 rounded-lg">
                    <TruncatedText 
                      text={selectedRequest.service_specific_data.expectedBusinessImpact} 
                      maxWords={50}
                    />
                  </div>
                </div>
              )}

              {selectedRequest.selected_tools?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Selected Offerings</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.selected_tools.map((tool, index) => (
                      <Badge key={index} variant="outline">
                        {getToolDisplayName(tool)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback Form - Show when status is "Awaiting Feedback" */}
              {selectedRequest.status === 'Awaiting Feedback' && (
                <div>
                  <RequestFeedbackForm
                    requestId={selectedRequest.id}
                    onFeedbackSubmitted={() => {
                      toast({
                        title: "Success",
                        description: "Your feedback has been submitted successfully!",
                        variant: "default"
                      });
                      setSelectedRequest(null);
                      fetchUserRequests(); // Refresh the requests list
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}