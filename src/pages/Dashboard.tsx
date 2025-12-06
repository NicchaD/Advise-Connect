import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, TrendingUp, Clock, Users, Target, BarChart3, Home, User, Shield, Settings, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { InsightsSection } from '@/components/InsightsSection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchUserProfiles, getUserDisplayName, getRequestorDisplayName, createProfileLookupMap, type UserProfile } from '@/lib/userUtils';
import type { User as SupabaseUser } from '@supabase/supabase-js';
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
  AreaChart,
  Area,
  ResponsiveContainer
} from 'recharts';

// Tool ID to name mapping
const TOOL_ID_TO_NAME_MAP: Record<string, string> = {
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
  'tableau': 'Tableau',
  'power-bi': 'Power BI',
  'excel': 'Microsoft Excel',
  'python': 'Python'
};

const getToolDisplayName = (toolId: string): string => {
  return TOOL_ID_TO_NAME_MAP[toolId] || toolId;
};

const getServiceOfferingDisplayName = (serviceId: string, serviceOfferingsMap: Record<string, string>, advisoryServicesMap: Record<string, string>): string => {
  // First try service offerings map
  if (serviceOfferingsMap[serviceId]) {
    return serviceOfferingsMap[serviceId];
  }
  // Then try advisory services map
  if (advisoryServicesMap[serviceId]) {
    return advisoryServicesMap[serviceId];
  }
  // If no mapping found, return the original value
  return serviceId;
};

interface DashboardData {
  totalRequestsThisMonth: number;
  completionRate: number;
  toolTrends: Array<{ tool: string; count: number; avgResolutionDays: number }>;
  monthlyTrends: Array<{ month: string; requests: number; completions: number }>;
  consultantPerformance: Array<{ 
    name: string; 
    completedRequests: number; 
    avgResolutionTime: number;
    activeRequests: number;
  }>;
  statusDistribution: Array<{ status: string; count: number; color: string }>;
  serviceOfferingStats: Array<{ name: string; count: number; color: string }>;
  // New assignee metrics
  assigneeMetrics: {
    totalAssignedRequests: number;
    assigneeCompletionRate: number;
    implementedByAssignee: number;
  };
}

const STATUS_COLORS = {
  'Submitted': '#3b82f6',
  'In Progress': '#f59e0b', 
  'Under Review': '#8b5cf6',
  'Approved': '#10b981',
  'Completed': '#6b7280',
  'Rejected': '#ef4444',
  'Implemented': '#22c55e',
  'New': '#06b6d4',
  'Implementing': '#f97316',
  'Under Discussion': '#a855f7',
  'Estimation': '#eab308',
  'Review': '#f43f5e'
};

// Vibrant color palette for pie chart
const PIE_CHART_COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint Green
  '#FFEAA7', // Warm Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Seafoam
  '#F7DC6F', // Light Gold
  '#BB8FCE', // Lavender
  '#85C1E9', // Light Blue
  '#F8C471', // Peach
  '#82E0AA'  // Light Green
];

