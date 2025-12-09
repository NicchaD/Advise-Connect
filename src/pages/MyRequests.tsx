/**
 * MyRequests.tsx - Request Management Dashboard
 * 
 * Main dashboard for users to view and manage their submitted requests.
 * Features: List view, detailed view, collapsible sections, real-time updates.
 * 
 * Section Order: Rate & Estimation → Activities Details → Billability → Feedback → Timeline → Comments
 * 
 * See /docs/MyRequests-Documentation.md for comprehensive documentation.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search,
  FileText,
  Clock,
  Calendar,
  Filter,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader,
  Plus,
  Calculator,
  MessageSquare,
  DollarSign,
  User as UserIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getRequestorDisplayName } from '@/lib/userUtils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import RequestFeedbackForm from '@/components/RequestFeedbackForm';
import { FeedbackSection } from '@/components/FeedbackSection';
import RequestTimeline from '@/components/RequestTimeline';
import { TimesheetSection } from '@/components/TimesheetSection';
import { RequestComments } from '@/components/RequestComments';
import { RateEstimationSection } from '@/components/RateEstimationSection';
import { BillabilityPercentageSection } from '@/components/BillabilityPercentageSection';
import { ActivitiesDetailsSection } from '@/components/ActivitiesDetailsSection';
import { RequestDetailsSection } from '@/components/RequestDetailsSection';
import type { Request, AssigneeInfo, getSectionVisibility } from '@/types/shared';

/**
 * REUSABLE COMPONENTS IMPLEMENTATION
 * 
 * This file now uses reusable components for common sections:
 * - RateEstimationSection: Rate calculations and cost display
 * - BillabilityPercentageSection: Reusable component (correct calculation logic)  
 * - ActivitiesDetailsSection: Activity progress tracking
 * 
 * These components eliminate code duplication across MyRequests, MyItems, and RequestOversight.
 */

// Mapping for tool/offering IDs to display names - for consistent UI display
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

