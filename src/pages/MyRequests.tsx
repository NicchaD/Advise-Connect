import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import RequestFeedbackForm from '@/components/RequestFeedbackForm';
import { RequestFeedbackSection } from '@/components/RequestFeedbackSection';
import RequestTimeline from '@/components/RequestTimeline';
import { TimesheetSection } from '@/components/TimesheetSection';
import { RequestComments } from '@/components/RequestComments';

// Activities Details Section Component
const ActivitiesDetailsSection: React.FC<{ timesheetData: any; requestId: string }> = ({ timesheetData, requestId }) => {
  const [subActivityNames, setSubActivityNames] = useState<Record<string, string>>({});

  // Extract unique sub-activity IDs from timesheet data
  const subActivityIds = useMemo(() => {
    const ids = new Set<string>();
    Object.entries(timesheetData || {}).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([activityKey, activityValue]) => {
          if (typeof activityValue === 'boolean') {
            // Extract sub-activity ID from the unique key format: subActivityId-day0-part1
            const subActivityId = activityKey.split('-day')[0];
            ids.add(subActivityId);
          }
        });
      }
    });
    return Array.from(ids);
  }, [timesheetData]);

  // Fetch sub-activity names
  useEffect(() => {
    const fetchSubActivityNames = async () => {
      if (subActivityIds.length === 0) return;
      
      try {
        const { data: subActivities, error } = await supabase
          .from('sub_activities')
          .select('id, name')
          .in('id', subActivityIds);
        
        if (error) {
          console.error('Error fetching sub-activity names:', error);
          return;
        }
        
        const nameMap: Record<string, string> = {};
        subActivities?.forEach(subActivity => {
          nameMap[subActivity.id] = subActivity.name;
        });
        
        setSubActivityNames(nameMap);
        console.log('Fetched sub-activity names:', nameMap);
      } catch (error) {
        console.error('Error fetching sub-activity names:', error);
      }
    };
    
    fetchSubActivityNames();
  }, [subActivityIds, requestId]);

  // Process timesheet data to get completed and non-completed activities
  const { groupedCompleted, groupedNonCompleted, totalActivities, completedCount, pendingCount } = useMemo(() => {
    const completedActivities: any[] = [];
    const nonCompletedActivities: any[] = [];
    
    // Process the timesheet data to extract activity information
    Object.entries(timesheetData || {}).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle day activities with unique keys
        Object.entries(value).forEach(([activityKey, activityValue]) => {
          if (typeof activityValue === 'boolean') {
            // Extract sub-activity ID from the unique key
            const subActivityId = activityKey.split('-day')[0];
            const activityName = subActivityNames[subActivityId] || subActivityId;
            
            // This is a completion status for a day activity
            const activityInfo = {
              key: activityKey,
              id: subActivityId,
              name: activityName,
              dayInfo: key,
              completed: activityValue
            };
            
            if (activityValue) {
              completedActivities.push(activityInfo);
            } else {
              nonCompletedActivities.push(activityInfo);
            }
          }
        });
      }
    });
    
    // Remove duplicates and group by activity name
    const groupedCompleted: Record<string, any> = {};
    const groupedNonCompleted: Record<string, any> = {};
    
    completedActivities.forEach(activity => {
      if (!groupedCompleted[activity.name]) {
        groupedCompleted[activity.name] = {
          name: activity.name,
          id: activity.id,
          activities: []
        };
      }
      groupedCompleted[activity.name].activities.push(activity);
    });
    
    nonCompletedActivities.forEach(activity => {
      if (!groupedNonCompleted[activity.name]) {
        groupedNonCompleted[activity.name] = {
          name: activity.name,
          id: activity.id,
          activities: []
        };
      }
      groupedNonCompleted[activity.name].activities.push(activity);
    });

    // Calculate statistics
    let totalActivities = 0;
    let completedCount = 0;
    let pendingCount = 0;
    
    Object.values(timesheetData || {}).forEach(dayData => {
      if (typeof dayData === 'object' && dayData !== null) {
        totalActivities += Object.keys(dayData).length;
        Object.values(dayData).forEach(value => {
          if (value === true) completedCount++;
          if (value === false) pendingCount++;
        });
      }
    });
    
    console.log('Activities Details:', {
      timesheetData,
      subActivityIds,
      subActivityNames,
      completedActivities,
      nonCompletedActivities,
      groupedCompleted,
      groupedNonCompleted
    });
    
    return { groupedCompleted, groupedNonCompleted, totalActivities, completedCount, pendingCount };
  }, [timesheetData, subActivityNames]);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-6 shadow-lg">
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Completed Activities */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <h4 className="text-lg font-semibold text-green-700">Completed Work</h4>
              <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                {Object.keys(groupedCompleted).length} activities
              </span>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.keys(groupedCompleted).length > 0 ? (
                Object.entries(groupedCompleted).map(([activityName, activityGroup]) => (
                  <div key={activityName} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-green-800">{activityGroup.name}</span>
                    </div>
                    <div className="text-xs text-green-600 ml-6">
                      {activityGroup.activities.length} day part{activityGroup.activities.length > 1 ? 's' : ''} completed
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="h-12 w-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No completed activities yet</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Non-Completed Activities */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <h4 className="text-lg font-semibold text-orange-700">Pending Work</h4>
              <span className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                {Object.keys(groupedNonCompleted).length} activities
              </span>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.keys(groupedNonCompleted).length > 0 ? (
                Object.entries(groupedNonCompleted).map(([activityName, activityGroup]) => (
                  <div key={activityName} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-4 w-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-orange-800">{activityGroup.name}</span>
                    </div>
                    <div className="text-xs text-orange-600 ml-6">
                      {activityGroup.activities.length} day part{activityGroup.activities.length > 1 ? 's' : ''} pending
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="h-12 w-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>All activities completed!</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Summary Statistics */}
        <div className="mt-6 pt-4 border-t border-purple-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <div className="text-2xl font-bold text-purple-700">{totalActivities}</div>
              <div className="text-xs text-purple-600">Total Activities</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-xs text-green-600">Completed</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
              <div className="text-xs text-orange-600">Pending</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  selected_activities?: any;
  service_offering_activities?: any;
  saved_total_hours?: number;
  saved_total_pd_estimate?: number;
  saved_total_cost?: number;
  saved_assignee_rate?: number;
  saved_assignee_role?: string;
  estimation_saved_at?: string;
  assignee_profile?: any;
  timesheet_data?: any;
  billability_percentage?: number;
  requestor_id?: string;
  assignee_id?: string;
  original_assignee_id?: string;
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

      const { data, error } = await supabase
        .from('requests')
        .select('*')
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

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRequest(null)}
        >
          <Card 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Request Details - {selectedRequest.request_id}</CardTitle>
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Project Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Project ID:</strong> {selectedRequest.project_data?.projectId || 'Not provided'}</p>
                    <p><strong>Project Name:</strong> {selectedRequest.project_data?.projectName || 'Not provided'}</p>
                    <p><strong>Account:</strong> {selectedRequest.project_data?.accountName || 'Not provided'}</p>
                    <p><strong>Owning Unit:</strong> {selectedRequest.project_data?.projectOwningUnit || 'Not provided'}</p>
                    <p><strong>Delivery Excellence POC:</strong> {selectedRequest.project_data?.deliveryExcellencePOC || 'Not provided'}</p>
                    <p><strong>PM ID:</strong> {selectedRequest.project_data?.projectPM || 'Not provided'}</p>
                    <p><strong>POC Email:</strong> {selectedRequest.project_data?.projectPOCEmail || 'Not provided'}</p>
                    {selectedRequest.project_data?.los && (
                      <p><strong>Line of Service:</strong> {selectedRequest.project_data.los}</p>
                    )}
                    {selectedRequest.project_data?.vertical && (
                      <p><strong>Vertical:</strong> {selectedRequest.project_data.vertical}</p>
                    )}
                    {selectedRequest.project_data?.businessUnit && (
                      <p><strong>Business Unit:</strong> {selectedRequest.project_data.businessUnit}</p>
                    )}
                    {selectedRequest.project_data?.marketUnit && (
                      <p><strong>Market Unit:</strong> {selectedRequest.project_data.marketUnit}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Service Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Service:</strong> {getServiceNamesFromRequest(selectedRequest)}</p>
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
                  <h4 className="font-semibold mb-3">Requirements</h4>
                  <p className="text-sm bg-muted p-4 rounded-lg">{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.service_specific_data?.expectedBusinessImpact && (
                <div>
                  <h4 className="font-semibold mb-3">Expected Business Impact</h4>
                  <p className="text-sm bg-muted p-4 rounded-lg">{selectedRequest.service_specific_data.expectedBusinessImpact}</p>
                </div>
              )}

              {/* Show service offerings from service_specific_data if available */}
              {selectedRequest.service_specific_data?.selectedOfferings?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Selected Offerings</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.service_specific_data.selectedOfferings.map((offering: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {getToolDisplayName(offering)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Fallback to selected_tools if selectedOfferings is not available */}
              {(!selectedRequest.service_specific_data?.selectedOfferings || selectedRequest.service_specific_data.selectedOfferings.length === 0) && selectedRequest.selected_tools?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Selected Tools</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.selected_tools.map((tool, index) => (
                      <Badge key={index} variant="outline">
                        {getToolDisplayName(tool)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible Activities Details Section - Show for Awaiting Feedback status and later */}
              {['Awaiting Feedback', 'Closed'].includes(selectedRequest.status) && selectedRequest.timesheet_data && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-4 shadow-sm">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-primary">
                      <Calculator className="h-6 w-6" />
                      Rate and Estimation
                      {selectedRequest.estimation_saved_at && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {selectedRequest.status === 'Estimation' ? 'Frozen' : 'Frozen on ' + format(new Date(selectedRequest.estimation_saved_at), 'MMM dd, yyyy')}
                        </Badge>
                      )}
                      {!selectedRequest.estimation_saved_at && selectedRequest.status === 'Estimation' && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Editable - Click "Save Activities" to freeze values
                        </Badge>
                      )}
                    </h3>
                    
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
                              return displayHours;
                            })()}
                         </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedRequest.estimation_saved_at ? 'Frozen during estimation' : 'Total estimated hours'}
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
                              return displayPD;
                            })()} PD
                         </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedRequest.estimation_saved_at ? 'Frozen during estimation' : 'Total hours ÷ 8 (Person Days)'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <UserIcon className="h-4 w-4" />
                          Assignee Billability Role
                          {selectedRequest.estimation_saved_at && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Frozen
                            </Badge>
                          )}
                        </div>
                        <div className="text-lg font-semibold text-foreground">
                          {selectedRequest.status === 'Estimation' && !selectedRequest.estimation_saved_at
                            ? (assigneeInfo?.designation || assigneeInfo?.title || 'Not assigned')
                            : (selectedRequest.saved_assignee_role || assigneeInfo?.designation || assigneeInfo?.title || 'Not assigned')
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedRequest.status === 'Estimation' && !selectedRequest.estimation_saved_at
                            ? 'Current billability role designation'
                            : 'Frozen billability role (saved during estimation)'
                          }
                        </div>
                      </div>
                      
                       <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          Rate for the Assignee
                          {selectedRequest.estimation_saved_at && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Frozen
                            </Badge>
                          )}
                        </div>
                        <div className="text-lg font-semibold text-green-600">
                          ${selectedRequest.status === 'Estimation' && !selectedRequest.estimation_saved_at
                            ? (assigneeInfo?.rate_per_hour || 0)
                            : (selectedRequest.saved_assignee_rate || assigneeInfo?.rate_per_hour || 0)
                          }/hour
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedRequest.estimation_saved_at ? 'Frozen during estimation' : 'Hourly billing rate'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Always show total cost section when we have hours or cost data */}
                    {(selectedRequest.status === 'Estimation' || 
                      selectedRequest.saved_total_cost || 
                      selectedRequest.saved_total_hours ||
                      calculatedHours > 0 ||
                      ['Review', 'Approved', 'Approval', 'Implementing', 'Implemented', 'Awaiting Feedback', 'Closed'].includes(selectedRequest.status)) && (
                      <div className="mt-4 pt-4 border-t border-primary/20">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-muted-foreground">Estimated Total Cost:</span>
                          <span className="text-xl font-bold text-green-600">
                             {(() => {
                               let cost = 0;
                               
                               // First try to use saved cost if available
                               if (selectedRequest.saved_total_cost && selectedRequest.saved_total_cost > 0) {
                                 cost = selectedRequest.saved_total_cost;
                               } 
                               // Otherwise calculate cost using current rate and calculated hours
                               else {
                                 const rate = selectedRequest.saved_assignee_rate || assigneeInfo?.rate_per_hour || 0;
                                 if (rate > 0) {
                                   // Use the calculated hours from the hours calculation
                                   const hours = calculateTotalHours(selectedRequest.selected_activities, selectedRequest.service_offering_activities);
                                   cost = hours * rate;
                                   console.log('MyRequests Cost Calculation:', { 
                                     hours, 
                                     calculatedHours,
                                     rate, 
                                     cost,
                                     savedRate: selectedRequest.saved_assignee_rate,
                                     currentRate: assigneeInfo?.rate_per_hour 
                                   });
                                 }
                               }
                               
                               return cost > 0 ? `$${cost.toLocaleString()}` : 'Rate not set';
                             })()}
                           </span>
                         </div>
                         <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                           <span>
                             {(() => {
                               // Get the calculated hours
                               const hours = calculateTotalHours(selectedRequest.selected_activities, selectedRequest.service_offering_activities);
                               
                               // Get the rate (saved rate takes precedence, then current rate)
                               const rate = selectedRequest.saved_assignee_rate || assigneeInfo?.rate_per_hour || 0;
                               
                               console.log('MyRequests Cost Breakdown:', { 
                                 hours, 
                                 calculatedHours, 
                                 rate,
                                 savedRate: selectedRequest.saved_assignee_rate,
                                 currentRate: assigneeInfo?.rate_per_hour
                               });
                               
                               return rate > 0 
                                 ? `(${hours} hours × $${rate}/hour)`
                                 : `(${hours} hours × Rate not set)`;
                             })()}
                           </span>
                           {(!assigneeInfo?.rate_per_hour || assigneeInfo.rate_per_hour === 0) && selectedRequest.status === 'Estimation' && (
                             <span className="text-orange-600 font-medium">
                               Rate not available - contact admin for accurate costing
                             </span>
                           )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Collapsible Billability Percentage Section - Show when status is Review or after Review */}
              {(selectedRequest.status === 'Review' || 
                ['Approved', 'Implementing', 'Implemented', 'Awaiting Feedback', 'Closed'].includes(selectedRequest.status) ||
                selectedRequest.billability_percentage !== null && selectedRequest.billability_percentage !== undefined) && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-4 shadow-lg">
                    <button
                      onClick={() => {
                        const currentState = showBillabilityPercentage[selectedRequest.id] || false;
                        setShowBillabilityPercentage(prev => ({
                          ...prev,
                          [selectedRequest.id]: !currentState
                        }));
                      }}
                      className="w-full flex items-center justify-between text-left hover:bg-green-100 rounded-lg p-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Calculator className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-semibold text-green-700">Billability Percentage</h3>
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-600 border-green-300">
                          {showBillabilityPercentage[selectedRequest.id] ? 'Expanded' : 'Collapsed'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-500">
                          {showBillabilityPercentage[selectedRequest.id] ? 'Click to collapse' : 'Click to expand billability details'}
                        </span>
                        <svg 
                          className={`h-5 w-5 text-green-500 transition-transform duration-200 ${
                            showBillabilityPercentage[selectedRequest.id] ? 'rotate-180' : ''
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    
                    {showBillabilityPercentage[selectedRequest.id] && (
                      <div className="mt-4 pt-4 border-t border-green-200 animate-in slide-in-from-top-2 duration-300">
                     
                     {(() => {
                       // Read-only display for requestors (they can't edit billability percentage)
                       return (
                       <div className="space-y-2">
                         <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                           <DollarSign className="h-4 w-4" />
                           Billability Percentage
                         </div>
                         <div className="text-3xl font-bold text-green-700 bg-white p-4 rounded-lg border-2 border-green-200">
                           {selectedRequest.billability_percentage !== null && selectedRequest.billability_percentage !== undefined 
                             ? `${selectedRequest.billability_percentage}%` 
                             : 'Not set'}
                         </div>
                         {(selectedRequest.billability_percentage === null || selectedRequest.billability_percentage === undefined) && (
                           <div className="text-sm text-orange-600 font-medium">
                             Waiting for assignee to set billability percentage during Review status
                           </div>
                         )}
                       </div>
                     );
                   })()}
                   
                   {/* Auto-calculated Billable Assignment Days */}
                   {(selectedRequest.billability_percentage !== null && selectedRequest.billability_percentage !== undefined && selectedRequest.billability_percentage > 0) && (
                     <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6 shadow-lg">
                       <div className="space-y-4">
                         <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                           <Clock className="h-4 w-4" />
                           Number of days of billable assignment with the above allocation
                         </div>
                         <div className="text-3xl font-bold text-blue-700 bg-white p-4 rounded-lg border-2 border-blue-200">
                           {(() => {
                             // Calculate billable assignment days
                             const totalHours = calculatedHours || 0;
                             const billabilityPercentage = selectedRequest.billability_percentage || 0;
                             
                             if (totalHours > 0 && billabilityPercentage > 0) {
                               // Assuming 8 hours per working day
                               const hoursPerDay = 8;
                               // Calculate effective hours per day based on billability percentage
                               const effectiveHoursPerDay = (hoursPerDay * billabilityPercentage) / 100;
                               // Calculate number of days needed
                               const daysNeeded = Math.ceil(totalHours / effectiveHoursPerDay);
                               
                               console.log('MyRequests - Billable Days Calculation:', {
                                 totalHours,
                                 billabilityPercentage,
                                 hoursPerDay,
                                 effectiveHoursPerDay,
                                 daysNeeded
                               });
                               
                               return `${daysNeeded} ${daysNeeded === 1 ? 'day' : 'days'}`;
                             }
                             
                             return 'Not calculated';
                           })()}
                         </div>
                         <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
                           <div className="flex items-start gap-2">
                             <div className="text-blue-600 mt-0.5">ℹ️</div>
                             <div className="w-full">
                               <button 
                                 onClick={() => {
                                   const currentState = showCalculationLogic[selectedRequest.id] || false;
                                   setShowCalculationLogic(prev => ({
                                     ...prev,
                                     [selectedRequest.id]: !currentState
                                   }));
                                 }}
                                 className="font-medium text-blue-800 hover:text-blue-900 cursor-pointer flex items-center gap-1 transition-colors"
                               >
                                 <span>Calculation Logic</span>
                                 <span className="text-xs">
                                   {showCalculationLogic[selectedRequest.id] ? '▼' : '▶'}
                                 </span>
                               </button>
                               {showCalculationLogic[selectedRequest.id] && (
                                 <div className="space-y-1 text-xs mt-2 animate-in slide-in-from-top-1 duration-200">
                                   <div>• Total hours needed: <span className="font-mono">{calculatedHours || 0} hours</span></div>
                                   <div>• Billability allocation: <span className="font-mono">{selectedRequest.billability_percentage || 0}%</span></div>
                                   <div>• Effective hours per day: <span className="font-mono">{selectedRequest.billability_percentage ? Math.round((8 * selectedRequest.billability_percentage / 100) * 10) / 10 : 0} hours/day</span></div>
                                   <div>• Working days needed: <span className="font-mono">⌈{calculatedHours || 0} ÷ {selectedRequest.billability_percentage ? Math.round((8 * selectedRequest.billability_percentage / 100) * 10) / 10 : 0}⌉</span></div>
                                 </div>
                               )}
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Collapsible Activities Details Section - Show for Awaiting Feedback status and later */}
              {['Awaiting Feedback', 'Closed'].includes(selectedRequest.status) && selectedRequest.timesheet_data && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-4 shadow-sm">
                    <button
                      onClick={() => {
                        const currentState = showActivitiesDetails[selectedRequest.id] || false;
                        setShowActivitiesDetails(prev => ({
                          ...prev,
                          [selectedRequest.id]: !currentState
                        }));
                      }}
                      className="w-full flex items-center justify-between text-left hover:bg-purple-100 rounded-lg p-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-purple-700">Activities Details</h3>
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-600 border-purple-300">
                          {showActivitiesDetails[selectedRequest.id] ? 'Expanded' : 'Collapsed'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-purple-500">
                          {showActivitiesDetails[selectedRequest.id] ? 'Click to collapse' : 'Click to expand activities'}
                        </span>
                        <svg 
                          className={`h-5 w-5 text-purple-500 transition-transform duration-200 ${
                            showActivitiesDetails[selectedRequest.id] ? 'rotate-180' : ''
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    
                    {showActivitiesDetails[selectedRequest.id] && (
                      <div className="mt-4 pt-4 border-t border-purple-200 animate-in slide-in-from-top-2 duration-300">
                        <ActivitiesDetailsSection 
                          timesheetData={selectedRequest.timesheet_data} 
                          requestId={selectedRequest.id}
                        />
                      </div>
                    )}
                  </div>
                </div>
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

              {/* Feedback Section - Show when status is "Awaiting Feedback" */}
              {selectedRequest.status === 'Awaiting Feedback' && currentUserId && (
                <div>
                  <RequestFeedbackSection
                    requestId={selectedRequest.id}
                    requestorId={selectedRequest.requestor_id || currentUserId}
                    originalAssigneeId={selectedRequest.original_assignee_id || selectedRequest.assignee_id || null}
                    currentUserId={currentUserId}
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}