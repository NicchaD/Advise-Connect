import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusTransitionDropdown } from '@/components/StatusTransitionDropdown';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Search, Eye, User, History, DollarSign, Clock, CheckSquare, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getUserDisplayName, getRequestorDisplayName } from '@/lib/userUtils';
import { TimesheetSection } from './TimesheetSection';
import { EditableProjectDetails } from '@/components/EditableProjectDetails';
import { TruncatedText } from '@/components/ui/truncated-text';
import { AISummarizeButton } from '@/components/AISummarizeButton';

// Mapping for tool/offering IDs to display names
const TOOL_ID_TO_NAME_MAP: Record<string, string> = {
  // Engineering Excellence
  'github': 'GitHub',
  'github-copilot': 'GitHub Copilot',
  'sonarqube': 'SonarQube',
  'snyk': 'Snyk',
  'jira': 'Jira',
  'confluence': 'Confluence',
  'azure-devops': 'Azure DevOps',
  'jenkins': 'Jenkins',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'terraform': 'Terraform',
  'ansible': 'Ansible',
  'grafana': 'Grafana',
  'prometheus': 'Prometheus',
  'elk-stack': 'ELK Stack',
  'splunk': 'Splunk',
  'slack': 'Slack',
  'teams': 'Microsoft Teams',
  'zoom': 'Zoom',
  'miro': 'Miro',
  'figma': 'Figma',
  'adobe-creative-suite': 'Adobe Creative Suite',
  'canva': 'Canva',
  'tableau': 'Tableau',
  'power-bi': 'Power BI',
  'excel': 'Microsoft Excel',
  'r-studio': 'RStudio',
  'python': 'Python',
  'jupyter': 'Jupyter Notebooks'
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

// Helper function to get tool display name - uses dynamic data
const getToolDisplayName = (toolId: string, serviceOfferings: Record<string, string>): string => {
  return serviceOfferings[toolId] || TOOL_ID_TO_NAME_MAP[toolId] || toolId;
};

// Helper function to get advisory service display name - uses dynamic data
const getAdvisoryServiceDisplayName = (serviceId: string, advisoryServices: Record<string, string>): string => {
  return advisoryServices[serviceId] || ADVISORY_SERVICE_ID_TO_NAME_MAP[serviceId] || serviceId;
};

interface Request {
  id: string;
  request_id: string;
  requestor_id: string;
  assignee_id?: string;
  assigned_consultant_name?: string;
  advisory_services: string[];
  selected_tools: string[];
  status: string;
  description?: string;
  project_data: any;
  service_specific_data: any;
  submission_date: string;
  selected_activities?: any;
  timesheet_data?: any;
  current_assignee_name?: string;
  original_assignee_name?: string;
  saved_assignee_rate?: number;
  saved_assignee_role?: string;
  estimation_saved_at?: string;
  implementation_start_date?: string;
  assignee?: {
    username: string;
    email: string;
  } | null;
  requestor?: {
    username: string;
    email: string;
  } | null;
}

interface RequestHistory {
  id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  performed_by: string;
  performed_at: string;
  performer?: {
    username: string;
  } | null;
}

interface RequestComment {
  id: string;
  comment: string;
  user_id: string;
  created_at: string;
  user?: {
    username: string;
  } | null;
}

interface Profile {
  id: string;
  user_id?: string; // Optional since basic view doesn't include user_id for security
  name: string;
  email?: string; // Optional since basic view doesn't include email
  title: string;
  advisory_services?: string[];
  expertise?: string[];
}

export const RequestOversight: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([]);
  const [requestComments, setRequestComments] = useState<RequestComment[]>([]);
  const [consultants, setConsultants] = useState<Profile[]>([]);
  const [advisoryServices, setAdvisoryServices] = useState<Record<string, string>>({});
  const [serviceOfferings, setServiceOfferings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserTitle, setCurrentUserTitle] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [availableTransitions, setAvailableTransitions] = useState<{to_status: string; role_required: string}[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const statuses = ['New', 'Estimation', 'Review', 'Pending Review', 'Pending Review by Advisory Head', 'Approved', 'Implementing', 'Awaiting Feedback', 'Closed', 'On Hold', 'Cancelled'];

  useEffect(() => {
    fetchCurrentUser();
    fetchRequests();
    fetchConsultants();
    fetchAdvisoryServices();
    fetchServiceOfferings();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
        // For non-admin users, they can only see their own profile
        // For admin users, they should have access via admin functions
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, title')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile) {
          setCurrentUserRole(profile.role);
          setCurrentUserTitle(profile.title || '');
        }

        // Also fetch from advisory_team_members to get complete profile
        // Use the new user-specific function for better security
        const { data: userTeamMember } = await supabase
          .rpc('get_team_member_by_user_id', { target_user_id: user.id });
        
        if (userTeamMember && userTeamMember.length > 0) {
          setCurrentUserProfile(userTeamMember[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  useEffect(() => {
    filterRequests();
    setCurrentPage(1); // Reset to first page when filters change
  }, [requests, searchTerm, statusFilter]);

  const fetchRequests = async () => {
    try {
      // First fetch all requests including selected_activities, timesheet_data and assignee names
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select('*, selected_activities, timesheet_data, current_assignee_name, original_assignee_name')
        .order('submission_date', { ascending: false });

      if (requestsError) throw requestsError;

      // Then fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, email, role');

      if (profilesError) throw profilesError;

      console.log('Requests data:', requestsData);
      console.log('Profiles data:', profilesData);

      // Create a map of user_id to profile for easy lookup
      const profileMap = new Map();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Combine the data
      const requestsWithProfiles = requestsData?.map(request => ({
        ...request,
        assignee: request.assignee_id ? profileMap.get(request.assignee_id) : null,
        requestor: request.requestor_id ? profileMap.get(request.requestor_id) : null,
      })) || [];

      setRequests(requestsWithProfiles);
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

  const fetchConsultants = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_team_members_for_app');

      if (error) throw error;
      setConsultants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch consultants:', error);
    }
  };

  // Get filtered consultants based on the selected request's advisory services and tools
  const getFilteredConsultants = () => {
    if (!selectedRequest) return consultants;

    // For end-of-lifecycle statuses, don't show any assignee options
    if (selectedRequest.status === 'Cancelled' || selectedRequest.status === 'Implemented') {
      return [];
    }

    const requestAdvisoryServices = selectedRequest.advisory_services;
    const requestTools = selectedRequest.selected_tools;

    // First, try to find consultants with matching service and expertise
    const matchedConsultants = consultants.filter(consultant => {
      // Check if consultant has matching advisory service
      const hasMatchingService = consultant.advisory_services?.some(service => 
        requestAdvisoryServices.includes(service)
      );

      // Check if consultant's expertise matches any of the request's tools/service offerings
      const hasMatchingExpertise = consultant.expertise?.some(expertise => 
        requestTools.includes(expertise)
      );

      // Check if this consultant can handle the current status
      const canHandleCurrentStatus = availableTransitions.some(transition => 
        canTransition(transition) && 
        (transition.role_required === 'Admin' || consultant.title === transition.role_required)
      );

      return hasMatchingService && hasMatchingExpertise && canHandleCurrentStatus;
    });

    // If no matching consultants found, fallback to Advisory Service Heads for the same advisory service
    if (matchedConsultants.length === 0) {
      const advisoryServiceHeads = consultants.filter(consultant => {
        // Check if consultant is an Advisory Service Head
        const isAdvisoryServiceHead = consultant.title === 'Advisory Service Head';

        // Check if consultant has matching advisory service
        const hasMatchingService = consultant.advisory_services?.some(service => 
          requestAdvisoryServices.includes(service)
        );

        return isAdvisoryServiceHead && hasMatchingService;
      });

      // Sort by least number of assigned requests (this would need to be tracked separately)
      // For now, return all matching Advisory Service Heads
      return advisoryServiceHeads;
    }

    return matchedConsultants;
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

  const fetchRequestHistory = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('request_history')
        .select(`
          *,
          performer:profiles!performed_by(username)
        `)
        .eq('request_id', requestId)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      setRequestHistory((data || []) as any);
    } catch (error) {
      console.error('Failed to fetch request history:', error);
    }
  };

  const fetchRequestComments = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('request_comments')
        .select(`
          *,
          user:profiles!user_id(username)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRequestComments((data || []) as any);
    } catch (error) {
      console.error('Failed to fetch request comments:', error);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.assignee?.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    setFilteredRequests(filtered);
  };

  const fetchAvailableTransitions = async (currentStatus: string) => {
    try {
      const { data, error } = await supabase
        .from('status_transitions')
        .select('to_status, role_required')
        .eq('from_status', currentStatus);

      if (error) throw error;
      setAvailableTransitions(data || []);
    } catch (error) {
      console.error('Error fetching transitions:', error);
    }
  };

  const canTransition = (transition: {to_status: string; role_required: string}) => {
    if (currentUserRole === 'Admin') return true;
    
    // Check if user role matches required role for transition
    if (transition.role_required === 'Requestor') {
      return currentUserRole === 'Standard User' || currentUserRole === 'Requestor';
    }
    
    return currentUserRole === transition.role_required;
  };

  const openRequestDetails = (request: Request) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setNewAssignee(request.assignee_id || '');
    fetchRequestHistory(request.id);
    fetchRequestComments(request.id);
    fetchAvailableTransitions(request.status);
  };

  const updateRequestStatus = async () => {
    if (!selectedRequest || !newStatus) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Before status update - Current assignee:', selectedRequest.assignee_id);
      console.log('Updating status from', selectedRequest.status, 'to', newStatus);
      
      const { data, error } = await supabase.rpc('update_request_status_and_assignee', {
        p_request_id: selectedRequest.id,
        new_status: newStatus,
        performed_by: user.id,
      });

      if (error) {
        console.error('Database function error:', error);
        throw error;
      }
      
      console.log('Database function result:', data);

      // Check if the function returned an error due to no consultants available
      if (data && typeof data === 'object' && 'success' in data && !data.success && 'error' in data) {
        toast({
          title: "Error",
          description: data.error as string,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Request status updated successfully with workflow applied"
      });

      // Refresh the requests list first
      await fetchRequests();
      
      // Refresh the request history
      await fetchRequestHistory(selectedRequest.id);
      
      // Since fetchRequests updates the requests state asynchronously, 
      // we need to fetch the updated request directly from the database
      const { data: updatedRequestData, error: fetchError } = await supabase
        .from('requests')
        .select('*, selected_activities')
        .eq('id', selectedRequest.id)
        .single();

      if (fetchError) {
        console.error('Error fetching updated request:', fetchError);
        return;
      }

      console.log('Updated request data from DB:', updatedRequestData);
      console.log('New assignee_id:', updatedRequestData.assignee_id);

      // Get the updated assignee info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, username, email, role')
        .eq('user_id', updatedRequestData.assignee_id)
        .single();

      console.log('Profile data for new assignee:', profileData);

      const updatedRequest = {
        ...updatedRequestData,
        assignee: profileData || null,
        requestor: selectedRequest.requestor // Keep the existing requestor info
      };

      console.log('Final updated request object:', updatedRequest);

      // Update the selected request with the fresh data from database
      setSelectedRequest(updatedRequest);
      setNewAssignee(updatedRequestData.assignee_id || '');
      
      console.log('Updated selectedRequest state and newAssignee:', updatedRequestData.assignee_id);

      // Update the newStatus state to retain the newly saved status
      setNewStatus(newStatus);

      // Refresh the status transitions for the new status
      await fetchAvailableTransitions(newStatus);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const reassignRequest = async () => {
    if (!selectedRequest || !newAssignee) return;

    try {
      // Get the consultant details to update the assigned consultant name
      const selectedConsultant = consultants.find(c => c.user_id === newAssignee);
      if (!selectedConsultant) {
        throw new Error('Selected consultant not found');
      }

      const { error } = await supabase
        .from('requests')
        .update({ 
          assignee_id: newAssignee,
          assigned_consultant_name: selectedConsultant.name
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Update the local state to immediately reflect the change in UI
      const updatedRequest = {
        ...selectedRequest,
        assignee_id: newAssignee,
        assigned_consultant_name: selectedConsultant.name
      };
      setSelectedRequest(updatedRequest);

      // Update the requests list to reflect the change
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === selectedRequest.id 
            ? { ...req, assignee_id: newAssignee, assigned_consultant_name: selectedConsultant.name }
            : req
        )
      );

      toast({
        title: "Success",
        description: `Request reassigned successfully to ${selectedConsultant.name}`,
        variant: "default"
      });

      fetchRequestHistory(selectedRequest.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reassign request",
        variant: "destructive"
      });
    }
  };

  const addComment = async () => {
    if (!selectedRequest || !newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('request_comments')
        .insert([{
          request_id: selectedRequest.id,
          user_id: user.id,
          comment: newComment.trim()
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment added successfully"
      });

      setNewComment('');
      fetchRequestComments(selectedRequest.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'New': 'bg-blue-500/20 text-blue-700 border-blue-200',
      'Estimation': 'bg-purple-500/20 text-purple-700 border-purple-200',
      'Review': 'bg-yellow-500/20 text-yellow-700 border-yellow-200',
      'Pending Review': 'bg-orange-500/20 text-orange-700 border-orange-200',
      'Pending Review by Advisory Head': 'bg-red-500/20 text-red-700 border-red-200',
      'Approved by Advisory Head': 'bg-teal-500/20 text-teal-700 border-teal-200',
      'Implementing': 'bg-indigo-500/20 text-indigo-700 border-indigo-200',
      'Awaiting Feedback': 'bg-amber-500/20 text-amber-700 border-amber-200',
      'Closed': 'bg-green-500/20 text-green-700 border-green-200',
      'On Hold': 'bg-gray-500/20 text-gray-700 border-gray-200',
      'Cancelled': 'bg-red-600/20 text-red-800 border-red-300'
    };
    return colors[status as keyof typeof colors] || colors['New'];
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculation functions for Rate and Estimation
  const calculateTotalPDEstimate = (selectedActivities: any, serviceOfferingActivities?: any) => {
    const totalHours = calculateTotalHours(selectedActivities, serviceOfferingActivities);
    // Return PD estimate: total hours divided by 8
    return Math.round((totalHours / 8) * 100) / 100; // Round to 2 decimal places
  };

  const calculateTotalHours = (selectedActivities: any, serviceOfferingActivities?: any) => {
    let totalHours = 0;
    
    console.log('calculateTotalHours called with:', { selectedActivities, serviceOfferingActivities });
    
    // Handle new service offering activities structure (multi-service)
    if (serviceOfferingActivities && typeof serviceOfferingActivities === 'object') {
      console.log('Processing serviceOfferingActivities structure');
      Object.values(serviceOfferingActivities).forEach((serviceData: any) => {
        if (serviceData && serviceData.activities) {
          Object.values(serviceData.activities).forEach((activity: any) => {
            if (activity && activity.selected && activity.estimated_hours) {
              console.log('Adding activity hours:', activity.estimated_hours);
              totalHours += Number(activity.estimated_hours);
            }
            
            if (activity && activity.subActivities) {
              Object.values(activity.subActivities).forEach((subActivity: any) => {
                if (subActivity) {
                  if (typeof subActivity === 'boolean' && subActivity) {
                    // Boolean true means selected, but we need to find the actual hours
                    console.log('Found boolean subActivity (selected)');
                  } else if (typeof subActivity === 'object' && subActivity.selected && subActivity.estimated_hours) {
                    console.log('Adding subActivity hours:', subActivity.estimated_hours);
                    totalHours += Number(subActivity.estimated_hours);
                  }
                }
              });
            }
          });
        }
      });
      
      console.log('Total from serviceOfferingActivities:', totalHours);
      
      // If serviceOfferingActivities didn't yield any hours, continue to check selectedActivities
      if (totalHours > 0) {
        return totalHours;
      }
      console.log('serviceOfferingActivities had no hours, checking selectedActivities...');
    }
    
    // Handle legacy single service offering structure
    if (!selectedActivities || typeof selectedActivities !== 'object') {
      console.log('No selectedActivities or invalid type');
      return 0;
    }
    
    console.log('Processing selectedActivities structure');
    
    // Calculate from activities (handle both object and array formats)
    if (selectedActivities.activities) {
      if (Array.isArray(selectedActivities.activities)) {
        selectedActivities.activities.forEach((activity: any) => {
          if (activity && activity.selected && activity.estimated_hours) {
            console.log('Adding array activity hours:', activity.estimated_hours);
            totalHours += Number(activity.estimated_hours);
          }
        });
      } else if (typeof selectedActivities.activities === 'object') {
        Object.values(selectedActivities.activities).forEach((activity: any) => {
          if (activity && activity.selected && activity.estimated_hours) {
            console.log('Adding object activity hours:', activity.estimated_hours);
            totalHours += Number(activity.estimated_hours);
          }
        });
      }
    }
    
    // Calculate from sub-activities (handle both object and array formats)
    if (selectedActivities.subActivities) {
      if (Array.isArray(selectedActivities.subActivities)) {
        selectedActivities.subActivities.forEach((subActivity: any) => {
          if (subActivity && subActivity.estimated_hours) {
            // Check if selected property exists and is true, or if it doesn't exist assume it's selected
            const isSelected = subActivity.selected !== undefined ? subActivity.selected : true;
            if (isSelected) {
              console.log('Adding array subActivity hours:', subActivity.estimated_hours);
              totalHours += Number(subActivity.estimated_hours);
            }
          }
        });
      } else if (typeof selectedActivities.subActivities === 'object') {
        Object.values(selectedActivities.subActivities).forEach((subActivity: any) => {
          if (subActivity && subActivity.estimated_hours) {
            // Check if selected property exists and is true, or if it doesn't exist assume it's selected
            const isSelected = subActivity.selected !== undefined ? subActivity.selected : true;
            if (isSelected) {
              console.log('Adding object subActivity hours:', subActivity.estimated_hours);
              totalHours += Number(subActivity.estimated_hours);
            }
          }
        });
      }
    }
    
    // Handle direct activity structure (activity ID as key)
    Object.entries(selectedActivities).forEach(([key, value]: [string, any]) => {
      if (key !== 'activities' && key !== 'subActivities' && value && typeof value === 'object') {
        // Check if this is an activity with estimated_hours
        if (value.selected && value.estimated_hours) {
          console.log('Adding direct activity hours:', value.estimated_hours);
          totalHours += Number(value.estimated_hours);
        }
        
        // Check if this activity has subActivities
        if (value.subActivities && typeof value.subActivities === 'object') {
          Object.entries(value.subActivities).forEach(([subKey, subValue]: [string, any]) => {
            if (subValue) {
              if (typeof subValue === 'boolean' && subValue) {
                console.log('Found boolean subActivity (selected) but no hours available');
              } else if (typeof subValue === 'object' && subValue.selected && subValue.estimated_hours) {
                console.log('Adding nested subActivity hours:', subValue.estimated_hours);
                totalHours += Number(subValue.estimated_hours);
              }
            }
          });
        }
      }
    });
    
    console.log('Final calculated hours:', totalHours);
    return totalHours;
  };

  const calculateTotalCost = (selectedActivities: any, serviceOfferingActivities: any, ratePerHour: number) => {
    const totalHours = calculateTotalHours(selectedActivities, serviceOfferingActivities);
    return totalHours * ratePerHour;
  };

  const getAssigneeRole = (assigneeId?: string) => {
    if (!assigneeId) return null;
    const consultant = consultants.find(c => c.user_id === assigneeId);
    return consultant?.title || null;
  };

  const getAssigneeRate = (assigneeId?: string) => {
    if (!assigneeId) return null;
    const consultant = consultants.find(c => c.user_id === assigneeId);
    return consultant ? (consultant as any).rate_per_hour || 0 : null;
  };

  const renderSelectedActivities = (selectedActivities: any) => {
    if (!selectedActivities || typeof selectedActivities !== 'object') {
      return <p className="text-muted-foreground">No activities selected</p>;
    }

    const selectedItems: Array<{ name: string; hours?: number; type: 'activity' | 'subactivity' }> = [];

    // Extract selected activities
    if (selectedActivities.activities) {
      if (Array.isArray(selectedActivities.activities)) {
        selectedActivities.activities.forEach((activity: any) => {
          if (activity.selected) {
            selectedItems.push({ name: activity.name, hours: activity.estimated_hours, type: 'activity' });
          }
        });
      } else if (typeof selectedActivities.activities === 'object') {
        Object.values(selectedActivities.activities).forEach((activity: any) => {
          if (activity.selected) {
            selectedItems.push({ name: activity.name, hours: activity.estimated_hours, type: 'activity' });
          }
        });
      }
    }

    // Extract selected sub-activities
    if (selectedActivities.subActivities) {
      if (Array.isArray(selectedActivities.subActivities)) {
        selectedActivities.subActivities.forEach((subActivity: any) => {
          if (subActivity.selected) {
            selectedItems.push({ name: subActivity.name, hours: subActivity.estimated_hours, type: 'subactivity' });
          }
        });
      } else if (typeof selectedActivities.subActivities === 'object') {
        Object.values(selectedActivities.subActivities).forEach((subActivity: any) => {
          if (subActivity.selected) {
            selectedItems.push({ name: subActivity.name, hours: subActivity.estimated_hours, type: 'subactivity' });
          }
        });
      }
    }

    if (selectedItems.length === 0) {
      return <p className="text-muted-foreground">No activities selected</p>;
    }

    return (
      <div className="space-y-2">
        {selectedItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-600" />
              <span className="font-medium">{item.name}</span>
              {item.type === 'subactivity' && (
                <span className="text-xs text-muted-foreground">(Sub-activity)</span>
              )}
            </div>
            {item.hours && (
              <span className="text-sm font-medium text-primary">{item.hours}h</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Function to check if current user can access timesheet
  const canAccessTimesheet = (request: Request) => {
    if (!currentUserId) return false;
    
    // Admin can always access
    if (currentUserRole === 'Admin') return true;
    
    // Assignee can access
    if (request.assignee_id === currentUserId) return true;
    
    // Advisory Consultant, Advisory Service Lead, and Advisory Service Head can access
    if (['Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head'].includes(currentUserTitle || '')) {
      // If user has advisory services, check if they match the request's advisory services
      if (currentUserProfile?.advisory_services) {
        const hasMatchingService = currentUserProfile.advisory_services.some((service: string) => 
          request.advisory_services.includes(service)
        );
        return hasMatchingService;
      }
      // If no advisory services configured, allow access for these titles
      return true;
    }
    
    return false;
  };

  // Function to check if current user can edit timesheet
  const canEditTimesheet = (request: Request) => {
    if (!currentUserId) return false;
    
    // Admin can edit
    if (currentUserRole === 'Admin') return true;
    
    // Only assignee can edit
    return request.assignee_id === currentUserId;
  };

  const renderTimesheetSection = () => {
    if (!selectedRequest || !canAccessTimesheet(selectedRequest)) {
      return null;
    }

    const isReadOnly = !canEditTimesheet(selectedRequest);

    return (
      <TimesheetSection
        requestId={selectedRequest.id}
        selectedActivities={selectedRequest.selected_activities}
        timesheetData={selectedRequest.timesheet_data || {}}
        isReadOnly={isReadOnly}
        onTimesheetUpdate={(data) => {
          setSelectedRequest(prev => prev ? { ...prev, timesheet_data: data } : null);
        }}
      />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Oversight</CardTitle>
          <CardDescription>
            Monitor and manage all service requests across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Search by Request ID or assignee..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Requests Table */}
          {loading ? (
            <div className="text-center py-8">Loading requests...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px] text-center">Request ID</TableHead>
                    <TableHead className="w-[120px] text-center">Requestor</TableHead>
                    <TableHead className="w-[120px] text-center">Assignee</TableHead>
                    <TableHead className="w-[200px] text-center">Support Required</TableHead>
                    <TableHead className="w-[140px] text-center">Status</TableHead>
                    <TableHead className="w-[120px] text-center">Request Raised Date</TableHead>
                    <TableHead className="w-[80px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {currentRequests.map((request) => (
                     <TableRow 
                       key={request.id}
                       className="cursor-pointer hover:bg-muted/50"
                       onClick={() => openRequestDetails(request)}
                     >
                       <TableCell className="font-medium w-[120px] truncate">{request.request_id}</TableCell>
                       <TableCell className="w-[120px] truncate">{getRequestorDisplayName(request.requestor, request.requestor_id)}</TableCell>
                       <TableCell className="w-[120px] truncate">{request.current_assignee_name || request.assignee?.username || 'Unassigned'}</TableCell>
                       <TableCell className="w-[200px] truncate">
                         {request.selected_tools.length > 0 
                           ? request.selected_tools.map(tool => getToolDisplayName(tool, serviceOfferings)).join(', ')
                           : 'No tools selected'
                         }
                       </TableCell>
                       <TableCell className="w-[140px]">
                         <Badge className={getStatusColor(request.status)}>
                           {request.status}
                         </Badge>
                       </TableCell>
                       <TableCell className="w-[120px] truncate">
                         {new Date(request.submission_date).toLocaleDateString()}
                       </TableCell>
                       <TableCell className="w-[80px]">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={(e) => {
                             e.stopPropagation();
                             openRequestDetails(request);
                           }}
                         >
                           <Eye className="h-4 w-4" />
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {filteredRequests.length > itemsPerPage && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Details - {selectedRequest.request_id}</DialogTitle>
              <DialogDescription>
                Comprehensive view and management of the selected request
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Request Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Request ID:</strong> {selectedRequest.request_id}</p>
                    <p><strong>Requestor:</strong> {getRequestorDisplayName(selectedRequest.requestor, selectedRequest.requestor_id)}</p>
                    <p><strong>Current Assignee:</strong> {selectedRequest.current_assignee_name || 'Unassigned'}</p>
                    <p><strong>Original Assignee:</strong> {selectedRequest.original_assignee_name || 'Not set'}</p>
                     <p><strong>Status:</strong> {selectedRequest.status}</p>
                    <p><strong>Submission Date:</strong> {new Date(selectedRequest.submission_date).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Services & Tools</h4>
                  <div className="space-y-2 text-sm">
                     <p><strong>Advisory Services:</strong> {selectedRequest.advisory_services.map(service => getAdvisoryServiceDisplayName(service, advisoryServices)).join(', ')}</p>
                     <p><strong>Support Required:</strong> {selectedRequest.selected_tools.map(tool => getToolDisplayName(tool, serviceOfferings)).join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* Admin Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                <div>
                  <Label htmlFor="status-override">Override Status</Label>
                  <div className="flex gap-2">
                     <Select value={newStatus} onValueChange={setNewStatus}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {availableTransitions
                           .filter(canTransition)
                           .map(transition => (
                             <SelectItem key={transition.to_status} value={transition.to_status}>
                               {transition.to_status}
                             </SelectItem>
                           ))}
                       </SelectContent>
                     </Select>
                    <Button onClick={updateRequestStatus} size="sm">
                      Save Status
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reassign">Reassign To</Label>
                  <div className="flex gap-2">
                    <Select value={newAssignee} onValueChange={setNewAssignee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select consultant" />
                      </SelectTrigger>
                       <SelectContent className="bg-background border z-50">
                          {getFilteredConsultants().map(consultant => (
                            <SelectItem key={consultant.user_id} value={consultant.user_id}>
                              {consultant.name} ({consultant.title})
                            </SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                    <Button onClick={reassignRequest} size="sm">
                      <User className="h-4 w-4" />
                      Reassign
                    </Button>
                  </div>
                </div>
              </div>

              {/* Request Data */}
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

              {/* Service Specific Data */}
              <div>
                <h4 className="font-semibold mb-2">Service Details</h4>
                <div className="bg-muted/10 p-4 rounded-lg space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Service Name:</strong> {getAdvisoryServiceDisplayName(selectedRequest.service_specific_data?.serviceId || selectedRequest.service_specific_data?.serviceName, advisoryServices) || 'N/A'}</p>
                      <p><strong>Expected Start Date:</strong> {selectedRequest.service_specific_data?.expectedStartDate ? new Date(selectedRequest.service_specific_data.expectedStartDate).toLocaleDateString() : 'N/A'}</p>
                      <p><strong>Duration:</strong> {selectedRequest.service_specific_data?.estimatedDuration || 'N/A'}</p>
                    </div>
                    <div>
                      <p><strong>Priority:</strong> {selectedRequest.service_specific_data?.priority || 'N/A'}</p>
                      <p><strong>Budget:</strong> {selectedRequest.service_specific_data?.budget || 'N/A'}</p>
                      <p><strong>Business Impact:</strong> {selectedRequest.service_specific_data?.expectedBusinessImpact || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div>
                <h4 className="font-semibold mb-2">Comments</h4>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {requestComments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-muted/10 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm">{comment.user?.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button onClick={addComment} size="sm">
                    Add Comment
                  </Button>
                </div>
              </div>

              {/* Rate and Estimation Section - Show for requests that have moved to Review or beyond */}
              {selectedRequest.selected_activities && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg p-6">
                    <h4 className="text-xl font-bold flex items-center gap-2 mb-4 text-primary">
                      <DollarSign className="h-6 w-6" />
                      Rate and Estimation
                    </h4>
                    
                    <div className="grid md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Total Hours
                          {selectedRequest.estimation_saved_at && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Frozen
                            </Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-secondary">
                          {(() => {
                            const calculatedHours = calculateTotalHours(selectedRequest.selected_activities, selectedRequest.service_offering_activities);
                            
                            // If estimation is saved but saved_total_hours is 0 or null, and we have calculated hours > 0, use calculated
                            let displayHours;
                            if (selectedRequest.estimation_saved_at) {
                              // For frozen estimates, prefer saved value, but fallback to calculated if saved is 0
                              displayHours = (selectedRequest.saved_total_hours && selectedRequest.saved_total_hours > 0) 
                                ? selectedRequest.saved_total_hours 
                                : calculatedHours;
                            } else {
                              // For non-frozen estimates, always use calculated
                              displayHours = calculatedHours;
                            }
                            
                            console.log('Total Hours Debug:', {
                              status: selectedRequest.status,
                              estimationSaved: selectedRequest.estimation_saved_at,
                              selectedActivities: selectedRequest.selected_activities,
                              serviceOfferingActivities: selectedRequest.service_offering_activities,
                              calculatedHours,
                              savedTotalHours: selectedRequest.saved_total_hours,
                              displayHours,
                              logic: selectedRequest.estimation_saved_at ? 'frozen-fallback' : 'calculated'
                            });
                            
                            // Additional debugging: Check if there are any activities with estimated_hours
                            if (selectedRequest.selected_activities) {
                              console.log('Detailed activity analysis:');
                              console.log('Type of selected_activities:', typeof selectedRequest.selected_activities);
                              console.log('Keys in selected_activities:', Object.keys(selectedRequest.selected_activities));
                              
                              // Look for any estimated_hours values anywhere in the structure
                              const findEstimatedHours = (obj: any, path = '') => {
                                if (obj && typeof obj === 'object') {
                                  Object.entries(obj).forEach(([key, value]) => {
                                    const currentPath = path ? `${path}.${key}` : key;
                                    if (key === 'estimated_hours') {
                                      console.log(`Found estimated_hours at ${currentPath}:`, value);
                                    } else if (typeof value === 'object' && value !== null) {
                                      findEstimatedHours(value, currentPath);
                                    }
                                  });
                                }
                              };
                              
                              findEstimatedHours(selectedRequest.selected_activities);
                              
                              if (selectedRequest.service_offering_activities) {
                                console.log('Also checking service_offering_activities:');
                                findEstimatedHours(selectedRequest.service_offering_activities);
                              }
                            }
                            
                            return displayHours;
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedRequest.estimation_saved_at ? 'Frozen during estimation' : 'Sum of selected activities hours'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Total PD Estimate
                          {selectedRequest.estimation_saved_at && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Frozen
                            </Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {(() => {
                            const calculatedPD = calculateTotalPDEstimate(selectedRequest.selected_activities, selectedRequest.service_offering_activities);
                            
                            // If estimation is saved but saved_total_pd_estimate is 0 or null, and we have calculated PD > 0, use calculated
                            let displayPD;
                            if (selectedRequest.estimation_saved_at) {
                              // For frozen estimates, prefer saved value, but fallback to calculated if saved is 0
                              displayPD = (selectedRequest.saved_total_pd_estimate && selectedRequest.saved_total_pd_estimate > 0) 
                                ? selectedRequest.saved_total_pd_estimate 
                                : calculatedPD;
                            } else {
                              // For non-frozen estimates, always use calculated
                              displayPD = calculatedPD;
                            }
                            
                            console.log('Total PD Debug:', {
                              calculatedPD,
                              savedTotalPD: selectedRequest.saved_total_pd_estimate,
                              displayPD,
                              logic: selectedRequest.estimation_saved_at ? 'frozen-fallback' : 'calculated'
                            });
                            
                            return displayPD;
                          })()} PD
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedRequest.estimation_saved_at ? 'Frozen during estimation' : 'Total hours ÷ 8 (Person Days)'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <User className="h-4 w-4" />
                          Assignee Billability Role
                        </div>
                        <div className="text-lg font-semibold text-foreground">
                          {selectedRequest.status === 'Estimation' 
                            ? (getAssigneeRole(selectedRequest.assignee_id) || 'Not assigned')
                            : (selectedRequest.saved_assignee_role || getAssigneeRole(selectedRequest.assignee_id) || 'Not assigned')
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedRequest.status === 'Estimation' 
                            ? 'Current billability role designation'
                            : 'Frozen billability role (saved during estimation)'
                          }
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          Rate for the Assignee
                        </div>
                        <div className="text-lg font-semibold text-green-600">
                          ${getAssigneeRate(selectedRequest.assignee_id) || 0}/hour
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Hourly billing rate
                        </div>
                      </div>
                    </div>
                    
                    {getAssigneeRate(selectedRequest.assignee_id) && calculateTotalHours(selectedRequest.selected_activities, selectedRequest.service_offering_activities) > 0 && (
                      <div className="mt-4 pt-4 border-t border-primary/20">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-muted-foreground">Estimated Total Cost:</span>
                          <span className="text-xl font-bold text-green-600">
                            ${calculateTotalCost(selectedRequest.selected_activities, selectedRequest.service_offering_activities, getAssigneeRate(selectedRequest.assignee_id) || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span>({calculateTotalHours(selectedRequest.selected_activities, selectedRequest.service_offering_activities)} hours × ${getAssigneeRate(selectedRequest.assignee_id) || 0}/hour)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Implementation Start Date - Show for requests with status "Implementing" and subsequent statuses */}
              {['Implementing', 'Awaiting Feedback', 'Feedback Received', 'Implemented'].includes(selectedRequest.status) && selectedRequest.implementation_start_date && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold flex items-center gap-2 mb-2 text-green-700">
                      <Calendar className="h-5 w-5" />
                      Implementation Start Date
                    </h4>
                    <div className="text-base font-medium text-green-800">
                      {new Date(selectedRequest.implementation_start_date).toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      Implementation phase began when status changed from Approval to Implementing
                    </div>
                  </div>
                </div>
              )}

              {/* Timesheet Section - Show for requests with status "Implementing" */}
              {selectedRequest.status === 'Implementing' && selectedRequest.selected_activities && renderTimesheetSection()}
              

              {/* Activities Section - Show selected activities in read-only mode */}
              {selectedRequest.selected_activities && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20 rounded-lg p-6">
                    <h4 className="text-xl font-bold flex items-center gap-2 mb-4 text-secondary">
                      <CheckSquare className="h-6 w-6" />
                      Selected Activities & Sub-activities
                    </h4>
                    <div className="space-y-4">
                      {renderSelectedActivities(selectedRequest.selected_activities)}
                    </div>
                  </div>
                </div>
              )}

              {/* History Section */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Request History
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {requestHistory.map((entry) => (
                    <div key={entry.id} className="p-3 bg-muted/10 rounded-lg text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">{entry.action}</span>
                          {entry.old_value && entry.new_value && (
                            <span className="text-muted-foreground">
                              {' '}from "{entry.old_value}" to "{entry.new_value}"
                            </span>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            by {entry.performer?.username}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.performed_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};