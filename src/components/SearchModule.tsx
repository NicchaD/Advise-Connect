import React, { useState, useEffect } from 'react';
import { getUserDisplayName, getRequestorDisplayName } from '@/lib/userUtils';
import { Search, Filter, Calendar, User, Clock, MessageSquare, Edit3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { EditableProjectDetails } from '@/components/EditableProjectDetails';
import { TruncatedText } from '@/components/ui/truncated-text';
import { AISummarizeButton } from '@/components/AISummarizeButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface RequestData {
  id: string;
  request_id: string;
  requestor_id: string;
  assignee_id?: string;
  assigned_consultant_name?: string;
  advisory_services: string[];
  selected_tools: string[];
  status: 'Submitted' | 'In Review' | 'Estimation' | 'Approved' | 'In Progress' | 'Completed' | 'Rejected' | 'Under Review';
  description?: string;
  project_data: any;
  service_specific_data: any;
  submission_date: string;
  assignee?: {
    username: string;
    email: string;
  } | null;
  requestor?: {
    username: string;
    email: string;
  } | null;
  comments: Comment[];
}

interface Comment {
  id: string;
  comment: string;
  user_id: string;
  created_at: string;
  user?: {
    username: string;
  } | null;
}

const statusColors = {
  'Submitted': 'bg-blue-500/20 text-blue-700 border-blue-200',
  'In Review': 'bg-yellow-500/20 text-yellow-700 border-yellow-200',
  'Under Review': 'bg-yellow-500/20 text-yellow-700 border-yellow-200',
  'Estimation': 'bg-orange-500/20 text-orange-700 border-orange-200',
  'Approved': 'bg-green-500/20 text-green-700 border-green-200',
  'In Progress': 'bg-purple-500/20 text-purple-700 border-purple-200',
  'Completed': 'bg-emerald-500/20 text-emerald-700 border-emerald-200',
  'Rejected': 'bg-red-500/20 text-red-700 border-red-200'
};