export default function MyRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [advisoryServices, setAdvisoryServices] = useState<Record<string, string>>({});
  const [serviceOfferings, setServiceOfferings] = useState<Record<string, string>>({});
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [calculatedPD, setCalculatedPD] = useState<number>(0);
  const [assigneeInfo, setAssigneeInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showTimeline, setShowTimeline] = useState<Record<string, boolean>>({});
  const [showActivitiesDetails, setShowActivitiesDetails] = useState<Record<string, boolean>>({});
  const [showCalculationLogic, setShowCalculationLogic] = useState<Record<string, boolean>>({});
  const [showBillabilityPercentage, setShowBillabilityPercentage] = useState<Record<string, boolean>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchUserRequests();
    fetchAdvisoryServices();
    fetchServiceOfferings();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  const handleCreateNewRequest = () => {
    navigate('/', { state: { scrollToServices: true } });
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
      console.log('Loaded service offerings:', offeringsMap);
    } catch (error) {
      console.error('Failed to fetch service offerings:', error);
    }
  };

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

      // Set current user ID for comments
      setCurrentUserId(user.id);

      // Fetch user profile separately since all requests belong to the same user
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('user_id', user.id)
        .single();

      console.log('MyRequests: Fetched user profile:', userProfile);
      console.log('MyRequests: Profile error:', profileError);

      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('requestor_id', user.id)
        .order('submission_date', { ascending: false });

      if (error) throw error;
      
      // Attach the user profile to each request
      const requestsWithProfile = (data || []).map(request => ({
        ...request,
        requestor_profile: userProfile
      }));
      
      console.log('MyRequests: Requests with profile:', requestsWithProfile[0]);
      
      setRequests(requestsWithProfile);
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
    // First try dynamic data, then fallback to static mapping, then show the ID itself
    const displayName = serviceOfferings[toolId] || TOOL_ID_TO_NAME_MAP[toolId] || toolId;
    console.log(`Mapping tool ID ${toolId} to: ${displayName}`, { serviceOfferings, static: TOOL_ID_TO_NAME_MAP[toolId] });
    return displayName;
  };

  const getAdvisoryServiceDisplayName = (serviceId: string): string => {
    // First try dynamic data, then fallback to static mapping, then show the ID itself
    const displayName = advisoryServices[serviceId] || ADVISORY_SERVICE_ID_TO_NAME_MAP[serviceId] || serviceId;
    console.log(`Mapping service ID ${serviceId} to: ${displayName}`, { advisoryServices, static: ADVISORY_SERVICE_ID_TO_NAME_MAP[serviceId] });
    return displayName;
  };

  const getServiceNamesFromRequest = (request: Request): string => {
    // Get service names from advisory_services array
    if (request.advisory_services && request.advisory_services.length > 0) {
      return request.advisory_services
        .map(serviceId => getAdvisoryServiceDisplayName(serviceId))
        .join(', ');
    }
    
    // Fallback to service_specific_data if advisory_services is empty
    const serviceId = request.service_specific_data?.serviceId || request.service_specific_data?.serviceName;
    if (serviceId) {
      return getAdvisoryServiceDisplayName(serviceId);
    }
    
    return 'No service specified';
  };

  // Function to fetch sub-activity hours from database
  const fetchSubActivityHours = async (subActivityIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('sub_activities')
        .select('id, estimated_hours')
        .in('id', subActivityIds);
      
      if (error) {
        console.error('Error fetching sub-activity hours:', error);
        return {};
      }
      
      const hoursMap: Record<string, number> = {};
      data?.forEach(sub => {
        if (sub.estimated_hours) {
          hoursMap[sub.id] = sub.estimated_hours;
        }
      });
      
      return hoursMap;
    } catch (error) {
      console.error('Error in fetchSubActivityHours:', error);
      return {};
    }
  };

  // Async version that can fetch missing hours from database
  const calculateTotalHoursAsync = async (selectedActivities: any, serviceOfferingActivities?: any) => {
    let totalHours = 0;
    const missingSubActivityIds: string[] = [];
    
    // First, collect all boolean subActivity IDs that need database lookup
    if (selectedActivities && typeof selectedActivities === 'object') {
      Object.entries(selectedActivities).forEach(([key, value]: [string, any]) => {
        if (key !== 'activities' && key !== 'subActivities' && value && typeof value === 'object') {
          if (value.subActivities && typeof value.subActivities === 'object') {
            Object.entries(value.subActivities).forEach(([subKey, subValue]: [string, any]) => {
              if (typeof subValue === 'boolean' && subValue) {
                missingSubActivityIds.push(subKey);
              }
            });
          }
        }
      });
    }
    
    // Fetch hours for boolean subActivities
    let subActivityHoursMap: Record<string, number> = {};
    if (missingSubActivityIds.length > 0) {
      subActivityHoursMap = await fetchSubActivityHours(missingSubActivityIds);
    }
    
    // Now calculate total hours with the fetched data
    return calculateTotalHours(selectedActivities, serviceOfferingActivities, null, subActivityHoursMap);
  };

  const calculateTotalHours = (selectedActivities: any, serviceOfferingActivities?: any, allActivitiesData?: any, subActivityHoursMap?: Record<string, number>) => {
    let totalHours = 0;
    
    console.log('MyRequests calculateTotalHours called with:', { selectedActivities, serviceOfferingActivities });
    
    // Process selectedActivities - handle the actual data structure we're seeing
    if (selectedActivities && typeof selectedActivities === 'object') {
      // Check if there are direct subActivities at the top level
      if (selectedActivities.subActivities && typeof selectedActivities.subActivities === 'object') {
        console.log('MyRequests: Processing top-level subActivities');
        Object.entries(selectedActivities.subActivities).forEach(([subKey, subValue]: [string, any]) => {
          console.log('MyRequests: Processing subActivity:', subKey, subValue);
          if (subValue && typeof subValue === 'object' && subValue.selected && subValue.estimated_hours) {
            console.log('MyRequests: Adding hours from subActivity:', subValue.estimated_hours);
            totalHours += subValue.estimated_hours;
          }
        });
      }
      
      // Check if there are activities at the top level
      if (selectedActivities.activities && typeof selectedActivities.activities === 'object') {
        console.log('MyRequests: Processing top-level activities');
        Object.values(selectedActivities.activities).forEach((activity: any) => {
          if (activity && activity.selected && activity.estimated_hours) {
            console.log('MyRequests: Adding hours from activity:', activity.estimated_hours);
            totalHours += activity.estimated_hours;
          }
        });
      }
      
      // Handle nested structure (for compatibility with other data formats)
      Object.entries(selectedActivities).forEach(([key, value]: [string, any]) => {
        if (key !== 'activities' && key !== 'subActivities' && value && typeof value === 'object') {
          // Handle array format
          if (Array.isArray(value.activities)) {
            value.activities.forEach((activity: any) => {
              if (activity && activity.selected && activity.estimated_hours) {
                totalHours += activity.estimated_hours;
              }
              if (activity && activity.subActivities && Array.isArray(activity.subActivities)) {
                activity.subActivities.forEach((subActivity: any) => {
                  if (subActivity && subActivity.selected && subActivity.estimated_hours) {
                    totalHours += subActivity.estimated_hours;
                  }
                });
              }
            });
          }
          // Handle object format
          else if (value.activities && typeof value.activities === 'object') {
            Object.values(value.activities).forEach((activity: any) => {
              if (activity && activity.selected && activity.estimated_hours) {
                totalHours += activity.estimated_hours;
              }
              if (activity && activity.subActivities && typeof value.subActivities === 'object') {
                Object.values(value.subActivities).forEach((subActivity: any) => {
                  if (subActivity && subActivity.selected && subActivity.estimated_hours) {
                    totalHours += subActivity.estimated_hours;
                  }
                });
              }
            });
          }
          // Handle subActivities with boolean values (need database lookup)
          else if (value.subActivities && typeof value.subActivities === 'object') {
            Object.entries(value.subActivities).forEach(([subKey, subValue]: [string, any]) => {
              if (typeof subValue === 'boolean' && subValue && subActivityHoursMap && subActivityHoursMap[subKey]) {
                totalHours += subActivityHoursMap[subKey];
              }
            });
          }
        }
      });
    }
    
    // Process serviceOfferingActivities
    if (serviceOfferingActivities && typeof serviceOfferingActivities === 'object') {
      console.log('MyRequests: Processing serviceOfferingActivities');
      Object.values(serviceOfferingActivities).forEach((serviceData: any) => {
        if (serviceData && typeof serviceData === 'object') {
          // Handle array format
          if (Array.isArray(serviceData.activities)) {
            serviceData.activities.forEach((activity: any) => {
              if (activity && activity.selected && activity.estimated_hours) {
                totalHours += activity.estimated_hours;
              }
              if (activity && activity.subActivities && Array.isArray(activity.subActivities)) {
                activity.subActivities.forEach((subActivity: any) => {
                  if (subActivity && subActivity.selected && subActivity.estimated_hours) {
                    totalHours += subActivity.estimated_hours;
                  }
                });
              }
            });
          }
          // Handle object format
          else if (serviceData.activities && typeof serviceData.activities === 'object') {
            Object.values(serviceData.activities).forEach((activity: any) => {
              if (activity && activity.selected && activity.estimated_hours) {
                totalHours += activity.estimated_hours;
              }
              if (activity && activity.subActivities && typeof activity.subActivities === 'object') {
                Object.values(activity.subActivities).forEach((subActivity: any) => {
                  if (subActivity && subActivity.selected && subActivity.estimated_hours) {
                    totalHours += subActivity.estimated_hours;
                  }
                });
              }
            });
          }
          // Handle direct structure (single service offering)
          else if (serviceData.estimated_hours && serviceData.selected) {
            totalHours += serviceData.estimated_hours;
          }
        }
      });
    }
    
    console.log('MyRequests calculateTotalHours returning:', totalHours);
    return totalHours;
  };

  const calculateTotalCost = (selectedActivities: any, serviceOfferingActivities: any, ratePerHour: number) => {
    const hours = calculateTotalHours(selectedActivities, serviceOfferingActivities);
    return hours * ratePerHour;
  };

  // Calculate hours when selectedRequest changes
  useEffect(() => {
    if (selectedRequest) {
      console.log('MyRequests: selectedRequest data for calculation:', {
        selected_activities: selectedRequest.selected_activities,
        service_offering_activities: selectedRequest.service_offering_activities,
        saved_total_hours: selectedRequest.saved_total_hours,
        saved_total_pd_estimate: selectedRequest.saved_total_pd_estimate
      });

      // Check if we have any activities data or saved values
      if (selectedRequest.selected_activities || 
          selectedRequest.service_offering_activities || 
          selectedRequest.saved_total_hours) {
        
        const calculateHours = async () => {
          try {
            console.log('MyRequests: Detailed activities data:', {
              selected_activities: JSON.stringify(selectedRequest.selected_activities, null, 2),
              service_offering_activities: JSON.stringify(selectedRequest.service_offering_activities, null, 2)
            });
            
            const hours = await calculateTotalHoursAsync(
              selectedRequest.selected_activities, 
              selectedRequest.service_offering_activities
            );
            console.log('MyRequests: Calculated hours:', hours);
            
            // If async calculation returns 0, try direct synchronous calculation with debugging
            if (hours === 0) {
              console.log('MyRequests: Async returned 0, trying synchronous calculation...');
              const syncHours = calculateTotalHours(
                selectedRequest.selected_activities, 
                selectedRequest.service_offering_activities
              );
              console.log('MyRequests: Synchronous calculation result:', syncHours);
              
              // If still 0, use saved values if available
              if (syncHours === 0 && selectedRequest.saved_total_hours && selectedRequest.saved_total_hours > 0) {
                console.log('MyRequests: Using saved values instead');
                setCalculatedHours(selectedRequest.saved_total_hours);
                setCalculatedPD(selectedRequest.saved_total_pd_estimate || Math.round((selectedRequest.saved_total_hours / 8) * 100) / 100);
              } else {
                setCalculatedHours(syncHours);
                setCalculatedPD(Math.round((syncHours / 8) * 100) / 100);
              }
            } else {
              setCalculatedHours(hours);
              setCalculatedPD(Math.round((hours / 8) * 100) / 100);
            }
          } catch (error) {
            console.error('Error calculating hours:', error);
            // Fallback to saved values if available
            if (selectedRequest.saved_total_hours && selectedRequest.saved_total_hours > 0) {
              console.log('MyRequests: Using saved values as fallback');
              setCalculatedHours(selectedRequest.saved_total_hours);
              setCalculatedPD(selectedRequest.saved_total_pd_estimate || Math.round((selectedRequest.saved_total_hours / 8) * 100) / 100);
            } else {
              setCalculatedHours(0);
              setCalculatedPD(0);
            }
          }
        };
        
        calculateHours();
      } else {
        console.log('MyRequests: No activities data found, setting to 0');
        setCalculatedHours(0);
        setCalculatedPD(0);
      }
    } else {
      setCalculatedHours(0);
      setCalculatedPD(0);
    }
  }, [selectedRequest]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading your requests...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6 text-primary" />
            My Requests
          </CardTitle>
          <CardDescription>
            View and track your advisory service requests
          </CardDescription>
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
          <div className="space-y-4">
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
                            <p className="text-muted-foreground">Service: {getServiceNamesFromRequest(request)}</p>
                          </div>
                        </div>

                        {request.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {request.description}
                          </p>
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

      {/* Dialog for request details */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Request Details - {selectedRequest?.request_id}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Details Section - Reusable Component */}
              {(() => {
                const displayName = getRequestorDisplayName(selectedRequest.requestor_profile, selectedRequest.requestor_id);
                console.log('MyRequests: RequestDetailsSection props:', {
                  requestor_profile: selectedRequest.requestor_profile,
                  requestor_id: selectedRequest.requestor_id,
                  displayName
                });
                return (
                  <RequestDetailsSection
                    request={selectedRequest as Request}
                    requestorDisplayName={displayName}
                    advisoryServiceMap={advisoryServices}
                    serviceOfferingMap={serviceOfferings}
                    toolsMap={TOOL_ID_TO_NAME_MAP}
                    formatDate={(date) => format(new Date(date), 'PPP')}
                  />
                );
              })()}

              {/* Rate and Estimation Section - Show when any estimation data exists */}
              {(selectedRequest.status === 'Estimation' || 
                selectedRequest.saved_total_hours || 
                selectedRequest.estimation_saved_at ||
                calculatedHours > 0 ||
                (selectedRequest.selected_activities && Object.keys(selectedRequest.selected_activities).length > 0) ||
                (selectedRequest.service_offering_activities && Object.keys(selectedRequest.service_offering_activities).length > 0) ||
                ['Review', 'Approved', 'Approval', 'Implementing', 'Implemented', 'Awaiting Feedback', 'Closed'].includes(selectedRequest.status)) && (
                <RateEstimationSection
                  request={selectedRequest as Request}
                  assigneeInfo={assigneeInfo as AssigneeInfo}
                  calculatedHours={calculatedHours}
                  calculatedPD={calculatedPD}
                  variant="default"
                />
              )}

              {/* Billability Percentage Section - Show when status is Review or after Review */}
              {(selectedRequest.status === 'Review' || 
                ['Approved', 'Implementing', 'Implemented', 'Awaiting Feedback', 'Feedback Received', 'Closed'].includes(selectedRequest.status) ||
                selectedRequest.billability_percentage !== null && selectedRequest.billability_percentage !== undefined) && (
                <BillabilityPercentageSection
                  request={selectedRequest as Request}
                  assigneeInfo={assigneeInfo as AssigneeInfo}
                  calculatedHours={calculatedHours}
                  isCollapsible={true}
                  isExpanded={showBillabilityPercentage[selectedRequest.id] || false}
                  onToggle={() => setShowBillabilityPercentage(prev => ({
                    ...prev,
                    [selectedRequest.id]: !prev[selectedRequest.id]
                  }))}
                  showCalculationLogic={showCalculationLogic[selectedRequest.id] || false}
                  onCalculationLogicToggle={() => setShowCalculationLogic(prev => ({
                    ...prev,
                    [selectedRequest.id]: !prev[selectedRequest.id]
                  }))}
                />
              )}

              {/* Activities Details Section - Show for Awaiting Feedback status and later */}
              {['Awaiting Feedback', 'Feedback Received', 'Closed'].includes(selectedRequest.status) && selectedRequest.timesheet_data && (
                <ActivitiesDetailsSection
                  timesheetData={selectedRequest.timesheet_data}
                  requestId={selectedRequest.id}
                  isCollapsible={true}
                  isExpanded={showActivitiesDetails[selectedRequest.id] || false}
                  onToggle={() => setShowActivitiesDetails(prev => ({
                    ...prev,
                    [selectedRequest.id]: !prev[selectedRequest.id]
                  }))}
                />
              )}

              {/* Timesheet Section - Show for requests with status "Implementing" in read-only mode */}
              {selectedRequest.status === 'Implementing' && (selectedRequest.selected_activities || selectedRequest.service_offering_activities) && (
                <div className="space-y-4">
                  <TimesheetSection
                    requestId={selectedRequest.id}
                    selectedActivities={selectedRequest.selected_activities || selectedRequest.service_offering_activities}
                    timesheetData={selectedRequest.timesheet_data || {}}
                    isReadOnly={true}
                    billabilityPercentage={selectedRequest.billability_percentage || 100}
                    onTimesheetUpdate={(data) => {
                      // Read-only mode - no updates needed for requestors
                      console.log('Timesheet update (read-only):', data);
                    }}
                  />
                </div>
              )}

              {/* Feedback Section - Show when status is "Awaiting Feedback" or "Feedback Received" */}
              {(selectedRequest.status === 'Awaiting Feedback' || selectedRequest.status === 'Feedback Received') && currentUserId && (
                <FeedbackSection
                  request={selectedRequest as Request}
                  assigneeInfo={assigneeInfo as AssigneeInfo}
                  currentUserId={currentUserId}
                  currentUserRole={undefined}
                  isCollapsible={true}
                  isExpanded={showFeedback[selectedRequest.id] || false}
                  onToggle={() => setShowFeedback(prev => ({
                    ...prev,
                    [selectedRequest.id]: !prev[selectedRequest.id]
                  }))}
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
              )}

              {/* Collapsible Request Timeline */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-slate-300 rounded-lg p-4 shadow-sm">
                  <button
                    onClick={() => {
                      const currentState = showTimeline[selectedRequest.id] || false;
                      setShowTimeline(prev => ({
                        ...prev,
                        [selectedRequest.id]: !currentState
                      }));
                    }}
                    className="w-full flex items-center justify-between text-left hover:bg-slate-100 rounded-lg p-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-lg font-semibold text-slate-700">Request Timeline</h3>
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-300">
                        {showTimeline[selectedRequest.id] ? 'Expanded' : 'Collapsed'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">
                        {showTimeline[selectedRequest.id] ? 'Click to collapse' : 'Click to expand timeline'}
                      </span>
                      <svg 
                        className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${
                          showTimeline[selectedRequest.id] ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  
                  {showTimeline[selectedRequest.id] && (
                    <div className="mt-4 pt-4 border-t border-slate-200 animate-in slide-in-from-top-2 duration-300">
                      <RequestTimeline requestId={selectedRequest.id} />
                    </div>
                  )}
                </div>
              </div>

              {/* Comments Section - Always show for all requests */}
              {currentUserId && (
                <div className="space-y-4">
                  <RequestComments
                    requestId={selectedRequest.id}
                    currentUserId={currentUserId}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}