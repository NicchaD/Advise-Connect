import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';
import { Star, TrendingUp, CheckCircle, Clock, Activity, ChevronLeft, ChevronRight, MessageSquare, Target, Lightbulb, Users, Filter, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InsightsData {
  totalRequests: number;
  implementedRequests: number;
  activeRequests: number;
  completionRate: number;
  averageLeadTime: number; // in days
  averageCycleTime: number; // in days
  statusDistribution: Array<{ status: string; count: number; color: string }>;
  assigneeServiceMatrix: Array<{ assignee: string; [key: string]: any }>;
  advisoryServicesRequests: Array<{ 
    serviceName: string; 
    serviceId: string;
    count: number; 
    color: string;
    icon?: string;
  }>;
  advisoryServiceBreakdown: Array<{
    serviceName: string;
    serviceId: string;
    totalRequests: number;
    implementedRequests: number;
    activeRequests: number;
    completionRate: number;
    color: string;
    icon?: string;
  }>;
  averageSatisfaction: number;
  recentFeedback: Array<{
    id: string;
    quality_rating: number;
    response_time_rating: number;
    satisfaction_rating: number;
    communication_rating: number;
    overall_rating: number;
    feedback_text: string;
    benefits_achieved: string;
    suggestions_for_improvement: string;
    created_at: string;
    username: string;
  }>;
}

const STATUS_COLORS = {
  'New': '#3b82f6',
  'Under Discussion': '#f59e0b',
  'Estimation': '#8b5cf6',
  'Review': '#06b6d4',
  'Approval': '#10b981',
  'Approved': '#10b981',
  'Implementing': '#f97316',
  'Awaiting Feedback': '#84cc16',
  'Feedback Received': '#6366f1',
  'Implemented': '#22c55e',
  'Reject': '#ef4444',
  'Cancelled': '#6b7280'
};

const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={`${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  );
};

export const InsightsSection: React.FC = () => {
  const [insightsData, setInsightsData] = useState<InsightsData>({
    totalRequests: 0,
    implementedRequests: 0,
    activeRequests: 0,
    completionRate: 0,
    averageLeadTime: 0,
    averageCycleTime: 0,
    statusDistribution: [],
    assigneeServiceMatrix: [],
    advisoryServicesRequests: [],
    advisoryServiceBreakdown: [],
    averageSatisfaction: 0,
    recentFeedback: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedPieSegment, setSelectedPieSegment] = useState<string | null>(null);
  const [selectedServiceModal, setSelectedServiceModal] = useState<{
    serviceName: string;
    serviceId: string;
    color: string;
  } | null>(null);
  const [selectedStatusModal, setSelectedStatusModal] = useState<{
    status: string;
    color: string;
  } | null>(null);
  const [selectedServiceOfferingModal, setSelectedServiceOfferingModal] = useState<{
    offeringName: string;
    serviceName: string;
    serviceId: string;
  } | null>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusCurrentPage, setStatusCurrentPage] = useState(1);
  const [offeringCurrentPage, setOfferingCurrentPage] = useState(1);
  const [requestsPerPage] = useState(10);

  // New state for consultant analysis
  const [selectedAdvisoryService, setSelectedAdvisoryService] = useState<string>('all');
  const [consultantStatusFilter, setConsultantStatusFilter] = useState<string>('all');
  const [consultantServiceOfferingFilter, setConsultantServiceOfferingFilter] = useState<string>('all');
  const [consultantData, setConsultantData] = useState<any[]>([]);
  const [advisoryServicesList, setAdvisoryServicesList] = useState<any[]>([]);
  const [serviceOfferingsList, setServiceOfferingsList] = useState<any[]>([]);
  
  // State for expandable advisory services
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [serviceOfferingBreakdown, setServiceOfferingBreakdown] = useState<Record<string, any[]>>({});

  // Reset service offering filter when advisory service changes
  useEffect(() => {
    setConsultantServiceOfferingFilter('all');
  }, [selectedAdvisoryService]);

  useEffect(() => {
    fetchInsightsData();

    // Set up real-time subscription for requests table
    const channel = supabase
      .channel('insights-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests'
        },
        (payload) => {
          console.log('Request data changed:', payload);
          // Refresh insights data when requests are added, updated, or deleted
          fetchInsightsData();
        }
      )
      .subscribe();

    // Set up real-time subscription for feedback table
    const feedbackChannel = supabase
      .channel('insights-feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'request_feedback'
        },
        (payload) => {
          console.log('Feedback data changed:', payload);
          // Refresh insights data when feedback is added, updated, or deleted
          fetchInsightsData();
        }
      )
      .subscribe();

    // Cleanup function to remove subscriptions
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(feedbackChannel);
    };
  }, []);

  const fetchInsightsData = async () => {
    try {
      setLoading(true);

      // Fetch ALL requests with related data (no user filtering)
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select('*');

      if (requestsError) throw requestsError;

      // Store all requests for modal use
      setAllRequests(requests || []);

      // Use the insights-specific feedback function that allows all users to see application-wide feedback
      const { data: allFeedbackData, error: feedbackError } = await supabase
        .rpc('get_all_feedback_for_insights');

      if (feedbackError) throw feedbackError;

      // Process feedback data (it already includes usernames from the function)
      const processedFeedback = (allFeedbackData || []).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Use the same data for both recent feedback and average calculation
      const allFeedback = allFeedbackData || [];

      // Fetch service offerings for matrix
      const { data: serviceOfferings, error: serviceOfferingsError } = await supabase
        .from('service_offerings')
        .select('id, name, advisory_service_id')
        .eq('is_active', true);

      if (serviceOfferingsError) throw serviceOfferingsError;

      // Fetch advisory services for tiles
      const { data: advisoryServices, error: advisoryServicesError } = await supabase
        .from('advisory_services')
        .select('id, name, icon')
        .eq('is_active', true);

      if (advisoryServicesError) throw advisoryServicesError;

      // Fetch user profiles for assignee names and feedback usernames
      // Get all profiles to ensure we have complete user data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, email');

      if (profilesError) throw profilesError;

      // Fetch request history for lead time and cycle time calculations
      const { data: requestHistory, error: requestHistoryError } = await supabase
        .from('request_history')
        .select('request_id, action, new_value, old_value, performed_at')
        .eq('action', 'Status changed');

      if (requestHistoryError) throw requestHistoryError;

      // Store advisory services and service offerings for the new consultant analysis
      setAdvisoryServicesList(advisoryServices || []);
      setServiceOfferingsList(serviceOfferings || []);

      // Process the data
      const processedData = processInsightsData(
        requests || [],
        processedFeedback.slice(0, 5) || [], // Recent feedback (first 5)
        allFeedback || [], // All feedback for average calculation
        serviceOfferings || [],
        advisoryServices || [],
        profiles || [],
        requestHistory || []
      );
      
      setInsightsData(processedData);
    } catch (error) {
      console.error('Error fetching insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get filtered requests for selected advisory service
  const getFilteredRequests = () => {
    if (!selectedServiceModal) return [];
    
    return allRequests.filter(request => 
      request.advisory_services && 
      request.advisory_services.includes(selectedServiceModal.serviceId)
    );
  };

  // Get paginated requests
  const getPaginatedRequests = () => {
    const filteredRequests = getFilteredRequests();
    const startIndex = (currentPage - 1) * requestsPerPage;
    const endIndex = startIndex + requestsPerPage;
    return filteredRequests.slice(startIndex, endIndex);
  };

  // Get filtered requests for selected status
  const getFilteredRequestsByStatus = () => {
    if (!selectedStatusModal) return [];
    
    return allRequests.filter(request => 
      request.status === selectedStatusModal.status
    );
  };

  // Get paginated requests for status
  const getPaginatedRequestsByStatus = () => {
    const filteredRequests = getFilteredRequestsByStatus();
    const startIndex = (statusCurrentPage - 1) * requestsPerPage;
    const endIndex = startIndex + requestsPerPage;
    return filteredRequests.slice(startIndex, endIndex);
  };

  // Get filtered requests for selected service offering
  const getFilteredRequestsByServiceOffering = () => {
    if (!selectedServiceOfferingModal) return [];
    
    return allRequests.filter(request => 
      request.advisory_services && 
      request.advisory_services.includes(selectedServiceOfferingModal.serviceId) &&
      request.service_specific_data?.selectedOfferings &&
      request.service_specific_data.selectedOfferings.some((offering: string) => {
        // Check if offering is UUID or name
        if (offering.includes('-') && offering.length === 36) {
          const foundOffering = serviceOfferingsList.find(so => so.id === offering);
          return foundOffering?.name === selectedServiceOfferingModal.offeringName;
        }
        return offering === selectedServiceOfferingModal.offeringName;
      })
    );
  };

  // Get paginated requests for service offering
  const getPaginatedRequestsByServiceOffering = () => {
    const filteredRequests = getFilteredRequestsByServiceOffering();
    const startIndex = (offeringCurrentPage - 1) * requestsPerPage;
    const endIndex = startIndex + requestsPerPage;
    return filteredRequests.slice(startIndex, endIndex);
  };

  // Get advisory service name by ID
  const getAdvisoryServiceName = (serviceId: string, advisoryServices: any[]) => {
    const service = advisoryServices.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  // Get service offerings from request
  const getServiceOfferings = (request: any) => {
    if (request.service_specific_data?.selectedOfferings) {
      return request.service_specific_data.selectedOfferings.join(', ');
    }
    return 'No service offerings';
  };

  // Functions for consultant analysis
  const fetchConsultantData = async (serviceId: string) => {
    try {
      // Fetch advisory team members for the selected service
      const { data: consultants, error: consultantsError } = await supabase
        .rpc('get_team_members_basic_info');

      if (consultantsError) throw consultantsError;

      // Filter consultants that have the selected advisory service
      const serviceConsultants = (Array.isArray(consultants) ? consultants : []).filter(consultant => 
        consultant.advisory_services && consultant.advisory_services.includes(serviceId)
      );

      // Get all profiles to map user_id to names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, email');

      if (profilesError) throw profilesError;

      // Calculate request counts for each consultant
      const consultantAnalysis = serviceConsultants.map(consultant => {
        // For consultants from basic view, we need to find their user_id through admin functions
        // This will only work for admin users who have access to the full data
        const consultantRequests = allRequests.filter(request => 
          // Match by name since we don't have user_id from basic view
          request.current_assignee_name === consultant.name &&
          request.advisory_services &&
          request.advisory_services.includes(serviceId)
        );

        // Apply filters
        let filteredRequests = consultantRequests;
        
        if (consultantStatusFilter !== 'all') {
          filteredRequests = filteredRequests.filter(req => req.status === consultantStatusFilter);
        }

        if (consultantServiceOfferingFilter !== 'all') {
          filteredRequests = filteredRequests.filter(req => 
            req.service_specific_data?.selectedOfferings &&
            req.service_specific_data.selectedOfferings.some((offering: string) => {
              // Check if this is a UUID or already a name
              if (offering.includes('-') && offering.length === 36) {
                // It's a UUID, map to name and compare
                const foundOffering = serviceOfferingsList.find(so => so.id === offering);
                return foundOffering?.name === consultantServiceOfferingFilter;
              } else {
                // It's already a name, compare directly
                return offering === consultantServiceOfferingFilter;
              }
            })
          );
        }

        // Find profile for additional info - skip for basic view since we don't have user_id
        const profile = null; // profiles?.find(p => p.user_id === consultant.user_id);

        return {
          ...consultant,
          profile,
          totalRequests: consultantRequests.length,
          filteredRequests: filteredRequests.length,
          requests: filteredRequests,
          statusBreakdown: getStatusBreakdown(consultantRequests),
          serviceOfferingBreakdown: getServiceOfferingBreakdown(consultantRequests)
        };
      });

      setConsultantData(consultantAnalysis);
    } catch (error) {
      console.error('Error fetching consultant data:', error);
      setConsultantData([]);
    }
  };

  const getStatusBreakdown = (requests: any[]) => {
    const breakdown: Record<string, number> = {};
    requests.forEach(request => {
      breakdown[request.status] = (breakdown[request.status] || 0) + 1;
    });
    return breakdown;
  };

  const getServiceOfferingBreakdown = (requests: any[]) => {
    const breakdown: Record<string, number> = {};
    requests.forEach(request => {
      if (request.service_specific_data?.selectedOfferings) {
        request.service_specific_data.selectedOfferings.forEach((offering: string) => {
          let offeringName = offering;
          
          // Check if this is a UUID (contains hyphens and is 36 characters) or already a name
          if (offering.includes('-') && offering.length === 36) {
            // It's a UUID, try to map to name
            const foundOffering = serviceOfferingsList.find(so => so.id === offering);
            offeringName = foundOffering?.name || offering;
          }
          // If it's not a UUID, it's likely already a name, so use it as-is
          
          breakdown[offeringName] = (breakdown[offeringName] || 0) + 1;
        });
      }
    });
    return breakdown;
  };

  // Function to calculate service offering breakdown for an advisory service
  const calculateServiceOfferingBreakdown = (advisoryServiceId: string) => {
    const serviceRequests = allRequests.filter(request => 
      request.advisory_services && request.advisory_services.includes(advisoryServiceId)
    );

    // Initialize only service offerings that belong to this advisory service
    const offeringBreakdown: Record<string, any> = {};
    
    // Filter service offerings to only those belonging to this advisory service
    const relevantServiceOfferings = serviceOfferingsList.filter(offering => 
      offering.advisory_service_id === advisoryServiceId
    );
    
    // Initialize relevant service offerings with 0 counts
    relevantServiceOfferings.forEach(offering => {
      offeringBreakdown[offering.name] = {
        name: offering.name,
        totalRequests: 0,
        implementedRequests: 0,
        activeRequests: 0,
        completionRate: 0
      };
    });
    
    // Then overlay actual request data
    serviceRequests.forEach(request => {
      if (request.service_specific_data?.selectedOfferings) {
        request.service_specific_data.selectedOfferings.forEach((offering: string) => {
          let offeringName = offering;
          
          // Check if this is a UUID or already a name
          if (offering.includes('-') && offering.length === 36) {
            const foundOffering = serviceOfferingsList.find(so => so.id === offering);
            offeringName = foundOffering?.name || offering;
          }
          
          // Only process if we have this offering in our list
          if (offeringBreakdown[offeringName]) {
            offeringBreakdown[offeringName].totalRequests++;
            if (request.status === 'Implemented') {
              offeringBreakdown[offeringName].implementedRequests++;
            } else {
              offeringBreakdown[offeringName].activeRequests++;
            }
          }
        });
      }
    });

    // Calculate completion rates
    Object.values(offeringBreakdown).forEach((offering: any) => {
      offering.completionRate = offering.totalRequests > 0 
        ? Math.round((offering.implementedRequests / offering.totalRequests) * 100)
        : 0;
    });

    return Object.values(offeringBreakdown);
  };

  // Function to toggle service expansion
  const toggleServiceExpansion = (serviceId: string) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
      // Calculate breakdown when expanding (if not already calculated)
      if (!serviceOfferingBreakdown[serviceId]) {
        const breakdown = calculateServiceOfferingBreakdown(serviceId);
        setServiceOfferingBreakdown(prev => ({
          ...prev,
          [serviceId]: breakdown
        }));
      }
    }
    setExpandedServices(newExpanded);
  };

  // Only preload breakdown data when services are manually expanded
  useEffect(() => {
    if (insightsData.advisoryServiceBreakdown.length > 0 && serviceOfferingsList.length > 0) {
      // Don't auto-expand services, just preload breakdown data for expanded ones
      const breakdownData: Record<string, any[]> = {};
      expandedServices.forEach(serviceId => {
        breakdownData[serviceId] = calculateServiceOfferingBreakdown(serviceId);
      });
      setServiceOfferingBreakdown(prev => ({ ...prev, ...breakdownData }));
    }
  }, [insightsData.advisoryServiceBreakdown, serviceOfferingsList, allRequests, expandedServices]);

  // Effect to update consultant data when filters change
  useEffect(() => {
    if (selectedAdvisoryService && selectedAdvisoryService !== 'all') {
      fetchConsultantData(selectedAdvisoryService);
    } else {
      setConsultantData([]);
    }
  }, [selectedAdvisoryService, consultantStatusFilter, consultantServiceOfferingFilter, allRequests]);

  const getAssigneeName = (assigneeId: string | null) => {
    if (!assigneeId) return 'Unassigned';
    // This would need to be enhanced with actual profile lookup
    return 'Assignee'; // Simplified for now
  };

  const processInsightsData = (
    requests: any[],
    recentFeedback: any[],
    allFeedback: any[],
    serviceOfferings: any[],
    advisoryServices: any[],
    profiles: any[],
    requestHistory: any[] = []
  ): InsightsData => {
    // Basic metrics
    const totalRequests = requests.length;
    const implementedRequests = requests.filter(r => r.status === 'Implemented').length;
    const activeRequests = requests.filter(r => r.status !== 'Implemented').length;
    const completionRate = totalRequests > 0 ? (implementedRequests / totalRequests) * 100 : 0;

    // Calculate Lead Time and Cycle Time
    const calculateTimings = () => {
      const leadTimes: number[] = [];
      const cycleTimes: number[] = [];

      const implementedRequests = requests.filter(r => r.status === 'Implemented');
      
      implementedRequests.forEach(request => {
        const requestHistoryForRequest = requestHistory.filter(h => h.request_id === request.id);
        
        // Lead Time: From request creation (New status) to Implemented
        const createdAt = new Date(request.created_at);
        const implementedAt = requestHistoryForRequest
          .filter(h => h.new_value === 'Implemented')
          .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())[0];
        
        if (implementedAt) {
          const leadTimeDays = (new Date(implementedAt.performed_at).getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          leadTimes.push(leadTimeDays);
        }

        // Cycle Time: From Implementing to Implemented
        const implementingAt = requestHistoryForRequest
          .filter(h => h.new_value === 'Implementing')
          .sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime())[0];
        
        if (implementingAt && implementedAt) {
          const cycleTimeDays = (new Date(implementedAt.performed_at).getTime() - new Date(implementingAt.performed_at).getTime()) / (1000 * 60 * 60 * 24);
          cycleTimes.push(cycleTimeDays);
        }
      });

      const averageLeadTime = leadTimes.length > 0 ? leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length : 0;
      const averageCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length : 0;

      return {
        averageLeadTime: Math.round(averageLeadTime * 10) / 10, // Round to 1 decimal place
        averageCycleTime: Math.round(averageCycleTime * 10) / 10
      };
    };

    const { averageLeadTime, averageCycleTime } = calculateTimings();

    // Status distribution
    const statusCounts: Record<string, number> = {};
    requests.forEach(request => {
      statusCounts[request.status] = (statusCounts[request.status] || 0) + 1;
    });

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280'
    }));

    // Assignee-Service Matrix
    const matrix: Record<string, Record<string, number>> = {};
    
    requests.forEach(request => {
      if (request.assignee_id) {
        // Find assignee name from profiles
        const assigneeProfile = profiles.find(p => p.user_id === request.assignee_id);
        const assigneeName = assigneeProfile?.username || 'Unknown';
        
        if (!matrix[assigneeName]) {
          matrix[assigneeName] = {};
          serviceOfferings.forEach(so => {
            matrix[assigneeName][so.name] = 0;
          });
        }

        // Count requests by service offerings from service_specific_data
        if (request.service_specific_data?.selectedOfferings) {
          const selectedOfferings = request.service_specific_data.selectedOfferings;
          selectedOfferings.forEach((offering: string) => {
            const matchingService = serviceOfferings.find(so => so.name === offering);
            if (matchingService && matrix[assigneeName][offering] !== undefined) {
              matrix[assigneeName][offering]++;
            }
          });
        }
      }
    });

    const assigneeServiceMatrix = Object.entries(matrix).map(([assignee, services]) => ({
      assignee,
      ...services
    }));

    // Advisory Services Requests Count
    const advisoryServicesCounts: Record<string, number> = {};
    requests.forEach(request => {
      if (request.advisory_services && request.advisory_services.length > 0) {
        request.advisory_services.forEach((serviceId: string) => {
          advisoryServicesCounts[serviceId] = (advisoryServicesCounts[serviceId] || 0) + 1;
        });
      }
    });

    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    const advisoryServicesRequests = advisoryServices.map((service, index) => ({
      serviceName: service.name,
      serviceId: service.id,
      count: advisoryServicesCounts[service.id] || 0,
      color: colors[index % colors.length],
      icon: service.icon
    }));

    // Advisory Service Breakdown with detailed metrics
    const advisoryServiceBreakdown = advisoryServices.map((service, index) => {
      const serviceRequests = requests.filter(request => 
        request.advisory_services && request.advisory_services.includes(service.id)
      );
      const totalServiceRequests = serviceRequests.length;
      const implementedServiceRequests = serviceRequests.filter(r => r.status === 'Implemented').length;
      const activeServiceRequests = serviceRequests.filter(r => r.status !== 'Implemented').length;
      const serviceCompletionRate = totalServiceRequests > 0 ? (implementedServiceRequests / totalServiceRequests) * 100 : 0;

      return {
        serviceName: service.name,
        serviceId: service.id,
        totalRequests: totalServiceRequests,
        implementedRequests: implementedServiceRequests,
        activeRequests: activeServiceRequests,
        completionRate: Math.round(serviceCompletionRate),
        color: colors[index % colors.length],
        icon: service.icon
      };
    });

    // Average satisfaction
    const totalRatings = allFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0);
    const averageSatisfaction = allFeedback.length > 0 ? totalRatings / allFeedback.length : 0;

    // Process recent feedback - username is now included in the view
    const processedRecentFeedback = recentFeedback.map(feedback => {
      return {
        ...feedback,
        // The view already includes the username, so we use it directly
        username: feedback.username || 'Unknown User'
      };
    });

    return {
      totalRequests,
      implementedRequests,
      activeRequests,
      completionRate: Math.round(completionRate),
      averageLeadTime,
      averageCycleTime,
      statusDistribution,
      assigneeServiceMatrix,
      advisoryServicesRequests,
      advisoryServiceBreakdown,
      averageSatisfaction,
      recentFeedback: processedRecentFeedback
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insightsData.totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Implemented</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{insightsData.implementedRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{insightsData.activeRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{insightsData.completionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{insightsData.averageLeadTime}</div>
            <p className="text-xs text-muted-foreground mt-1">days (New → Implemented)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cycle Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{insightsData.averageCycleTime}</div>
            <p className="text-xs text-muted-foreground mt-1">days (Implementing → Implemented)</p>
          </CardContent>
        </Card>
      </div>

      {/* Advisory Services Request Tiles */}
      <Card>
        <CardHeader>
          <CardTitle>Requests by Advisory Service</CardTitle>
          <CardDescription>Click on tiles to view details. Number of requests for each advisory service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insightsData.advisoryServicesRequests.map((service, index) => (
              <div
                key={service.serviceId}
                className="relative p-6 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border-2 border-transparent hover:border-opacity-50"
                style={{ 
                  backgroundColor: `${service.color}15`,
                  borderColor: service.color
                }}
                onClick={() => {
                  setSelectedServiceModal({
                    serviceName: service.serviceName,
                    serviceId: service.serviceId,
                    color: service.color
                  });
                  setCurrentPage(1);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 
                      className="font-semibold text-lg mb-2"
                      style={{ color: service.color }}
                    >
                      {service.serviceName}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-3xl font-bold"
                        style={{ color: service.color }}
                      >
                        {service.count}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        request{service.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: service.color }}
                  >
                    <span className="text-white text-xl">
                      {service.icon ? service.icon.charAt(0) : '📊'}
                    </span>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div 
                  className="absolute top-2 right-2 w-2 h-2 rounded-full"
                  style={{ backgroundColor: service.color }}
                />
                <div 
                  className="absolute bottom-2 left-2 w-1 h-1 rounded-full opacity-60"
                  style={{ backgroundColor: service.color }}
                />
              </div>
            ))}
          </div>
          
          {insightsData.advisoryServicesRequests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No advisory services data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advisory Service Wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Advisory Service Performance Breakdown</CardTitle>
          <CardDescription>Detailed metrics for each advisory service showing total requests, implemented requests, active requests, and completion rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-semibold">Advisory Service</th>
                  <th className="text-center py-3 px-2 font-semibold">Total Requests</th>
                  <th className="text-center py-3 px-2 font-semibold">Implemented</th>
                  <th className="text-center py-3 px-2 font-semibold">Active</th>
                  <th className="text-center py-3 px-2 font-semibold">Completion Rate</th>
                </tr>
              </thead>
               <tbody>
                 {insightsData.advisoryServiceBreakdown.map((service, index) => (
                   <React.Fragment key={service.serviceId}>
                     <tr 
                       className="border-b hover:bg-accent/50 cursor-pointer"
                       onClick={() => toggleServiceExpansion(service.serviceId)}
                     >
                       <td className="py-3 px-2">
                         <div className="flex items-center gap-3">
                           <div className="flex items-center">
                             {expandedServices.has(service.serviceId) ? (
                               <ChevronDown className="h-4 w-4 text-muted-foreground" />
                             ) : (
                               <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                             )}
                           </div>
                           <div 
                             className="w-4 h-4 rounded-full"
                             style={{ backgroundColor: service.color }}
                           />
                           <span className="font-medium">{service.serviceName}</span>
                         </div>
                       </td>
                       <td className="text-center py-3 px-2">
                         <div className="text-lg font-semibold">{service.totalRequests}</div>
                       </td>
                       <td className="text-center py-3 px-2">
                         <div className="flex flex-col items-center">
                           <div className="text-lg font-semibold text-green-600">{service.implementedRequests}</div>
                           <div className="text-xs text-muted-foreground">
                             {service.totalRequests > 0 ? `${Math.round((service.implementedRequests / service.totalRequests) * 100)}%` : '0%'}
                           </div>
                         </div>
                       </td>
                       <td className="text-center py-3 px-2">
                         <div className="flex flex-col items-center">
                           <div className="text-lg font-semibold text-orange-600">{service.activeRequests}</div>
                           <div className="text-xs text-muted-foreground">
                             {service.totalRequests > 0 ? `${Math.round((service.activeRequests / service.totalRequests) * 100)}%` : '0%'}
                           </div>
                         </div>
                       </td>
                       <td className="text-center py-3 px-2">
                         <div className="flex items-center justify-center gap-2">
                           <div 
                             className="text-lg font-bold"
                             style={{ 
                               color: service.completionRate >= 75 ? '#22c55e' : 
                                      service.completionRate >= 50 ? '#f59e0b' : '#ef4444'
                             }}
                           >
                             {service.completionRate}%
                           </div>
                           <div className="w-16 bg-gray-200 rounded-full h-2">
                             <div 
                               className="h-2 rounded-full transition-all duration-300"
                               style={{ 
                                 width: `${service.completionRate}%`,
                                 backgroundColor: service.completionRate >= 75 ? '#22c55e' : 
                                                service.completionRate >= 50 ? '#f59e0b' : '#ef4444'
                               }}
                             />
                           </div>
                         </div>
                       </td>
                     </tr>
                     
                     {/* Expanded Service Offerings */}
                     {expandedServices.has(service.serviceId) && serviceOfferingBreakdown[service.serviceId] && (
                       <tr key={`${service.serviceId}-expansion`}>
                         <td colSpan={5} className="p-0">
                           <div className="animate-accordion-down">
                             <div className="bg-gradient-to-r from-accent/10 to-accent/5 border-l-4 border-primary/20 ml-8 mr-4 rounded-r-lg overflow-hidden">
                               <div className="p-4">
                                 <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                   <div className="w-2 h-2 rounded-full bg-primary/60" />
                                   Service Offerings Breakdown
                                 </h4>
                                 <div className="grid gap-2">
                                   {serviceOfferingBreakdown[service.serviceId]
                                     .sort((a: any, b: any) => b.totalRequests - a.totalRequests) // Sort by total requests
                                     .map((offering: any, offeringIndex: number) => (
                                        <div 
                                          key={`${service.serviceId}-${offering.name}`}
                                          className="group bg-background/60 backdrop-blur-sm rounded-lg border border-border/50 p-3 hover:bg-background/80 hover:border-primary/20 hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                                          onClick={() => {
                                            setSelectedServiceOfferingModal({
                                              offeringName: offering.name,
                                              serviceName: service.serviceName,
                                              serviceId: service.serviceId
                                            });
                                            setOfferingCurrentPage(1);
                                          }}
                                        >
                                         <div className="grid grid-cols-5 gap-4 items-center">
                                           {/* Service Offering Name */}
                                           <div className="flex items-center gap-3">
                                             <div className="flex items-center gap-2">
                                               <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary/60 to-primary/40 group-hover:from-primary group-hover:to-primary/80 transition-all duration-300" />
                                               <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-300">
                                                 {offering.name}
                                               </span>
                                             </div>
                                           </div>
                                           
                                           {/* Total Requests */}
                                           <div className="text-center">
                                             <div className="text-lg font-semibold group-hover:scale-110 transition-transform duration-300">
                                               {offering.totalRequests}
                                             </div>
                                           </div>
                                           
                                           {/* Implemented */}
                                           <div className="text-center">
                                             <div className="flex flex-col items-center">
                                               <div className="text-lg font-semibold text-green-600 group-hover:scale-110 transition-transform duration-300">
                                                 {offering.implementedRequests}
                                               </div>
                                               <div className="text-xs text-muted-foreground">
                                                 {offering.totalRequests > 0 ? `${Math.round((offering.implementedRequests / offering.totalRequests) * 100)}%` : '0%'}
                                               </div>
                                             </div>
                                           </div>
                                           
                                           {/* Active */}
                                           <div className="text-center">
                                             <div className="flex flex-col items-center">
                                               <div className="text-lg font-semibold text-orange-600 group-hover:scale-110 transition-transform duration-300">
                                                 {offering.activeRequests}
                                               </div>
                                               <div className="text-xs text-muted-foreground">
                                                 {offering.totalRequests > 0 ? `${Math.round((offering.activeRequests / offering.totalRequests) * 100)}%` : '0%'}
                                               </div>
                                             </div>
                                           </div>
                                           
                                           {/* Completion Rate */}
                                           <div className="text-center">
                                             <div className="flex items-center justify-center gap-3">
                                               <div 
                                                 className="text-sm font-bold group-hover:scale-110 transition-transform duration-300"
                                                 style={{ 
                                                   color: offering.completionRate >= 75 ? '#22c55e' : 
                                                          offering.completionRate >= 50 ? '#f59e0b' : '#ef4444'
                                                 }}
                                               >
                                                 {offering.completionRate}%
                                               </div>
                                               <div className="w-16 bg-gray-200 rounded-full h-2 group-hover:shadow-sm transition-all duration-300">
                                                 <div 
                                                   className="h-2 rounded-full transition-all duration-500 group-hover:shadow-sm"
                                                   style={{ 
                                                     width: `${offering.completionRate}%`,
                                                     backgroundColor: offering.completionRate >= 75 ? '#22c55e' : 
                                                                    offering.completionRate >= 50 ? '#f59e0b' : '#ef4444'
                                                   }}
                                                 />
                                               </div>
                                             </div>
                                           </div>
                                         </div>
                                         
                                         {/* Subtle hover line effect */}
                                         <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
                                       </div>
                                     ))}
                                 </div>
                               </div>
                             </div>
                           </div>
                         </td>
                       </tr>
                     )}
                   </React.Fragment>
                 ))}
               </tbody>
            </table>
            
            {insightsData.advisoryServiceBreakdown.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No advisory service data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Request Status Distribution</CardTitle>
            <CardDescription>Click on segments to highlight. Current distribution of requests by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={insightsData.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    onClick={(data) => {
                      // Open status modal when pie segment is clicked
                      setSelectedStatusModal({
                        status: data.status,
                        color: data.color
                      });
                      setStatusCurrentPage(1);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {insightsData.statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        fillOpacity={selectedPieSegment ? (selectedPieSegment === entry.status ? 1 : 0.3) : 1}
                        stroke={selectedPieSegment === entry.status ? '#000' : 'none'}
                        strokeWidth={selectedPieSegment === entry.status ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => [
                      `${value} requests`,
                      props.payload.status
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Custom Legend */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {insightsData.statusDistribution.map((entry, index) => (
                  <div 
                    key={`legend-${index}`}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                      selectedPieSegment === entry.status 
                        ? 'bg-accent' 
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => {
                      setSelectedPieSegment(
                        selectedPieSegment === entry.status ? null : entry.status
                      );
                    }}
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate">{entry.status}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {entry.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Satisfaction */}
        <Card>
          <CardHeader>
            <CardTitle>Average User Satisfaction</CardTitle>
            <CardDescription>Overall satisfaction rating from user feedback</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <div className="text-6xl font-bold text-yellow-500 mb-4">
                {insightsData.averageSatisfaction.toFixed(1)}
              </div>
              <StarRating rating={insightsData.averageSatisfaction} size={32} />
              <p className="text-muted-foreground mt-2">Out of 5 stars</p>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Advisory Service Consultant Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Advisory Service Consultant Analysis
          </CardTitle>
          <CardDescription>
            Select an advisory service to view consultants and their request distribution with filtering options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Advisory Service Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Advisory Service</label>
                <Select value={selectedAdvisoryService} onValueChange={setSelectedAdvisoryService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an advisory service..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {advisoryServicesList.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedAdvisoryService && selectedAdvisoryService !== 'all' && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Filter by Status</label>
                    <Select value={consultantStatusFilter} onValueChange={setConsultantStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {Object.keys(STATUS_COLORS).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Filter by Service Offering</label>
                    <Select value={consultantServiceOfferingFilter} onValueChange={setConsultantServiceOfferingFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Service Offerings</SelectItem>
                        {serviceOfferingsList
                          .filter((offering) => 
                            selectedAdvisoryService === 'all' || 
                            offering.advisory_service_id === selectedAdvisoryService
                          )
                          .map((offering) => (
                            <SelectItem key={offering.name} value={offering.name}>
                              {offering.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Consultant Analysis Results */}
            {selectedAdvisoryService && selectedAdvisoryService !== 'all' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">
                    Showing {consultantData.length} consultants for{' '}
                    {advisoryServicesList.find(s => s.id === selectedAdvisoryService)?.name}
                    {consultantStatusFilter !== 'all' && ` with status: ${consultantStatusFilter}`}
                    {consultantServiceOfferingFilter !== 'all' && ` for service: ${consultantServiceOfferingFilter}`}
                  </span>
                </div>

                {consultantData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No consultants found for the selected criteria
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {consultantData.map((consultant) => (
                      <Card key={consultant.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{consultant.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{consultant.title}</p>
                              {consultant.profile?.email && (
                                <p className="text-xs text-muted-foreground mt-1">{consultant.profile.email}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">
                                {consultant.filteredRequests}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                of {consultant.totalRequests} total
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {/* Status Breakdown */}
                            {Object.keys(consultant.statusBreakdown).length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">Status Breakdown</h4>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(consultant.statusBreakdown).map(([status, count]) => (
                                    <Badge
                                      key={status}
                                      variant="outline"
                                      className="text-xs"
                                      style={{
                                        borderColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280',
                                        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280'
                                      }}
                                    >
                                      {status}: {count as number}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Service Offering Breakdown */}
                            {Object.keys(consultant.serviceOfferingBreakdown).length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">Service Offerings</h4>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(consultant.serviceOfferingBreakdown).map(([offering, count]) => (
                                    <Badge
                                      key={offering}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {offering}: {count as number}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(!selectedAdvisoryService || selectedAdvisoryService === 'all') && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an advisory service above to view consultant analysis</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Recent User Feedback</CardTitle>
          <CardDescription>Latest feedback submissions from users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feedback Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Feedback
              </h4>
              <div className="space-y-3">
                {insightsData.recentFeedback.filter(f => f.feedback_text).slice(0, 5).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No feedback available</p>
                ) : (
                  insightsData.recentFeedback.filter(f => f.feedback_text).slice(0, 5).map((feedback) => (
                    <div key={`feedback-${feedback.id}`} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{feedback.username}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{feedback.feedback_text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Benefits Achieved Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Benefits Achieved
              </h4>
              <div className="space-y-3">
                {insightsData.recentFeedback.filter(f => f.benefits_achieved).slice(0, 5).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No benefits reported</p>
                ) : (
                  insightsData.recentFeedback.filter(f => f.benefits_achieved).slice(0, 5).map((feedback) => (
                    <div key={`benefits-${feedback.id}`} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{feedback.username}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{feedback.benefits_achieved}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Suggestions Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Suggestions
              </h4>
              <div className="space-y-3">
                {insightsData.recentFeedback.filter(f => f.suggestions_for_improvement).slice(0, 5).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No suggestions available</p>
                ) : (
                  insightsData.recentFeedback.filter(f => f.suggestions_for_improvement).slice(0, 5).map((feedback) => (
                    <div key={`suggestions-${feedback.id}`} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{feedback.username}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{feedback.suggestions_for_improvement}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal for Advisory Service Requests */}
      <Dialog open={!!selectedServiceModal} onOpenChange={() => setSelectedServiceModal(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle 
              className="flex items-center gap-2"
              style={{ color: selectedServiceModal?.color }}
            >
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedServiceModal?.color }}
              />
              {selectedServiceModal?.serviceName} - Requests
            </DialogTitle>
            <DialogDescription>
              Showing all requests for this advisory service ({getFilteredRequests().length} total)
              {getFilteredRequests().length > requestsPerPage && (
                <span className="text-blue-600 font-medium"> - Multiple pages available</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {getPaginatedRequests().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No requests found for this service
              </div>
            ) : (
              getPaginatedRequests().map((request, index) => (
                <div 
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Request ID:</span>
                      <p className="font-mono text-sm mt-1">{request.request_id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Assignee:</span>
                      <p className="text-sm mt-1">
                        {request.current_assignee_name || request.assigned_consultant_name || 'Unassigned'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Status:</span>
                      <Badge 
                        className="mt-1"
                        style={{ 
                          backgroundColor: STATUS_COLORS[request.status as keyof typeof STATUS_COLORS] || '#6b7280',
                          color: 'white'
                        }}
                      >
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {request.description && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="font-medium text-sm text-muted-foreground">Description:</span>
                      <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                        {request.description}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination - Temporarily always showing for testing */}
          {getFilteredRequests().length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * requestsPerPage) + 1} to{' '}
                {Math.min(currentPage * requestsPerPage, getFilteredRequests().length)} of{' '}
                {getFilteredRequests().length} requests
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(getFilteredRequests().length / requestsPerPage)}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(getFilteredRequests().length / requestsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(getFilteredRequests().length / requestsPerPage)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal for Status Requests */}
      <Dialog open={!!selectedStatusModal} onOpenChange={() => setSelectedStatusModal(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle 
              className="flex items-center gap-2"
              style={{ color: selectedStatusModal?.color }}
            >
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedStatusModal?.color }}
              />
              {selectedStatusModal?.status} Status - Requests
            </DialogTitle>
            <DialogDescription>
              Showing all requests with "{selectedStatusModal?.status}" status ({getFilteredRequestsByStatus().length} total)
              {getFilteredRequestsByStatus().length > requestsPerPage && (
                <span className="text-blue-600 font-medium"> - Multiple pages available</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {getPaginatedRequestsByStatus().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No requests found with this status
              </div>
            ) : (
              getPaginatedRequestsByStatus().map((request, index) => (
                <div 
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Request ID:</span>
                      <p className="font-mono text-sm mt-1">{request.request_id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Assignee:</span>
                      <p className="text-sm mt-1">
                        {request.current_assignee_name || request.assigned_consultant_name || 'Unassigned'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Advisory Service:</span>
                      <p className="text-sm mt-1">
                        {request.advisory_services && request.advisory_services.length > 0 
                          ? getAdvisoryServiceName(request.advisory_services[0], insightsData.advisoryServicesRequests)
                          : 'Not specified'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Service Offerings:</span>
                      <p className="text-sm mt-1">
                        {getServiceOfferings(request)}
                      </p>
                    </div>
                  </div>
                  
                  {request.description && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="font-medium text-sm text-muted-foreground">Description:</span>
                      <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                        {request.description}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination for Status Requests */}
          {getFilteredRequestsByStatus().length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((statusCurrentPage - 1) * requestsPerPage) + 1} to{' '}
                {Math.min(statusCurrentPage * requestsPerPage, getFilteredRequestsByStatus().length)} of{' '}
                {getFilteredRequestsByStatus().length} requests
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={statusCurrentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Page {statusCurrentPage} of {Math.ceil(getFilteredRequestsByStatus().length / requestsPerPage)}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusCurrentPage(prev => Math.min(Math.ceil(getFilteredRequestsByStatus().length / requestsPerPage), prev + 1))}
                  disabled={statusCurrentPage >= Math.ceil(getFilteredRequestsByStatus().length / requestsPerPage)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal for Service Offering Requests */}
      <Dialog open={!!selectedServiceOfferingModal} onOpenChange={() => setSelectedServiceOfferingModal(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {selectedServiceOfferingModal?.offeringName} - Service Offering Requests
            </DialogTitle>
            <DialogDescription>
              Showing all requests for "{selectedServiceOfferingModal?.offeringName}" under {selectedServiceOfferingModal?.serviceName} ({getFilteredRequestsByServiceOffering().length} total)
              {getFilteredRequestsByServiceOffering().length > requestsPerPage && (
                <span className="text-blue-600 font-medium"> - Multiple pages available</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {getPaginatedRequestsByServiceOffering().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No requests found for this service offering
              </div>
            ) : (
              getPaginatedRequestsByServiceOffering().map((request, index) => (
                <div 
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Request ID:</span>
                      <p className="font-mono text-sm mt-1">{request.request_id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Current Assignee:</span>
                      <p className="text-sm mt-1">
                        {request.current_assignee_name || request.assigned_consultant_name || 'Unassigned'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Status:</span>
                      <Badge 
                        className="mt-1"
                        style={{ 
                          backgroundColor: STATUS_COLORS[request.status as keyof typeof STATUS_COLORS] || '#6b7280',
                          color: 'white'
                        }}
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium text-sm text-muted-foreground">Submission Date:</span>
                      <p className="text-sm mt-1">
                        {new Date(request.submission_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {request.description && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="font-medium text-sm text-muted-foreground">Description:</span>
                      <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                        {request.description}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination for Service Offering Requests */}
          {getFilteredRequestsByServiceOffering().length > requestsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                Showing {((offeringCurrentPage - 1) * requestsPerPage) + 1} to{' '}
                {Math.min(offeringCurrentPage * requestsPerPage, getFilteredRequestsByServiceOffering().length)} of{' '}
                {getFilteredRequestsByServiceOffering().length} requests
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOfferingCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={offeringCurrentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Page {offeringCurrentPage} of {Math.ceil(getFilteredRequestsByServiceOffering().length / requestsPerPage)}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOfferingCurrentPage(prev => Math.min(Math.ceil(getFilteredRequestsByServiceOffering().length / requestsPerPage), prev + 1))}
                  disabled={offeringCurrentPage >= Math.ceil(getFilteredRequestsByServiceOffering().length / requestsPerPage)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};