interface SearchModuleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModule: React.FC<SearchModuleProps> = ({ isOpen, onClose }) => {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RequestData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [consultantFilter, setConsultantFilter] = useState<string>('all');
  const [toolFilter, setToolFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [advisoryServices, setAdvisoryServices] = useState<Record<string, string>>({});
  const [serviceOfferings, setServiceOfferings] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Helper function to get tool display name - uses dynamic data
  const getToolDisplayName = (toolId: string): string => {
    return serviceOfferings[toolId] || TOOL_ID_TO_NAME_MAP[toolId] || toolId;
  };

  // Helper function to get advisory service display name - uses dynamic data
  const getAdvisoryServiceDisplayName = (serviceId: string): string => {
    return advisoryServices[serviceId] || ADVISORY_SERVICE_ID_TO_NAME_MAP[serviceId] || serviceId;
  };

  // Fetch requests when component opens
  useEffect(() => {
    if (isOpen) {
      fetchAdvisoryServices();
      fetchServiceOfferings();
      fetchRequests();
    }
  }, [isOpen]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // First fetch all requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .order('submission_date', { ascending: false });

      if (requestsError) throw requestsError;

      // Then fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, email, role');

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile for easy lookup
      const profileMap = new Map();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Combine the data
      const requestsWithProfiles = requestsData?.map(request => ({
        ...request,
        status: request.status as RequestData['status'],
        assignee: request.assignee_id ? profileMap.get(request.assignee_id) : null,
        requestor: request.requestor_id ? profileMap.get(request.requestor_id) : null,
        comments: [] as Comment[] // Initialize empty comments array
      })) || [];

      setRequests(requestsWithProfiles as RequestData[]);
    } catch (error) {
      console.error('Fetch requests error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvisoryServices = async () => {
    try {
      const { data, error } = await supabase
        .from('advisory_services')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;
      
      const servicesMap: Record<string, string> = {};
      data?.forEach(service => {
        servicesMap[service.id] = service.name;
      });
      setAdvisoryServices(servicesMap);
    } catch (error) {
      console.error('Failed to fetch advisory services:', error);
    }
  };

  const fetchServiceOfferings = async () => {
    try {
      const { data, error } = await supabase
        .from('service_offerings')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;
      
      const offeringsMap: Record<string, string> = {};
      data?.forEach(offering => {
        offeringsMap[offering.id] = offering.name;
      });
      setServiceOfferings(offeringsMap);
    } catch (error) {
      console.error('Failed to fetch service offerings:', error);
    }
  };

  // Filter requests based on search and filters
  useEffect(() => {
    let filtered = requests;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.assignee?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Consultant filter
    if (consultantFilter !== 'all') {
      filtered = filtered.filter(request => request.assignee?.username === consultantFilter);
    }

    // Tool filter
    if (toolFilter !== 'all') {
      filtered = filtered.filter(request =>
        request.selected_tools.some(tool => tool.toLowerCase().includes(toolFilter.toLowerCase()))
      );
    }

    // Sort by newest first
    filtered.sort((a, b) => new Date(b.submission_date).getTime() - new Date(a.submission_date).getTime());

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter, consultantFilter, toolFilter]);

  const fetchRequestComments = async (requestId: string) => {
    try {
      // Fetch comments first
      const { data: commentsData, error: commentsError } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Fetch profiles to get usernames
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username');

      if (profilesError) throw profilesError;

      // Create profile map
      const profileMap = new Map();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Combine comments with user data
      const commentsWithUsers = commentsData?.map(comment => ({
        ...comment,
        user: profileMap.get(comment.user_id) || null
      })) || [];
      
      if (selectedRequest) {
        setSelectedRequest({
          ...selectedRequest,
          comments: commentsWithUsers as Comment[]
        });
      }
    } catch (error) {
      console.error('Failed to fetch request comments:', error);
    }
  };

  const addComment = async (requestId: string) => {
    if (!newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add comments",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('request_comments')
        .insert([{
          request_id: requestId,
          user_id: user.id,
          comment: newComment.trim()
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment added successfully"
      });

      setNewComment('');
      fetchRequestComments(requestId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openRequestDetails = (request: RequestData) => {
    setSelectedRequest(request);
    fetchRequestComments(request.id);
  };

  const uniqueConsultants = [...new Set(requests.map(r => r.assignee?.username).filter(Boolean))];
  const uniqueTools = [...new Set(requests.flatMap(r => r.selected_tools))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0">
        <div className="bg-gradient-to-br from-background via-background-secondary to-background p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  Request Tracker
                </h1>
                <p className="text-muted-foreground mt-2">
                  Search and track all submitted advisory service requests
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Total Requests: {requests.length}
              </div>
            </div>

            {/* Search and Filters */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search & Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Box */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Request ID, Assigned Consultant, or Description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Quick Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Submitted">Submitted</SelectItem>
                        <SelectItem value="In Review">In Review</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Estimation">Estimation</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Consultant</label>
                    <Select value={consultantFilter} onValueChange={setConsultantFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Consultants" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Consultants</SelectItem>
                        {uniqueConsultants.map(consultant => (
                          <SelectItem key={consultant} value={consultant!}>
                            {consultant}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Tool</label>
                    <Select value={toolFilter} onValueChange={setToolFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Tools" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tools</SelectItem>
                        {uniqueTools.map(tool => (
                          <SelectItem key={tool} value={tool}>
                            {tool}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Request List */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Service Requests ({filteredRequests.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading requests...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request ID</TableHead>
                          <TableHead>Requestor</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Support Required</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map((request) => (
                          <TableRow 
                            key={request.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => openRequestDetails(request)}
                          >
                            <TableCell className="font-medium">{request.request_id}</TableCell>
                            <TableCell>{getRequestorDisplayName(request.requestor, request.requestor_id)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {request.assigned_consultant_name || 'Unassigned'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[request.status]}>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                 {request.selected_tools.slice(0, 2).map(tool => (
                                   <Badge key={tool} variant="outline" className="text-xs">
                                     {getToolDisplayName(tool)}
                                   </Badge>
                                ))}
                                {request.selected_tools.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{request.selected_tools.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(request.submission_date)}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRequestDetails(request);
                                }}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Request Details Dialog */}
            {selectedRequest && (
              <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <span>Request Details - {selectedRequest.request_id}</span>
                      <Badge className={statusColors[selectedRequest.status]}>
                        {selectedRequest.status}
                      </Badge>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-left">Request Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-left">
                          <label className="text-sm font-medium text-muted-foreground">Request ID</label>
                          <p className="mt-1">{selectedRequest.request_id}</p>
                        </div>
                        <div className="text-left">
                          <label className="text-sm font-medium text-muted-foreground">Requestor</label>
                          <p className="mt-1">{selectedRequest.requestor?.username || 'Unknown'}</p>
                        </div>
                        <div className="text-left">
                          <label className="text-sm font-medium text-muted-foreground">Assigned Consultant</label>
                          <p className="mt-1">{selectedRequest.assigned_consultant_name || 'Unassigned'}</p>
                        </div>
                        <div className="text-left">
                          <label className="text-sm font-medium text-muted-foreground">Submission Date</label>
                          <p className="mt-1">{formatDate(selectedRequest.submission_date)}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Service Details */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-left">Service Requirements</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="text-left">
                          <label className="text-sm font-medium text-muted-foreground">Advisory Services</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedRequest.advisory_services.map(service => (
                              <Badge key={service} variant="outline">
                                {getAdvisoryServiceDisplayName(service)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-left">
                          <label className="text-sm font-medium text-muted-foreground">Support Required</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                             {selectedRequest.selected_tools.map(tool => (
                               <Badge key={tool} variant="outline">
                                 {getToolDisplayName(tool)}
                               </Badge>
                            ))}
                          </div>
                        </div>
                        {selectedRequest.description && (
                          <div className="text-left">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-semibold">Description</h3>
                              <AISummarizeButton text={selectedRequest.description} />
                            </div>
                            <TruncatedText 
                              text={selectedRequest.description} 
                              maxWords={50}
                              className="mt-1 p-3 bg-muted/50 rounded-md"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Project Data */}
                    <EditableProjectDetails
                      requestId={selectedRequest.id}
                      projectData={selectedRequest.project_data || {}}
                      onUpdate={(updatedData) => {
                        setSelectedRequest(prev => prev ? {
                          ...prev,
                          project_data: updatedData
                        } : null);
                      }}
                    />

                    <Separator />

                    {/* Comments Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Comments ({selectedRequest.comments.length})
                      </h3>
                      
                      {/* Existing Comments */}
                      <div className="space-y-4 mb-4">
                        {selectedRequest.comments.map(comment => (
                          <div key={comment.id} className="p-4 bg-muted/50 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{getUserDisplayName(comment.user)}</span>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm">{comment.comment}</p>
                          </div>
                        ))}
                      </div>

                      {/* Add New Comment */}
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={3}
                        />
                        <Button 
                          onClick={() => addComment(selectedRequest.id)}
                          disabled={!newComment.trim()}
                          className="w-full"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Add Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
