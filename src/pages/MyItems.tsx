import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusTransitionDropdown } from '@/components/StatusTransitionDropdown';
import { RequestComments } from '@/components/RequestComments';
import { ActivitiesSection } from '@/components/ActivitiesSection';
import { MultiServiceActivitiesSection } from '@/components/MultiServiceActivitiesSection';
import { RequestFeedbackSection } from '@/components/RequestFeedbackSection';
import { TimesheetSection } from '@/components/TimesheetSection';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserProfiles, getUserDisplayName, getRequestorDisplayName, createProfileLookupMap } from '@/lib/userUtils';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle,
  FileText, 
  UserIcon, 
  Calendar,
  ArrowRight,
  RefreshCw,
  Settings,
  Zap,
  Video,
  DollarSign,
  Calculator
} from 'lucide-react';
import { TruncatedText } from '@/components/ui/truncated-text';
import { EditableProjectDetails } from '@/components/EditableProjectDetails';
import { AISummarizeButton } from '@/components/AISummarizeButton';
import { useNavigate } from 'react-router-dom';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Request {
  id: string;
  request_id: string;
  status: string;
  description: string;
  submission_date: string;
  updated_at: string;
  project_data: any;
  service_specific_data: any;
  advisory_services: string[];
  selected_tools: string[];
  assignee_id?: string;
  requestor_id: string;
  original_assignee_id?: string;
  assigned_consultant_name?: string;
  requestor_profile?: {
    username: string;
    email: string;
  } | null;
  assignee_profile?: {
    username: string;
    email: string;
  } | null;
  selected_activities?: any;
  service_offering_activities?: any;
  saved_total_hours?: number;
  saved_total_cost?: number;
  saved_total_pd_estimate?: number;
  saved_assignee_rate?: number;
  saved_assignee_role?: string;
  estimation_saved_at?: string;
  timesheet_data?: any;
  allocation_percentage?: string;
  billability_percentage?: number;
  implementation_start_date?: string;
}

interface AssigneeInfo {
  title: string;
  rate_per_hour: number;
  designation?: string;
}

const STATUS_COLORS = {
  'New': 'bg-blue-500 hover:bg-blue-600',
  'Estimation': 'bg-purple-500 hover:bg-purple-600',
  'Review': 'bg-yellow-500 hover:bg-yellow-600',
  'Pending Review': 'bg-orange-500 hover:bg-orange-600',
  'Under Discussion': 'bg-orange-400 hover:bg-orange-500',
  'Pending Review by Advisory Head': 'bg-red-500 hover:bg-red-600',
  'Approved by Advisory Head': 'bg-teal-500 hover:bg-teal-600',
  'Approved': 'bg-teal-500 hover:bg-teal-600',
  'Approval': 'bg-emerald-600 hover:bg-emerald-700',
  'Implementing': 'bg-indigo-500 hover:bg-indigo-600',
  'Implemented': 'bg-green-500 hover:bg-green-600',
  'Awaiting Feedback': 'bg-amber-500 hover:bg-amber-600',
  'Feedback Received': 'bg-violet-600 hover:bg-violet-700',
  'Closed': 'bg-slate-600 hover:bg-slate-700',
  'On Hold': 'bg-gray-500 hover:bg-gray-600',
  'Cancelled': 'bg-red-600 hover:bg-red-700',
  'Reject': 'bg-red-600 hover:bg-red-700'
};