export const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalRequestsThisMonth: 0,
    completionRate: 0,
    toolTrends: [],
    monthlyTrends: [],
    consultantPerformance: [],
    statusDistribution: [],
    serviceOfferingStats: [],
    assigneeMetrics: {
      totalAssignedRequests: 0,
      assigneeCompletionRate: 0,
      implementedByAssignee: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('30');
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Dialog and pagination state
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogRequests, setDialogRequests] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [advisoryServicesMap, setAdvisoryServicesMap] = useState<Record<string, string>>({});
  const [serviceOfferingsMap, setServiceOfferingsMap] = useState<Record<string, string>>({});
  
  // Status pie chart dialog state
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusDialogRequests, setStatusDialogRequests] = useState<any[]>([]);
  const [statusCurrentPage, setStatusCurrentPage] = useState(1);
  const [statusTotalPages, setStatusTotalPages] = useState(1);
  const [assignedRequestsStatusData, setAssignedRequestsStatusData] = useState<Array<{ status: string; count: number; color: string }>>([]);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initial auth check effect
  useEffect(() => {
    checkAuth();
  }, []);

  // Data loading effect - only runs when user, userRole, or timeFilter changes
  useEffect(() => {
    if (user && userRole) {
      loadDashboardData();
    }
  }, [timeFilter, user, userRole]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);

      // Get user profile and role
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setUserProfile(profile);
        setUserRole(profile.role);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/login');
    }
  };

  const loadDashboardData = async () => {
    if (!user || !userRole) return;
    
    try {
      if (userRole === 'Admin') {
        await fetchAdminDashboardData();
      } else {
        await fetchUserDashboardData(user.id);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const fetchAdminDashboardData = async () => {
    try {
      setLoading(true);

      // Calculate date ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysAgo = new Date(now.setDate(now.getDate() - parseInt(timeFilter)));
      
      // Fetch all requests
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .order('submission_date', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch profiles separately to join manually
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, role');

      if (profilesError) throw profilesError;

      if (!requests) {
        throw new Error('No requests data received');
      }

      // Create a profile lookup map
      const profileMap = profiles.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Manually join requests with profiles
      const requestsWithProfiles = requests.map(request => ({
        ...request,
        assignee: request.assignee_id ? profileMap[request.assignee_id] : null,
        requestor: request.requestor_id ? profileMap[request.requestor_id] : null
      }));

      // Process the data for analytics
      const processedData = processAnalyticsData(requestsWithProfiles);
      setDashboardData(processedData);

    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDashboardData = async (userId: string) => {
    try {
      setLoading(true);

      // Fetch user's own requests (as requestor)
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .eq('requestor_id', userId)
        .order('submission_date', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch requests assigned to user (as assignee)
      const { data: assignedRequests, error: assignedRequestsError } = await supabase
        .from('requests')
        .select('*')
        .eq('assignee_id', userId)
        .order('submission_date', { ascending: false });

      if (assignedRequestsError) throw assignedRequestsError;

      // Fetch service offerings for name mapping
      const { data: serviceOfferings, error: serviceOfferingsError } = await supabase
        .from('service_offerings')
        .select('id, name')
        .eq('is_active', true);

      if (serviceOfferingsError) throw serviceOfferingsError;

      // Fetch advisory services for name mapping
      const { data: advisoryServices, error: advisoryServicesError } = await supabase
        .from('advisory_services')
        .select('id, name')
        .eq('is_active', true);

      if (advisoryServicesError) throw advisoryServicesError;

      // Fetch user profile for joining
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, role');

      if (profilesError) throw profilesError;

      if (!requests) {
        throw new Error('No requests data received');
      }

      // Create a profile lookup map
      const profileMap = profiles.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Manually join requests with profiles
      const requestsWithProfiles = requests.map(request => ({
        ...request,
        assignee: request.assignee_id ? profileMap[request.assignee_id] : null,
        requestor: request.requestor_id ? profileMap[request.requestor_id] : null
      }));

      // Create advisory services mapping
      const advisoryServicesMapping = advisoryServices?.reduce((acc, service) => {
        acc[service.id] = service.name;
        return acc;
      }, {} as Record<string, string>) || {};
      
      setAdvisoryServicesMap(advisoryServicesMapping);

      // Create service offerings mapping
      const serviceOfferingsMapping = serviceOfferings?.reduce((acc, offering) => {
        acc[offering.id] = offering.name;
        return acc;
      }, {} as Record<string, string>) || {};
      
      setServiceOfferingsMap(serviceOfferingsMapping);

      // Process user-specific data including assignee metrics
      const processedData = processUserAnalyticsData(requestsWithProfiles, assignedRequests || [], serviceOfferings || []);
      setDashboardData(processedData);

      // Process assigned requests status data for pie chart
      const statusCounts: Record<string, number> = {};
      (assignedRequests || []).forEach(request => {
        statusCounts[request.status] = (statusCounts[request.status] || 0) + 1;
      });

      const assignedStatusData = Object.entries(statusCounts).map(([status, count], index) => ({
        status,
        count,
        color: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]
      }));
      
      setAssignedRequestsStatusData(assignedStatusData);

    } catch (error) {
      console.error('User dashboard fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processUserAnalyticsData = (requests: any[], assignedRequests: any[] = [], serviceOfferings: any[] = []): DashboardData => {
    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeFilter));

    // Total requests this month
    const thisMonthRequests = requests.filter(r => 
      new Date(r.submission_date) >= startOfMonth
    );

    // Completion rate over selected period
    const recentRequests = requests.filter(r => 
      new Date(r.submission_date) >= daysAgo
    );
    const completedRecent = recentRequests.filter(r => r.status === 'Completed');
    const completionRate = recentRequests.length > 0 ? 
      (completedRecent.length / recentRequests.length) * 100 : 0;

    // Tool trends - user's requests only
    const toolCounts: Record<string, { count: number; resolutionTimes: number[] }> = {};
    
    requests.forEach(request => {
      request.selected_tools.forEach((tool: string) => {
        if (!toolCounts[tool]) {
          toolCounts[tool] = { count: 0, resolutionTimes: [] };
        }
        toolCounts[tool].count++;
        
        if (request.status === 'Completed') {
          const submissionDate = new Date(request.submission_date);
          const completionDate = new Date(request.updated_at);
          const resolutionDays = Math.ceil((completionDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
          toolCounts[tool].resolutionTimes.push(resolutionDays);
        }
      });
    });

    const toolTrends = Object.entries(toolCounts)
      .map(([tool, data]) => ({
        tool: getToolDisplayName(tool),
        count: data.count,
        avgResolutionDays: data.resolutionTimes.length > 0 
          ? Math.round(data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length)
          : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Limit to top 5 for user view

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

    // Calculate assignee metrics
    const assigneeMetrics = {
      totalAssignedRequests: assignedRequests.length,
      assigneeCompletionRate: assignedRequests.length > 0 ? 
        Math.round((assignedRequests.filter(r => r.status === 'Implemented').length / assignedRequests.length) * 100) : 0,
      implementedByAssignee: assignedRequests.filter(r => r.status === 'Implemented').length
    };

    // Service offering statistics for assigned requests (not user's own requests)
    const serviceOfferingStats: Array<{ name: string; count: number; color: string }> = [];
    if (assignedRequests.length > 0) {
      console.log('Processing service offering stats for assigned requests:', assignedRequests.length);
      console.log('Available service offerings:', serviceOfferings);
      
      // Create a mapping from ID to name
      const serviceOfferingNameMap = serviceOfferings.reduce((acc, offering) => {
        acc[offering.id] = offering.name;
        return acc;
      }, {} as Record<string, string>);
      
      const serviceOfferingCounts: Record<string, number> = {};
      
      assignedRequests.forEach((request, index) => {
        console.log(`Assigned Request ${index}:`, {
          id: request.id,
          service_specific_data: request.service_specific_data,
          advisory_services: request.advisory_services
        });
        
        // Try multiple possible data structures
        let serviceOfferings: string[] = [];
        
        // Check service_specific_data.selectedServiceOfferings
        if (request.service_specific_data?.selectedServiceOfferings) {
          serviceOfferings = Array.isArray(request.service_specific_data.selectedServiceOfferings) 
            ? request.service_specific_data.selectedServiceOfferings 
            : [request.service_specific_data.selectedServiceOfferings];
        }
        // Check service_specific_data.selectedOfferings 
        else if (request.service_specific_data?.selectedOfferings) {
          serviceOfferings = Array.isArray(request.service_specific_data.selectedOfferings) 
            ? request.service_specific_data.selectedOfferings 
            : [request.service_specific_data.selectedOfferings];
        }
        // Fallback to advisory_services
        else if (request.advisory_services && request.advisory_services.length > 0) {
          serviceOfferings = request.advisory_services;
        }
        
        console.log(`Assigned Request ${index} service offerings:`, serviceOfferings);
        
        serviceOfferings.forEach((offering: string) => {
          if (offering && offering.trim()) {
            // Use the actual name from the mapping, or fallback to the ID/name itself
            const displayName = serviceOfferingNameMap[offering] || offering;
            serviceOfferingCounts[displayName] = (serviceOfferingCounts[displayName] || 0) + 1;
          }
        });
      });

      console.log('Assigned requests service offering counts:', serviceOfferingCounts);

      const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      serviceOfferingStats.push(...Object.entries(serviceOfferingCounts)
        .map(([name, count], index) => ({
          name,
          count,
          color: colors[index % colors.length]
        }))
        .sort((a, b) => b.count - a.count)
      );
    }
    
    console.log('Final assigned requests service offering stats:', serviceOfferingStats);

    return {
      totalRequestsThisMonth: thisMonthRequests.length,
      completionRate: Math.round(completionRate),
      toolTrends,
      monthlyTrends: [], // Simplified for user view
      consultantPerformance: [], // Not relevant for user view
      statusDistribution,
      serviceOfferingStats,
      assigneeMetrics
    };
  };

  const processAnalyticsData = (requests: any[]): DashboardData => {
    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeFilter));
    
    // Total requests this month
    const thisMonthRequests = requests.filter(r => 
      new Date(r.submission_date) >= startOfMonth
    );

    // Completion rate over last 30 days
    const recentRequests = requests.filter(r => 
      new Date(r.submission_date) >= daysAgo
    );
    const completedRecent = recentRequests.filter(r => r.status === 'Completed');
    const completionRate = recentRequests.length > 0 ? 
      (completedRecent.length / recentRequests.length) * 100 : 0;

    // Tool trends
    const toolCounts: Record<string, { count: number; resolutionTimes: number[] }> = {};
    
    requests.forEach(request => {
      request.selected_tools.forEach((tool: string) => {
        if (!toolCounts[tool]) {
          toolCounts[tool] = { count: 0, resolutionTimes: [] };
        }
        toolCounts[tool].count++;
        
        if (request.status === 'Completed') {
          const submissionDate = new Date(request.submission_date);
          const completionDate = new Date(request.updated_at);
          const resolutionDays = Math.ceil((completionDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
          toolCounts[tool].resolutionTimes.push(resolutionDays);
        }
      });
    });

    const toolTrends = Object.entries(toolCounts)
      .map(([tool, data]) => ({
        tool: getToolDisplayName(tool),
        count: data.count,
        avgResolutionDays: data.resolutionTimes.length > 0 
          ? Math.round(data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length)
          : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Monthly trends (last 6 months)
    const monthlyData: Record<string, { requests: number; completions: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyData[monthKey] = { requests: 0, completions: 0 };
    }

    requests.forEach(request => {
      const requestDate = new Date(request.submission_date);
      const monthKey = requestDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].requests++;
        if (request.status === 'Completed') {
          monthlyData[monthKey].completions++;
        }
      }
    });

    const monthlyTrends = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data
    }));

    // Consultant performance - derive from assigned requests
    const consultantStats: Record<string, {
      name: string;
      completedRequests: number;
      resolutionTimes: number[];
      activeRequests: number;
    }> = {};

    // Gather consultant data from requests with assignees
    requests.forEach(request => {
      if (request.assignee_id && request.assignee) {
        const assigneeId = request.assignee_id;
        
        if (!consultantStats[assigneeId]) {
          consultantStats[assigneeId] = {
            name: request.assignee.username || 'Unknown Consultant',
            completedRequests: 0,
            resolutionTimes: [],
            activeRequests: 0
          };
        }

        if (request.status === 'Completed') {
          consultantStats[assigneeId].completedRequests++;
          const submissionDate = new Date(request.submission_date);
          const completionDate = new Date(request.updated_at);
          const resolutionDays = Math.ceil((completionDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
          consultantStats[assigneeId].resolutionTimes.push(resolutionDays);
        } else if (['Submitted', 'In Progress', 'Under Review'].includes(request.status)) {
          consultantStats[assigneeId].activeRequests++;
        }
      }
    });

    const consultantPerformance = Object.values(consultantStats).map(consultant => ({
      name: consultant.name,
      completedRequests: consultant.completedRequests,
      avgResolutionTime: consultant.resolutionTimes.length > 0
        ? Math.round(consultant.resolutionTimes.reduce((a, b) => a + b, 0) / consultant.resolutionTimes.length)
        : 0,
      activeRequests: consultant.activeRequests
    })).sort((a, b) => b.completedRequests - a.completedRequests);

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

    // For admin, add empty service offering stats (not relevant for admin view)
    const serviceOfferingStats: Array<{ name: string; count: number; color: string }> = [];

    return {
      totalRequestsThisMonth: thisMonthRequests.length,
      completionRate: Math.round(completionRate),
      toolTrends,
      monthlyTrends,
      consultantPerformance,
      statusDistribution,
      serviceOfferingStats,
      assigneeMetrics: {
        totalAssignedRequests: 0,
        assigneeCompletionRate: 0,
        implementedByAssignee: 0
      }
    };
  };

  // Handle clicking on status pie chart slices
  const handleStatusPieClick = async (data: any) => {
    if (!user || !data || !data.status) return;
    
    setLoadingRequests(true);
    setStatusCurrentPage(1);
    setSelectedStatus(data.status);
    
    try {
      // Fetch assigned requests with the selected status
      const { data: assignedRequests, error } = await supabase
        .from('requests')
        .select('*')
        .eq('assignee_id', user.id)
        .eq('status', data.status)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch requestor profiles for the filtered requests
      const requestorIds = [...new Set((assignedRequests || []).map(r => r.requestor_id).filter(Boolean))];
      
      const requestorProfiles = await fetchUserProfiles(requestorIds);
      const profileMap = createProfileLookupMap(requestorProfiles);

      // Manually join the data
      const requestsWithProfiles = (assignedRequests || []).map(request => ({
        ...request,
        requestor_profile: request.requestor_id ? profileMap[request.requestor_id] : null
      }));

      setStatusDialogRequests(requestsWithProfiles);
      const totalPages = Math.ceil(requestsWithProfiles.length / 5);
      setStatusTotalPages(totalPages);
      setShowStatusDialog(true);
    } catch (error) {
      console.error('Error fetching status requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch request details",
        variant: "destructive"
      });
    } finally {
      setLoadingRequests(false);
    }
  };

  // Handle clicking on tiles
  const handleTileClick = async (type: 'total' | 'implemented' | 'total_requests' | 'active_requests') => {
    if (!user) return;
    
    setLoadingRequests(true);
    setCurrentPage(1);
    
    let title = '';
    switch (type) {
      case 'total':
        title = 'Total Assigned Requests';
        break;
      case 'implemented':
        title = 'Implemented Requests';
        break;
      case 'total_requests':
        title = 'All My Requests';
        break;
      case 'active_requests':
        title = 'Active Requests';
        break;
    }
    setDialogTitle(title);
    
    try {
      let requests: any[] = [];
      let filteredRequests: any[] = [];

      if (type === 'total_requests' || type === 'active_requests') {
        // Fetch user's own requests (as requestor)
        const { data: userRequests, error } = await supabase
          .from('requests')
          .select('*')
          .eq('requestor_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        requests = userRequests || [];

        // Filter based on type
        if (type === 'active_requests') {
          filteredRequests = requests.filter(r => 
            ['Submitted', 'In Progress', 'Under Review'].includes(r.status)
          );
        } else {
          filteredRequests = requests;
        }
      } else {
        // For assigned requests (total and implemented)
        const { data: assignedRequests, error } = await supabase
          .from('requests')
          .select('*')
          .eq('assignee_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        requests = assignedRequests || [];

        // If filtering for implemented only
        filteredRequests = type === 'implemented' 
          ? requests.filter(r => r.status === 'Implemented')
          : requests;
      }

      // Fetch requestor profiles separately for the filtered requests
      const requestorIds = [...new Set(filteredRequests.map(r => r.requestor_id).filter(Boolean))];
      
      const requestorProfiles = await fetchUserProfiles(requestorIds);
      const profileMap = createProfileLookupMap(requestorProfiles);

      // Manually join the data
      const requestsWithProfiles = filteredRequests.map(request => ({
        ...request,
        requestor_profile: request.requestor_id ? profileMap[request.requestor_id] : null,
        tileType: type // Pass tile type to identify redirection
      }));

      setDialogRequests(requestsWithProfiles);
      const totalPages = Math.ceil(requestsWithProfiles.length / 5);
      setTotalPages(totalPages);
      setShowRequestDialog(true);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch request details",
        variant: "destructive"
      });
    } finally {
      setLoadingRequests(false);
    }
  };

  // Get paginated requests for dialog
  const getPaginatedRequests = () => {
    const startIndex = (currentPage - 1) * 5;
    const endIndex = startIndex + 5;
    return dialogRequests.slice(startIndex, endIndex);
  };

  // Get paginated status requests for status dialog
  const getPaginatedStatusRequests = () => {
    const startIndex = (statusCurrentPage - 1) * 5;
    const endIndex = startIndex + 5;
    return statusDialogRequests.slice(startIndex, endIndex);
  };

  // Navigate to request details
  const navigateToRequest = (request: any) => {
    setShowRequestDialog(false);
    
    // Determine redirection based on tile type
    const tileType = request.tileType;
    
    if (tileType === 'total' || tileType === 'implemented') {
      // Total Assigned and Implemented By Me -> My Items module
      navigate(`/my-items?requestId=${request.id}`);
    } else {
      // Total Request and Active Requests -> My Requests module
      navigate(`/my-requests?requestId=${request.id}`);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Implemented': return 'default';
      case 'Implementing': return 'secondary';
      case 'New': return 'outline';
      case 'Under Discussion': return 'secondary';
      case 'Estimation': return 'secondary';
      case 'Review': return 'outline';
      case 'Approved': return 'default';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  const isAdmin = userRole === 'Admin';
  const isStakeholder = userProfile?.title === 'Stakeholder';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Dashboard Tabs with Filter */}
        <Tabs defaultValue="my-dashboard" className="w-full">
          {/* Enhanced Tab Header with Beautiful Effects */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="relative">
              {/* Glowing Background Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur opacity-25 animate-pulse"></div>
              
              {/* Enhanced TabsList with Custom Styling */}
              <TabsList className="relative grid grid-cols-2 w-full sm:w-auto bg-white/90 backdrop-blur-lg border border-white/20 shadow-xl rounded-xl p-1 transition-all duration-300 hover:shadow-2xl hover:scale-105">
                <TabsTrigger 
                  value="my-dashboard" 
                  className="relative px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 
                           data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 
                           data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105
                           hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700
                           data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-blue-600
                           group overflow-hidden"
                >
                  {/* Tab Content */}
                  <div className="relative z-10 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-current opacity-75 group-data-[state=active]:animate-pulse"></div>
                    My Dashboard
                  </div>
                  
                  {/* Active Indicator */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-500 origin-left"></div>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="insights" 
                  className="relative px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300
                           data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 
                           data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105
                           hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700
                           data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-purple-600
                           group overflow-hidden"
                >
                  {/* Tab Content */}
                  <div className="relative z-10 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-current opacity-75 group-data-[state=active]:animate-pulse"></div>
                    Insights
                  </div>
                  
                  {/* Active Indicator */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-500 origin-left"></div>
                </TabsTrigger>
              </TabsList>
              
              {/* Additional Decorative Elements */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-60 animate-pulse"></div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin-dashboard')}
                  className="bg-white/80 hover:bg-white"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
              )}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Time Range:
                </label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Enhanced Tab Content with Animations */}
          <TabsContent value="my-dashboard" className="space-y-6 animate-fade-in">
            {/* Decorative Header */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl p-1 border border-white/30">
                <div className="text-center py-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Welcome to Your Dashboard
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Track your requests and performance metrics</p>
                </div>
              </div>
            </div>
            {/* User Profile Card - Only for non-admin users */}
            {!isAdmin && (
              <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    User Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm opacity-90">Name</p>
                      <p className="font-semibold">{userProfile?.username || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-90">Email</p>
                      <p className="font-semibold">{userProfile?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-90">Role</p>
                      <p className="font-semibold">{userProfile?.role || 'Standard User'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isAdmin ? (
            <>
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">
                    Total Requests This Month
                  </CardTitle>
                  <CalendarDays className="h-4 w-4 opacity-90" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardData.totalRequestsThisMonth}</div>
                  <p className="text-xs opacity-90 mt-1">
                    All service requests submitted
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Completion Rate</CardTitle>
                  <Target className="h-4 w-4 opacity-90" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardData.completionRate}%</div>
                  <p className="text-xs opacity-90 mt-1">
                    Last {timeFilter} days performance
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Active Consultants</CardTitle>
                  <Users className="h-4 w-4 opacity-90" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardData.consultantPerformance.length}</div>
                  <p className="text-xs opacity-90 mt-1">
                    Advisory team members
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Avg Resolution</CardTitle>
                  <Clock className="h-4 w-4 opacity-90" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {Math.round(dashboardData.toolTrends.reduce((acc, tool) => acc + tool.avgResolutionDays, 0) / Math.max(dashboardData.toolTrends.length, 1))} days
                  </div>
                  <p className="text-xs opacity-90 mt-1">
                    Average completion time
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card 
                className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                onClick={() => handleTileClick('total_requests')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Total Requests</CardTitle>
                  <BarChart3 className="h-4 w-4 opacity-90" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardData.statusDistribution.reduce((acc, status) => acc + status.count, 0)}</div>
                  <p className="text-xs opacity-90 mt-1">
                    All time requests (Click to view)
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                onClick={() => handleTileClick('active_requests')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Active Requests</CardTitle>
                  <Clock className="h-4 w-4 opacity-90" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {dashboardData.statusDistribution
                      .filter(status => ['Submitted', 'In Progress', 'Under Review'].includes(status.status))
                      .reduce((acc, status) => acc + status.count, 0)
                    }
                  </div>
                  <p className="text-xs opacity-90 mt-1">
                    Pending completion (Click to view)
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Completion Rate</CardTitle>
                  <Target className="h-4 w-4 opacity-90" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardData.completionRate}%</div>
                  <p className="text-xs opacity-90 mt-1">
                    Last {timeFilter} days performance
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Assignee Metrics Section - Non-Admin Only */}
        {!isAdmin && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Assigned Requests Dashboard</h3>
              <p className="text-muted-foreground">Metrics for requests assigned to you as a consultant</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card 
              className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
              onClick={() => handleTileClick('total')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Total Assigned</CardTitle>
                <Shield className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboardData.assigneeMetrics.totalAssignedRequests}</div>
                <p className="text-xs opacity-90 mt-1">
                  Total requests assigned to you (Click to view)
                </p>
              </CardContent>
            </Card>

              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Assignment Completion</CardTitle>
                  <Target className="h-4 w-4 opacity-90" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardData.assigneeMetrics.assigneeCompletionRate}%</div>
                  <p className="text-xs opacity-90 mt-1">
                    Completion rate as assignee
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                onClick={() => handleTileClick('implemented')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Implemented by Me</CardTitle>
                  <TrendingUp className="h-4 w-4 opacity-90" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardData.assigneeMetrics.implementedByAssignee}</div>
                  <p className="text-xs opacity-90 mt-1">
                    Successfully implemented requests (Click to view)
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution Pie Chart - Non-Admin Only */}
          {!isAdmin && assignedRequestsStatusData.length > 0 && (
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Assigned Requests Status
                </CardTitle>
                <CardDescription>
                  Status breakdown of requests assigned to you (Click slices to view details)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-hidden rounded-lg">
                  {/* Animated Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30 animate-pulse"></div>
                  
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <defs>
                        {assignedRequestsStatusData.map((entry, index) => (
                          <filter key={`glow-${index}`} id={`glow-${index}`}>
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge> 
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        ))}
                      </defs>
                      <Pie
                        data={assignedRequestsStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percent, index }) => {
                          const isHovered = hoveredSlice === index;
                          return `${status} ${(percent * 100).toFixed(0)}%`;
                        }}
                        outerRadius={hoveredSlice !== null ? 95 : 85}
                        innerRadius={15}
                        fill="#8884d8"
                        dataKey="count"
                        onClick={handleStatusPieClick}
                        onMouseEnter={(data, index) => setHoveredSlice(index)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease-in-out',
                          filter: hoveredSlice !== null ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))' : 'none'
                        }}
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {assignedRequestsStatusData.map((entry, index) => {
                          const isHovered = hoveredSlice === index;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color}
                              stroke={isHovered ? '#ffffff' : 'transparent'}
                              strokeWidth={isHovered ? 3 : 0}
                              style={{ 
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                                transformOrigin: 'center',
                                filter: isHovered ? `url(#glow-${index}) brightness(1.1) saturate(1.2)` : 'none'
                              }}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                          border: 'none', 
                          borderRadius: '12px', 
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                          padding: '12px 16px',
                          fontSize: '14px',
                          fontWeight: '500',
                          backdropFilter: 'blur(8px)'
                        }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-white/20">
                                <div className="flex items-center gap-2 mb-1">
                                  <div 
                                    className="w-3 h-3 rounded-full animate-pulse" 
                                    style={{ backgroundColor: data.color }}
                                  ></div>
                                  <span className="font-semibold text-gray-800">{data.status}</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium text-lg text-gray-900">{data.count}</span> requests
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Click to view details
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Decorative Elements */}
                  <div className="absolute top-4 right-4 opacity-20">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 animate-bounce"></div>
                  </div>
                  <div className="absolute bottom-4 left-4 opacity-20">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-500 animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* For Admin: Show Tool Trends and Status Distribution */}
          {isAdmin ? (
            <>
              {/* Tool Trends */}
              {dashboardData.toolTrends.length > 0 && (
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Tool Usage & Resolution Time
                    </CardTitle>
                    <CardDescription>
                      Most requested tools and their average resolution time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dashboardData.toolTrends}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="tool" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          fontSize={12}
                        />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: 'none', 
                            borderRadius: '8px', 
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' 
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Request Count" />
                        <Bar yAxisId="right" dataKey="avgResolutionDays" fill="#82ca9d" name="Avg Resolution (days)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Status Distribution */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Request Status Distribution
                  </CardTitle>
                  <CardDescription>
                    Current status breakdown of all requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dashboardData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {dashboardData.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: 'none', 
                          borderRadius: '8px', 
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' 
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            /* For Users: Show Service Offering Requests Chart - Always show for debugging */
            (dashboardData.serviceOfferingStats.length > 0 || true) && (
              <Card className="shadow-lg border-0 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Assigned Requests by Service Offering
                  </CardTitle>
                  <CardDescription>
                    Number of requests assigned to you for each service offering
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData.serviceOfferingStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dashboardData.serviceOfferingStats}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          fontSize={12}
                        />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: 'none', 
                            borderRadius: '8px', 
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' 
                          }}
                        />
                         <Bar 
                           dataKey="count" 
                           name="Number of Requests"
                           radius={[4, 4, 0, 0]}
                         >
                           {dashboardData.serviceOfferingStats.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                         </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No assigned requests data available</p>
                        <p className="text-sm">You need to have requests assigned to you to see service offering statistics</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Monthly Trends - Admin Only */}
        {isAdmin && dashboardData.monthlyTrends.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Request Volume Trends
              </CardTitle>
              <CardDescription>
                Monthly request submission and completion trends over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={dashboardData.monthlyTrends}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' 
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#8884d8" 
                    fillOpacity={1} 
                    fill="url(#colorRequests)" 
                    name="Requests"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completions" 
                    stroke="#82ca9d" 
                    fillOpacity={1} 
                    fill="url(#colorCompletions)" 
                    name="Completions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Consultant Performance - Admin Only */}
        {isAdmin && dashboardData.consultantPerformance.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-600" />
                Consultant Performance Metrics
              </CardTitle>
              <CardDescription>
                Individual consultant performance and workload distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.consultantPerformance.map((consultant, index) => (
                  <div 
                    key={consultant.name}
                    className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-indigo-900">{consultant.name}</h4>
                      <Badge 
                        variant="outline" 
                        className="bg-white border-indigo-200 text-indigo-700"
                      >
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Completed:</span>
                        <span className="font-medium text-green-600">{consultant.completedRequests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Resolution:</span>
                        <span className="font-medium text-blue-600">{consultant.avgResolutionTime} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active:</span>
                        <span className="font-medium text-orange-600">{consultant.activeRequests}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Actions - Non-Admin Only */}
        {!isAdmin && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                {isStakeholder ? 'Stakeholder Actions' : 'Quick Actions'}
              </CardTitle>
              <CardDescription>
                {isStakeholder 
                  ? 'Essential actions for project stakeholders'
                  : 'Common actions and navigation'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => navigate('/')}
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  variant={isStakeholder ? "default" : "outline"}
                >
                  <Home className="h-6 w-6" />
                  <span>{isStakeholder ? 'Request Advisory Service' : 'New Request'}</span>
                </Button>
                <Button 
                  onClick={() => navigate('/my-requests')}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>{isStakeholder ? 'Track Projects' : 'My Requests'}</span>
                </Button>
                <Button 
                  onClick={() => navigate('/information-hub')}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                >
                  <Users className="h-6 w-6" />
                  <span>{isStakeholder ? 'Knowledge Center' : 'Information Hub'}</span>
                </Button>
              </div>
              {isStakeholder && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Stakeholder Resources</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Request status tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Advisory service portfolio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Project insights & analytics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Knowledge base access</span>
                    </div>
                   </div>
                 </div>
               )}
             </CardContent>
           </Card>
         )}
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-6 animate-fade-in">
            {/* Decorative Header for Insights */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl p-1 border border-white/30">
                <div className="text-center py-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                    Analytics & Insights
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Comprehensive performance analytics and trends</p>
                </div>
              </div>
            </div>
            <InsightsSection />
          </TabsContent>
        </Tabs>
      </div>

      {/* Request Details Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              {dialogTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-lg">Loading requests...</div>
              </div>
            ) : dialogRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No requests found.</p>
              </div>
            ) : (
              <>
                {/* Request Cards */}
                <div className="space-y-4">
                  {getPaginatedRequests().map((request) => (
                    <Card key={request.id} className="border border-border hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant={getStatusVariant(request.status)}>
                              {request.status}
                            </Badge>
                            <span className="font-semibold text-primary">#{request.request_id}</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigateToRequest(request)}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-muted-foreground">Requested by:</span>
                              <p className="font-medium">{getRequestorDisplayName(request.requestor_profile, request.requestor_id)}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Submitted:</span>
                              <p className="font-medium">{formatDate(request.submission_date)}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-muted-foreground">Last Updated:</span>
                              <p className="font-medium">{formatDate(request.updated_at)}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Advisory Services:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {request.advisory_services?.map((service: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {advisoryServicesMap[service] || service}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {request.description && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <span className="text-sm text-muted-foreground">Description:</span>
                            <p className="text-sm mt-1 line-clamp-2">{request.description}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * 5 + 1} to {Math.min(currentPage * 5, dialogRequests.length)} of {dialogRequests.length} requests
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm font-medium px-3 py-1 bg-primary/10 rounded">
                        {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Pie Chart Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              {selectedStatus} Requests ({statusDialogRequests.length})
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading requests...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {getPaginatedStatusRequests().map((request) => (
                    <Card key={request.id} className="border border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">Request #{request.id.slice(0, 8)}</h4>
                            <Badge variant={getStatusVariant(request.status)} className="mt-1">
                              {request.status}
                            </Badge>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setShowStatusDialog(false);
                              navigate(`/my-items?requestId=${request.id}`);
                            }}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View
                          </Button>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-muted-foreground">Requested by:</span>
                              <p className="font-medium">{getRequestorDisplayName(request.requestor_profile, request.requestor_id)}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Submitted:</span>
                              <p className="font-medium">{formatDate(request.submission_date)}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-muted-foreground">Last Updated:</span>
                              <p className="font-medium">{formatDate(request.updated_at)}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Service Offerings:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(request.service_specific_data?.selectedServiceOfferings || 
                                  request.service_specific_data?.selectedOfferings || 
                                  request.advisory_services || []
                                ).map((service: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {getServiceOfferingDisplayName(service, serviceOfferingsMap, advisoryServicesMap)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {request.description && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <span className="text-sm text-muted-foreground">Description:</span>
                            <p className="text-sm mt-1 line-clamp-2">{request.description}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Status Dialog Pagination */}
                {statusTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      Showing {(statusCurrentPage - 1) * 5 + 1} to {Math.min(statusCurrentPage * 5, statusDialogRequests.length)} of {statusDialogRequests.length} requests
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatusCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={statusCurrentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm font-medium px-3 py-1 bg-primary/10 rounded">
                        {statusCurrentPage} of {statusTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatusCurrentPage(prev => Math.min(prev + 1, statusTotalPages))}
                        disabled={statusCurrentPage === statusTotalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};