export default function MyItems() {
  const [actionRequiredRequests, setActionRequiredRequests] = useState<Request[]>([]);
  const [allAssignedRequests, setAllAssignedRequests] = useState<Request[]>([]);
  const [myQueueRequests, setMyQueueRequests] = useState<Request[]>([]);
  const [completedRequests, setCompletedRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [userTitle, setUserTitle] = useState<string>('');
  const [activeTab, setActiveTab] = useState('action-required');
  const [advisoryServiceMap, setAdvisoryServiceMap] = useState<Record<string, string>>({});
  const [serviceOfferingMap, setServiceOfferingMap] = useState<Record<string, string>>({});
  const [toolsMap, setToolsMap] = useState<Record<string, string>>({});
  const [assigneeInfo, setAssigneeInfo] = useState<AssigneeInfo | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [billabilityPercentage, setBillabilityPercentage] = useState("");
  const [isBillabilitySaving, setIsBillabilitySaving] = useState(false);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [calculatedPD, setCalculatedPD] = useState<number>(0);
  const [showCalculationLogic, setShowCalculationLogic] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'New':
        return <Zap className="h-4 w-4" />;
      case 'Estimation':
        return <Calculator className="h-4 w-4" />;
      case 'Approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'Implementing':
        return <Settings className="h-4 w-4" />;
      case 'Implemented':
        return <CheckCircle className="h-4 w-4" />;
      case 'Closed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Handle Teams Call scheduling
  const handleScheduleTeamsCall = (request: Request) => {
    const subject = `Discussion for Request ${request.request_id}`;
    const body = `Hi,\n\nLet's schedule a Teams call to discuss the request: ${request.description}\n\nBest regards`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  };

  // Function to check if current user can access timesheet
  const canAccessTimesheet = (request: Request) => {
    if (!user?.id) return false;
    
    // Admin can always access
    if (userRole === 'Admin') return true;
    
    // Requestor can access
    if (request.requestor_id === user.id) return true;
    
    // Assignee can access
    if (request.assignee_id === user.id) return true;
    
    // Advisory roles can access
    if (['Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head'].includes(userTitle || '')) {
      return true;
    }
    
    return false;
  };

  // Function to check if current user can edit timesheet
  const canEditTimesheet = (request: Request) => {
    if (!user?.id) return false;
    
    // Admin can edit
    if (userRole === 'Admin') return true;
    
    // Only assignee can edit
    return request.assignee_id === user.id;
  };

  const renderTimesheetSection = () => {
    if (!selectedRequest || !canAccessTimesheet(selectedRequest)) {
      return null;
    }

    const isReadOnly = !canEditTimesheet(selectedRequest);

    return (
      <TimesheetSection
        requestId={selectedRequest.id}
        selectedActivities={selectedRequest.selected_activities || selectedRequest.service_offering_activities}
        timesheetData={selectedRequest.timesheet_data || {}}
        isReadOnly={isReadOnly}
        billabilityPercentage={selectedRequest.billability_percentage || 100}
        onTimesheetUpdate={(data) => {
          setSelectedRequest(prev => prev ? { ...prev, timesheet_data: data } : null);
        }}
      />
    );
  };
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAccess();
    fetchMappings();
  }, []);

  // Update billability percentage when selectedRequest changes
  useEffect(() => {
    if (selectedRequest) {
      const currentValue = selectedRequest.billability_percentage !== null && selectedRequest.billability_percentage !== undefined
        ? selectedRequest.billability_percentage.toString() : '';
      setBillabilityPercentage(currentValue);
    }
  }, [selectedRequest?.id, selectedRequest?.billability_percentage]);

  // Calculate hours when selectedRequest changes
  useEffect(() => {
    if (selectedRequest && selectedRequest.selected_activities) {
      const calculateHours = async () => {
        try {
          const hours = await calculateTotalHoursAsync(
            selectedRequest.selected_activities, 
            selectedRequest.service_offering_activities
          );
          setCalculatedHours(hours);
          setCalculatedPD(Math.round((hours / 8) * 100) / 100);
          console.log('MyItems: Async calculation completed:', { hours, pd: hours / 8 });
        } catch (error) {
          console.error('Error calculating hours:', error);
          // Fallback to synchronous calculation
          const fallbackHours = calculateTotalHours(
            selectedRequest.selected_activities, 
            selectedRequest.service_offering_activities
          );
          setCalculatedHours(fallbackHours);
          setCalculatedPD(Math.round((fallbackHours / 8) * 100) / 100);
        }
      };
      
      calculateHours();
    } else {
      setCalculatedHours(0);
      setCalculatedPD(0);
    }
  }, [selectedRequest]);

  const fetchMappings = async () => {
    try {
      // Fetch advisory services
      const { data: advisoryServices } = await supabase
        .from('advisory_services')
        .select('id, name')
        .eq('is_active', true);

      // Fetch service offerings (tools)
      const { data: serviceOfferings } = await supabase
        .from('service_offerings')
        .select('id, name')
        .eq('is_active', true);

      // Fetch dropdown tools
      const { data: dropdownTools } = await supabase
        .from('dropdown_values')
        .select('value')
        .eq('category', 'tools')
        .eq('is_active', true);

      if (advisoryServices) {
        const advisoryMap: Record<string, string> = {};
        advisoryServices.forEach(service => {
          advisoryMap[service.id] = service.name;
        });
        setAdvisoryServiceMap(advisoryMap);
      }

      if (serviceOfferings) {
        const serviceMap: Record<string, string> = {};
        serviceOfferings.forEach(service => {
          serviceMap[service.id] = service.name;
        });
        setServiceOfferingMap(serviceMap);
      }

      if (dropdownTools) {
        const toolMap: Record<string, string> = {};
        dropdownTools.forEach(tool => {
          toolMap[tool.value] = tool.value;
        });
        setToolsMap(toolMap);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
    }
  };

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('title, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      if (!profile) {
        toast({
          title: "Access Denied",
          description: "Unable to verify user profile.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      const allowedTitles = ['Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head'];
      const isAdvisoryUser = allowedTitles.includes(profile.title);
      const isStandardUser = profile.role === 'Standard User';

      if (!isAdvisoryUser && !isStandardUser) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this module.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setUserRole(profile.role);
      setUserTitle(profile.title);
      setCurrentUserProfile(profile);

      if (isAdvisoryUser) {
        await fetchMyRequests(user.id, profile.title || profile.role);
        await fetchMyQueueRequests(user.id);
      } else if (isStandardUser) {
        await fetchMyRequests(user.id, profile.role);
      }
    } catch (error) {
      console.error('Error checking user access:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const saveBillabilityPercentage = async () => {
    if (!selectedRequest) return;

    // Get the numeric value
    const trimmedValue = billabilityPercentage.toString().trim();
    
    if (!trimmedValue) {
      toast({
        title: "Error",
        description: "Please enter a billability percentage",
        variant: "destructive",
      });
      return;
    }

    const numValue = parseInt(trimmedValue);
    
    if (isNaN(numValue) || numValue < 1 || numValue > 100) {
      toast({
        title: "Error", 
        description: "Billability percentage must be between 1 and 100",
        variant: "destructive",
      });
      return;
    }

    setIsBillabilitySaving(true);

    try {
      const { error } = await supabase
        .from('requests')
        .update({ 
          billability_percentage: numValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Billability percentage saved successfully",
      });

      // Update local state
      setSelectedRequest(prev => prev ? {
        ...prev,
        billability_percentage: numValue 
      } : null);
      
      // Also update the billabilityPercentage state to reflect the saved value
      setBillabilityPercentage(numValue.toString());
      
    } catch (error) {
      console.error('Error saving billability percentage:', error);
      toast({
        title: "Error",
        description: "Failed to save billability percentage",
        variant: "destructive",
      });
    } finally {
      setIsBillabilitySaving(false);
    }
  };

  // Calculation functions
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
    
    console.log('MyItems calculateTotalHoursAsync called with:', { selectedActivities, serviceOfferingActivities });
    
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
      console.log('MyItems: Fetching hours for subActivity IDs:', missingSubActivityIds);
      subActivityHoursMap = await fetchSubActivityHours(missingSubActivityIds);
      console.log('MyItems: Fetched subActivity hours:', subActivityHoursMap);
    }
    
    // Now calculate total hours with the fetched data
    return calculateTotalHours(selectedActivities, serviceOfferingActivities, null, subActivityHoursMap);
  };

  const calculateTotalHours = (selectedActivities: any, serviceOfferingActivities?: any, allActivitiesData?: any, subActivityHoursMap?: Record<string, number>) => {
    let totalHours = 0;
    
    console.log('MyItems calculateTotalHours called with:', { selectedActivities, serviceOfferingActivities });
    
    // Handle new service offering activities structure
    if (serviceOfferingActivities && typeof serviceOfferingActivities === 'object') {
      console.log('MyItems: Processing serviceOfferingActivities structure');
      Object.values(serviceOfferingActivities).forEach((serviceData: any) => {
        if (serviceData && serviceData.activities) {
          Object.values(serviceData.activities).forEach((activity: any) => {
            if (activity && activity.selected && activity.estimated_hours) {
              console.log('MyItems: Adding activity hours:', activity.estimated_hours);
              totalHours += Number(activity.estimated_hours);
            }
            
            if (activity && activity.subActivities) {
              Object.values(activity.subActivities).forEach((subActivity: any) => {
                if (subActivity) {
                  if (typeof subActivity === 'boolean' && subActivity) {
                    console.log('MyItems: Found boolean subActivity (selected)');
                  } else if (typeof subActivity === 'object' && subActivity.selected && subActivity.estimated_hours) {
                    console.log('MyItems: Adding subActivity hours:', subActivity.estimated_hours);
                    totalHours += Number(subActivity.estimated_hours);
                  }
                }
              });
            }
          });
        }
      });
      
      console.log('MyItems: Total from serviceOfferingActivities:', totalHours);
      
      // If serviceOfferingActivities didn't yield any hours, continue to check selectedActivities
      if (totalHours > 0) {
        return totalHours;
      }
      console.log('MyItems: serviceOfferingActivities had no hours, checking selectedActivities...');
    }
    
    // Handle legacy single service offering structure
    if (!selectedActivities || typeof selectedActivities !== 'object') {
      console.log('MyItems: No selectedActivities or invalid type');
      return 0;
    }
    
    console.log('MyItems: Processing selectedActivities structure');
    
    // Calculate from activities (handle both object and array formats)
    if (selectedActivities.activities) {
      if (Array.isArray(selectedActivities.activities)) {
        selectedActivities.activities.forEach((activity: any) => {
          if (activity && activity.selected && activity.estimated_hours) {
            console.log('MyItems: Adding array activity hours:', activity.estimated_hours);
            totalHours += Number(activity.estimated_hours);
          }
        });
      } else if (typeof selectedActivities.activities === 'object') {
        Object.values(selectedActivities.activities).forEach((activity: any) => {
          if (activity && activity.selected && activity.estimated_hours) {
            console.log('MyItems: Adding object activity hours:', activity.estimated_hours);
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
            const isSelected = subActivity.selected !== undefined ? subActivity.selected : true;
            if (isSelected) {
              console.log('MyItems: Adding array subActivity hours:', subActivity.estimated_hours);
              totalHours += Number(subActivity.estimated_hours);
            }
          }
        });
      } else if (typeof selectedActivities.subActivities === 'object') {
        Object.values(selectedActivities.subActivities).forEach((subActivity: any) => {
          if (subActivity && subActivity.estimated_hours) {
            const isSelected = subActivity.selected !== undefined ? subActivity.selected : true;
            if (isSelected) {
              console.log('MyItems: Adding object subActivity hours:', subActivity.estimated_hours);
              totalHours += Number(subActivity.estimated_hours);
            }
          }
        });
      }
    }
    
    // Handle the direct structure for single service offerings (activity ID as key)
    Object.entries(selectedActivities).forEach(([key, value]: [string, any]) => {
      if (key !== 'activities' && key !== 'subActivities' && value && typeof value === 'object') {
        if (value.selected && value.estimated_hours) {
          console.log('MyItems: Adding direct activity hours:', value.estimated_hours);
          totalHours += Number(value.estimated_hours);
        }
        
        if (value.subActivities && typeof value.subActivities === 'object') {
          Object.entries(value.subActivities).forEach(([subKey, subValue]: [string, any]) => {
            if (subValue) {
              if (typeof subValue === 'boolean' && subValue) {
                console.log('MyItems: Found boolean subActivity (selected), looking up hours for ID:', subKey);
                
                // First check if we have the hours in the fetched map
                if (subActivityHoursMap && subActivityHoursMap[subKey]) {
                  console.log('MyItems: Found hours from database lookup:', subActivityHoursMap[subKey]);
                  totalHours += Number(subActivityHoursMap[subKey]);
                }
                // Check if the subActivity ID exists in the selectedActivities.subActivities with estimated_hours
                else if (selectedActivities.subActivities && selectedActivities.subActivities[subKey] && 
                    selectedActivities.subActivities[subKey].estimated_hours) {
                  console.log('MyItems: Found hours in selectedActivities.subActivities:', selectedActivities.subActivities[subKey].estimated_hours);
                  totalHours += Number(selectedActivities.subActivities[subKey].estimated_hours);
                }
                else {
                  console.log('MyItems: No hours found for boolean subActivity ID:', subKey);
                }
              } else if (typeof subValue === 'object' && subValue.selected && subValue.estimated_hours) {
                console.log('MyItems: Adding nested subActivity hours:', subValue.estimated_hours);
                totalHours += Number(subValue.estimated_hours);
              }
            }
          });
        }
      }
    });
    
    console.log('MyItems: Final calculated hours:', totalHours);
    return totalHours;
  };

  const calculateTotalPDEstimate = (selectedActivities: any, serviceOfferingActivities?: any) => {
    let totalHours = 0;
    
    // Handle new service offering activities structure
    if (serviceOfferingActivities && typeof serviceOfferingActivities === 'object') {
      Object.values(serviceOfferingActivities).forEach((serviceData: any) => {
        if (serviceData.activities) {
          Object.values(serviceData.activities).forEach((activity: any) => {
            if (activity.selected && activity.estimated_hours) {
              totalHours += activity.estimated_hours;
            }
            
            if (activity.subActivities) {
              Object.values(activity.subActivities).forEach((subActivity: any) => {
                if ((typeof subActivity === 'boolean' && subActivity) || 
                    (typeof subActivity === 'object' && subActivity.selected && subActivity.estimated_hours)) {
                  totalHours += typeof subActivity === 'object' ? subActivity.estimated_hours : 0;
                }
              });
            }
          });
        }
      });
      
      return Math.round((totalHours / 8) * 100) / 100;
    }
    
    // Handle legacy single service offering structure
    if (!selectedActivities || typeof selectedActivities !== 'object') return 0;
    
    // Calculate from activities (handle both object and array formats)
    if (selectedActivities.activities) {
      if (Array.isArray(selectedActivities.activities)) {
        selectedActivities.activities.forEach((activity: any) => {
          if (activity.selected && activity.estimated_hours) {
            totalHours += activity.estimated_hours;
          }
        });
      } else if (typeof selectedActivities.activities === 'object') {
        Object.values(selectedActivities.activities).forEach((activity: any) => {
          if (activity.selected && activity.estimated_hours) {
            totalHours += activity.estimated_hours;
          }
        });
      }
    }
    
    // Calculate from sub-activities (handle both object and array formats)
    if (selectedActivities.subActivities) {
      if (Array.isArray(selectedActivities.subActivities)) {
        selectedActivities.subActivities.forEach((subActivity: any) => {
          if (subActivity.selected && subActivity.estimated_hours) {
            totalHours += subActivity.estimated_hours;
          }
        });
      } else if (typeof selectedActivities.subActivities === 'object') {
        Object.values(selectedActivities.subActivities).forEach((subActivity: any) => {
          if (subActivity.selected && subActivity.estimated_hours) {
            totalHours += subActivity.estimated_hours;
          }
        });
      }
    }
    
    // Handle the direct structure for single service offerings (activity ID as key)
    Object.entries(selectedActivities).forEach(([key, value]: [string, any]) => {
      if (key !== 'activities' && key !== 'subActivities' && value && typeof value === 'object') {
        if (value.selected && value.subActivities) {
          Object.values(value.subActivities).forEach((subActivity: any) => {
            if (subActivity === true || (typeof subActivity === 'object' && subActivity.selected)) {
              // For this legacy format, we need the actual sub-activity data to get hours
              // This calculation is primarily handled by the other sections above
            }
          });
        }
      }
    });
    
    // Return PD estimate: total hours divided by 8
    return Math.round((totalHours / 8) * 100) / 100; // Round to 2 decimal places
  };

  const calculateTotalCost = (selectedActivities: any, serviceOfferingActivities: any, ratePerHour: number) => {
    const totalHours = calculateTotalHours(selectedActivities, serviceOfferingActivities);
    return totalHours * ratePerHour;
  };

  const saveEstimationData = async (requestId: string) => {
    if (!selectedRequest || !assigneeInfo) return;
    
    try {
      // First, refresh the request to get the latest activities data
      const { data: refreshedRequest, error: fetchError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching updated request:', fetchError);
        toast({
          title: "Error",
          description: "Failed to fetch latest activities data",
          variant: "destructive",
        });
        return;
      }
      
      // Calculate total hours from the refreshed activities data
      const totalHours = calculateTotalHours(refreshedRequest.selected_activities, refreshedRequest.service_offering_activities);
      const totalPDEstimate = calculateTotalPDEstimate(refreshedRequest.selected_activities, refreshedRequest.service_offering_activities);
      const totalCost = calculateTotalCost(refreshedRequest.selected_activities, refreshedRequest.service_offering_activities, assigneeInfo.rate_per_hour || 0);
      
      // Get the current assignee role to freeze it
      const currentAssigneeRole = assigneeInfo?.designation || assigneeInfo?.title || 'Not assigned';
      
      const { error } = await supabase
        .from('requests')
        .update({
          saved_total_hours: totalHours,
          saved_total_cost: totalCost,
          saved_total_pd_estimate: totalPDEstimate,
          saved_assignee_rate: assigneeInfo.rate_per_hour,
          saved_assignee_role: currentAssigneeRole,
          estimation_saved_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (error) {
        console.error('Error saving estimation data:', error);
        toast({
          title: "Error",
          description: "Failed to save estimation data",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Estimation Saved",
          description: "Estimation data has been saved successfully. The assignee billability role is now frozen.",
        });
        
        // Immediately update the selectedRequest with the refreshed data and saved values
        const updatedRequest = {
          ...refreshedRequest,
          saved_total_hours: totalHours,
          saved_total_cost: totalCost,
          saved_total_pd_estimate: totalPDEstimate,
          saved_assignee_rate: assigneeInfo.rate_per_hour,
          saved_assignee_role: currentAssigneeRole,
          estimation_saved_at: new Date().toISOString()
        };
        setSelectedRequest(updatedRequest);
      }
    } catch (error) {
      console.error('Error in saveEstimationData:', error);
      toast({
        title: "Error",
        description: "Failed to save estimation data",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (newStatus?: string) => {
    if (newStatus && selectedRequest) {
      // Refresh the specific request to get updated assignee information
      try {
        const { data: updatedRequest } = await supabase
          .from('requests')
          .select('*')
          .eq('id', selectedRequest.id)
          .single();
        
        if (updatedRequest) {
          setSelectedRequest(updatedRequest);
        }
        
        // Also refresh the main requests list to ensure consistency
        if (user && userRole) {
          await fetchMyRequests(user.id, userRole);
        }
      } catch (error) {
        console.error('Error refreshing request data:', error);
      }
    }
  };

  const fetchMyRequests = async (userId: string, userRole: string) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('requests')
        .select(`*, selected_activities, service_offering_activities`);

      if (userRole === 'Standard User') {
        query = query.eq('requestor_id', userId);
      } else {
        // For advisory consultants, fetch requests they're currently assigned to OR originally assigned to
        query = query.or(`assignee_id.eq.${userId},original_assignee_id.eq.${userId}`);
      }

      const { data: requests, error } = await query.order('submission_date', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        toast({
          title: "Error",
          description: "Failed to fetch your assigned requests.",
          variant: "destructive"
        });
        return;
      }

      if (!requests) {
        setActionRequiredRequests([]);
        setAllAssignedRequests([]);
        return;
      }

      const requestorIds = requests.map(r => r.requestor_id).filter(id => id);
      const assigneeIds = requests.map(r => r.assignee_id).filter(id => id);
      const allUserIds = [...new Set([...requestorIds, ...assigneeIds])];
      
      // Fetch profiles using utility function
      const profiles = await fetchUserProfiles(allUserIds);
      const profileMap = createProfileLookupMap(profiles);

      const requestsWithProfiles = requests.map(request => ({
        ...request,
        requestor_profile: profileMap[request.requestor_id] || null,
        assignee_profile: profileMap[request.assignee_id] || null
      }));

      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Define completed statuses
      const completedStatuses = ['Implemented', 'Rejected', 'Cancelled'];
      
      // Separate completed and active requests
      const activeRequests = requestsWithProfiles.filter(request => 
        !completedStatuses.includes(request.status)
      );
      
      const completed = requestsWithProfiles.filter(request => 
        completedStatuses.includes(request.status)
      );

      const actionRequired = activeRequests.filter(request => 
        request.status === 'New' || 
        new Date(request.updated_at) >= twentyFourHoursAgo
      );

      const assignedItems = activeRequests.filter(request => 
        request.status !== 'New'
      );

      setActionRequiredRequests(actionRequired as Request[]);
      setAllAssignedRequests(assignedItems as Request[]);
      setCompletedRequests(completed as Request[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your assigned requests.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyQueueRequests = async (userId: string) => {
    try {
      // First get the request IDs from assignee history
      const { data: historyData, error: historyError } = await supabase
        .from('request_assignee_history')
        .select('request_id')
        .eq('assignee_id', userId)
        .not('unassigned_at', 'is', null);

      if (historyError) {
        console.error('Error fetching assignee history:', historyError);
        return;
      }

      if (!historyData || historyData.length === 0) {
        setMyQueueRequests([]);
        return;
      }

      // Get unique request IDs
      const requestIds = [...new Set(historyData.map(h => h.request_id))];

      // Then fetch the actual requests
      const { data: queueRequests, error } = await supabase
        .from('requests')
        .select('*, selected_activities')
        .in('id', requestIds)
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching queue requests:', error);
        return;
      }

      if (!queueRequests) {
        setMyQueueRequests([]);
        return;
      }

      // Get requestor profiles for the requests
      const requestorIds = queueRequests.map((r: any) => r.requestor_id).filter(id => id);
      
      // Fetch profiles using utility function
      const requestorProfiles = await fetchUserProfiles(requestorIds);
      const profileMap = createProfileLookupMap(requestorProfiles);

      const requestsWithProfiles = queueRequests.map((request: any) => ({
        ...request,
        requestor_profile: profileMap[request.requestor_id] || null
      }));

      // Filter out completed requests from queue
      const completedStatuses = ['Implemented', 'Rejected', 'Cancelled'];
      const activeQueueRequests = requestsWithProfiles.filter(request => 
        !completedStatuses.includes(request.status)
      );

      setMyQueueRequests(activeQueueRequests);
    } catch (error) {
      console.error('Error fetching queue requests:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading your items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Items</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="action-required">Action Required</TabsTrigger>
          <TabsTrigger value="assigned">Assigned Items</TabsTrigger>
          <TabsTrigger value="queue">My Queue</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="action-required" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Action Required ({actionRequiredRequests.length})
              </CardTitle>
              <CardDescription>Items assigned to you in the last 24 hours or with status 'New' that need immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              {actionRequiredRequests.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No action required items at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {actionRequiredRequests.map((request) => (
                    <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-red-500" onClick={() => setSelectedRequest(request)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {request.request_id}
                              </Badge>
                              <Badge className={`${STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]} text-white`}>
                                {request.status}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-2">
                              <TruncatedText text={request.description} maxWords={15} />
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <UserIcon className="h-4 w-4" />
                                <span>From: {getUserDisplayName(request.requestor_profile)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(request.submission_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Updated: {new Date(request.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Assigned Items ({allAssignedRequests.length})
              </CardTitle>
              <CardDescription>All items currently assigned to you (excluding new items)</CardDescription>
            </CardHeader>
            <CardContent>
              {allAssignedRequests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No assigned items at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allAssignedRequests.map((request) => (
                    <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500" onClick={() => setSelectedRequest(request)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {request.request_id}
                              </Badge>
                              <Badge className={`${STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]} text-white`}>
                                {request.status}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-2">
                              <TruncatedText text={request.description} maxWords={15} />
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <UserIcon className="h-4 w-4" />
                                <span>From: {getUserDisplayName(request.requestor_profile)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(request.submission_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Updated: {new Date(request.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                My Queue ({myQueueRequests.length})
              </CardTitle>
              <CardDescription>Items that were previously assigned to you but are no longer active</CardDescription>
            </CardHeader>
            <CardContent>
              {myQueueRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No items in your queue.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myQueueRequests.map((request) => (
                    <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500" onClick={() => setSelectedRequest(request)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {request.request_id}
                              </Badge>
                              <Badge className={`${STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]} text-white`}>
                                {request.status}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-2">
                              <TruncatedText text={request.description} maxWords={15} />
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <UserIcon className="h-4 w-4" />
                                <span>From: {getUserDisplayName(request.requestor_profile)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(request.submission_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Updated: {new Date(request.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Completed Items ({completedRequests.length})
              </CardTitle>
              <CardDescription>Items that have been implemented, rejected, or cancelled</CardDescription>
            </CardHeader>
            <CardContent>
              {completedRequests.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No completed items.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedRequests.map((request) => (
                    <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500" onClick={() => setSelectedRequest(request)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {request.request_id}
                              </Badge>
                              <Badge className={`${STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]} text-white`}>
                                {request.status}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-2">
                              <TruncatedText text={request.description} maxWords={15} />
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <UserIcon className="h-4 w-4" />
                                <span>From: {getUserDisplayName(request.requestor_profile)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(request.submission_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Updated: {new Date(request.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              {/* Header with Status and Actions */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`${STATUS_COLORS[selectedRequest.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'} text-white`}>
                  {getStatusIcon(selectedRequest.status)}
                  {selectedRequest.status}
                </Badge>
                
                <div className="flex items-center gap-2">
                  {/* Schedule Teams Call button for "Under Discussion" status */}
                  {selectedRequest.status === 'Under Discussion' && (
                    <Button
                      onClick={() => handleScheduleTeamsCall(selectedRequest)}
                      className="flex items-center gap-2"
                      variant="outline"
                    >
                      <Video className="h-4 w-4" />
                      Schedule Teams Call
                    </Button>
                  )}
                  
                  <StatusTransitionDropdown
                    currentStatus={selectedRequest.status}
                    requestId={selectedRequest.id}
                    userRole={userRole}
                    userTitle={userTitle}
                    isAssignee={selectedRequest.assignee_id === user?.id}
                    isAdmin={userRole === 'Admin' || userTitle === 'Advisory Service Head'}
                    onStatusChange={handleStatusUpdate}
                    billabilityPercentage={selectedRequest.billability_percentage}
                  />
                </div>
              </div>

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
                            {getRequestorDisplayName(selectedRequest.requestor_profile, selectedRequest.requestor_id)}
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
                            {formatDate(selectedRequest.submission_date)}
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
                            {formatDate(selectedRequest.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Details Card */}
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
              </div>

              {selectedRequest.description && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Description</h3>
                    <AISummarizeButton text={selectedRequest.description} />
                  </div>
                  <TruncatedText 
                    text={selectedRequest.description} 
                    maxWords={50}
                    className="text-muted-foreground"
                  />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {selectedRequest.advisory_services?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Advisory Services</h3>
                    <div className="flex flex-wrap gap-2">
                       {selectedRequest.advisory_services.map((service, index) => (
                         <Badge key={index} variant="secondary">
                           {advisoryServiceMap[service] || service}
                         </Badge>
                       ))}
                    </div>
                  </div>
                )}

                {selectedRequest.selected_tools?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Support Required</h3>
                    <div className="flex flex-wrap gap-2">
                       {selectedRequest.selected_tools.map((tool, index) => (
                         <Badge key={index} variant="outline">
                           {serviceOfferingMap[tool] || toolsMap[tool] || tool}
                         </Badge>
                       ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedRequest.service_specific_data && Object.keys(selectedRequest.service_specific_data).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Service Specific Information</h3>
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    {Object.entries(selectedRequest.service_specific_data).map(([key, value]) => {
                       // For Assigned Consultant field, show the actual assignee name
                       let displayValue;
                       
                       if (key.toLowerCase().includes('assigned consultant') || key.toLowerCase().includes('assignedconsultant')) {
                         displayValue = selectedRequest.assignee_profile?.username || selectedRequest.assigned_consultant_name || 'Not assigned';
                       }
                       // Handle Service Id field - check if serviceName exists first, then map
                       else if (key.toLowerCase().includes('service') && key.toLowerCase().includes('id')) {
                         // Check if serviceName exists in the same data
                         const serviceName = selectedRequest.service_specific_data?.serviceName as string;
                         if (serviceName) {
                           displayValue = serviceName;
                         } else {
                           const stringValue = String(value);
                           displayValue = serviceOfferingMap[stringValue] || stringValue;
                         }
                       }
                       // Handle Selected Offerings field - map array of IDs to names
                       else if (key.toLowerCase().includes('selected') && key.toLowerCase().includes('offering')) {
                         if (Array.isArray(value)) {
                           displayValue = value.map(item => 
                             typeof item === 'string' ? (serviceOfferingMap[item] || advisoryServiceMap[item] || toolsMap[item] || item) : String(item)
                           ).join(', ');
                         } else {
                           displayValue = typeof value === 'string' ? (serviceOfferingMap[value] || advisoryServiceMap[value] || toolsMap[value] || value) : String(value);
                         }
                       }
                       // Handle arrays - map through all available maps
                       else if (Array.isArray(value)) {
                         displayValue = value.map(item => 
                           typeof item === 'string' ? (serviceOfferingMap[item] || advisoryServiceMap[item] || toolsMap[item] || item) : String(item)
                         ).join(', ');
                       }
                       // Handle objects
                       else if (typeof value === 'object' && value !== null) {
                         displayValue = JSON.stringify(value, null, 2);
                       }
                       // Handle single values - try all maps
                       else {
                         const stringValue = String(value);
                         displayValue = serviceOfferingMap[stringValue] || advisoryServiceMap[stringValue] || toolsMap[stringValue] || stringValue;
                       }

                      // Check if this is a requirement details field that needs truncation
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

              {/* Billability Percentage Section - Show when status is Review or after Review */}
              {(selectedRequest.status === 'Review' || 
                ['Approved', 'Implementing', 'Implemented', 'Awaiting Feedback', 'Closed'].includes(selectedRequest.status) ||
                selectedRequest.billability_percentage !== null && selectedRequest.billability_percentage !== undefined) && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6 shadow-lg">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-green-700">
                      <Calculator className="h-6 w-6" />
                      Billability Percentage
                    </h3>
                     
                     {(() => {
                       // Check if user is assignee and status is Review for editable field
                       if (selectedRequest.status === 'Review' && 
                           selectedRequest.assignee_id && 
                           user?.id === selectedRequest.assignee_id) {
                        return (
                        // Editable field for assignee when status is Review
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 p-4 bg-green-100 rounded-lg border border-green-300">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            <span className="text-green-800 font-medium">
                              As the assigned user, you can set the billability percentage for this request.
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <input
                                type="number"
                                value={billabilityPercentage}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow numbers and validate range
                                  if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 1 && parseInt(value) <= 100)) {
                                    setBillabilityPercentage(value);
                                  }
                                }}
                                placeholder="Enter billability percentage (1-100)"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                min="1"
                                max="100"
                              />
                              <p className="text-sm text-muted-foreground mt-1">
                                Enter percentage (1-100, % will be added automatically)
                              </p>
                            </div>
                            <Button 
                              onClick={saveBillabilityPercentage}
                              disabled={isBillabilitySaving || !billabilityPercentage.trim()}
                              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6"
                            >
                              {isBillabilitySaving ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        </div>
                     );
                     } else {
                       // Read-only display for other statuses or users
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
                     }
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
                               
                               console.log('Billable Days Calculation:', {
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
                </div>
              )}


              {/* Activities Section - Show for Estimation status or when activities exist (read-only for subsequent statuses) */}
              {(selectedRequest.status === 'Estimation' || 
                (selectedRequest.selected_activities && Object.keys(selectedRequest.selected_activities).length > 0) || 
                (selectedRequest.service_offering_activities && Object.keys(selectedRequest.service_offering_activities).length > 0) ||
                ['Review', 'Approved', 'Approval', 'Implementing', 'Implemented', 'Awaiting Feedback', 'Closed'].includes(selectedRequest.status)) && (
                <>
                  {/* Check if multiple service offerings to determine which component to use */}
                  {(selectedRequest.service_specific_data?.serviceOfferings || selectedRequest.selected_tools || []).length > 1 ? (
                    <MultiServiceActivitiesSection
                      requestId={selectedRequest.id}
                      serviceOfferings={selectedRequest.service_specific_data?.serviceOfferings || selectedRequest.selected_tools || []}
                      currentStatus={selectedRequest.status}
                      readOnly={!['Estimation'].includes(selectedRequest.status)}
                      onActivitiesChange={(activities) => {
                        console.log('Multi-service activities changed:', activities);
                        // Update local state only - no refresh until "Save Activities" is clicked
                        setSelectedRequest(prev => prev ? { 
                          ...prev, 
                          service_offering_activities: activities 
                        } : null);
                      }}
                      onSaveActivities={async () => {
                        if (selectedRequest.status === 'Estimation') {
                          // Refresh the request data from database after activities are saved
                          try {
                            const { data: updatedRequest, error } = await supabase
                              .from('requests')
                              .select('*')
                              .eq('id', selectedRequest.id)
                              .single();
                            
                            if (error) {
                              console.error('Error fetching updated request:', error);
                              return;
                            }
                            
                            if (updatedRequest) {
                              setSelectedRequest(updatedRequest);
                              // Calculate and save estimation data
                              await saveEstimationData(updatedRequest.id);
                            }
                          } catch (error) {
                            console.error('Error refreshing request data:', error);
                          }
                        }
                      }}
                    />
                  ) : (
                    <ActivitiesSection
                      requestId={selectedRequest.id}
                      serviceOfferings={selectedRequest.service_specific_data?.serviceOfferings || selectedRequest.selected_tools || []}
                      currentStatus={selectedRequest.status}
                      readOnly={!['Estimation'].includes(selectedRequest.status)}
                      onActivitiesChange={(activities) => {
                        console.log('Single-service activities changed:', activities);
                        // Update local state only - no refresh until "Save Activities" is clicked
                        setSelectedRequest(prev => prev ? { 
                          ...prev, 
                          selected_activities: activities 
                        } : null);
                      }}
                      onSaveActivities={async () => {
                        if (selectedRequest.status === 'Estimation') {
                          // Refresh the request data from database after activities are saved
                          try {
                            const { data: updatedRequest, error } = await supabase
                              .from('requests')
                              .select('*')
                              .eq('id', selectedRequest.id)
                              .single();
                            
                            if (error) {
                              console.error('Error fetching updated request:', error);
                              return;
                            }
                            
                            if (updatedRequest) {
                              setSelectedRequest(updatedRequest);
                              // Calculate and save estimation data
                              await saveEstimationData(updatedRequest.id);
                            }
                          } catch (error) {
                            console.error('Error refreshing request data:', error);
                          }
                        }
                      }}
                    />
                  )}
                </>
              )}

              {/* Feedback Section */}
              {(selectedRequest.status === 'Awaiting Feedback' || selectedRequest.status === 'Feedback Received') && (
                <RequestFeedbackSection
                  requestId={selectedRequest.id}
                  requestorId={selectedRequest.requestor_id}
                  originalAssigneeId={selectedRequest.original_assignee_id}
                  currentUserId={user?.id || ''}
                  onFeedbackSubmitted={() => {
                    // Refresh data after feedback submission
                    if (user && userRole) {
                      fetchMyRequests(user.id, userRole);
                    }
                  }}
                />
              )}

              {/* Rate and Estimation Section - Show when any estimation data exists */}
              {(selectedRequest.status === 'Estimation' || 
                selectedRequest.saved_total_hours || 
                selectedRequest.estimation_saved_at ||
                calculatedHours > 0 ||
                (selectedRequest.selected_activities && Object.keys(selectedRequest.selected_activities).length > 0) ||
                (selectedRequest.service_offering_activities && Object.keys(selectedRequest.service_offering_activities).length > 0) ||
                ['Review', 'Approved', 'Approval', 'Implementing', 'Implemented', 'Awaiting Feedback', 'Closed'].includes(selectedRequest.status)) && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg p-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-primary">
                      <Calculator className="h-6 w-6" />
                      Rate and Estimation
                      {selectedRequest.estimation_saved_at && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {selectedRequest.status === 'Estimation' ? 'Frozen' : 'Frozen on ' + formatDate(selectedRequest.estimation_saved_at)}
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
                              
                              console.log('MyItems Total Hours Display:', {
                                status: selectedRequest.status,
                                estimationSaved: selectedRequest.estimation_saved_at,
                                calculatedHours,
                                savedTotalHours: selectedRequest.saved_total_hours,
                                displayHours,
                                finalDisplay: displayHours > 0 ? displayHours : 'Not calculated',
                                logic: selectedRequest.estimation_saved_at ? 'frozen-fallback' : 'calculated'
                              });
                              return displayHours > 0 ? displayHours : 'Not calculated';
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
                              
                              console.log('MyItems Total PD Display:', {
                                status: selectedRequest.status,
                                estimationSaved: selectedRequest.estimation_saved_at,
                                calculatedPD,
                                savedTotalPD: selectedRequest.saved_total_pd_estimate,
                                displayPD,
                                finalDisplay: displayPD > 0 ? `${displayPD} PD` : 'Not calculated',
                                logic: selectedRequest.estimation_saved_at ? 'frozen-fallback' : 'calculated'
                              });
                              return displayPD > 0 ? `${displayPD} PD` : 'Not calculated';
                            })()}
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
                          {(() => {
                            let rate = 0;
                            if (selectedRequest.status === 'Estimation' && !selectedRequest.estimation_saved_at) {
                              rate = assigneeInfo?.rate_per_hour || 0;
                            } else {
                              rate = selectedRequest.saved_assignee_rate || assigneeInfo?.rate_per_hour || 0;
                            }
                            
                            return rate > 0 ? `$${rate}/hour` : 'Not set';
                          })()}
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
                                   // Use the calculatedHours state variable that we know is working (38 hours)
                                   const hours = calculatedHours;
                                   cost = hours * rate;
                                   console.log('MyItems Cost Calculation:', { 
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
                               // Use the calculatedHours state variable that we know is working (38 hours)
                               const hours = calculatedHours;
                               
                               // Get the rate (saved rate takes precedence, then current rate)
                               const rate = selectedRequest.saved_assignee_rate || assigneeInfo?.rate_per_hour || 0;
                               
                               console.log('MyItems Cost Breakdown:', { 
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

              {/* Timesheet Section - Show for requests with status "Implementing" */}
              {selectedRequest.status === 'Implementing' && (selectedRequest.selected_activities || selectedRequest.service_offering_activities) && renderTimesheetSection()}

              {/* Comments Section */}
              <RequestComments 
                requestId={selectedRequest.id}
                currentUserId={user?.id || ''}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
