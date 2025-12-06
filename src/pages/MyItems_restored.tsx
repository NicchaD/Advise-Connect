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
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);
      // Add your user access logic here
      setLoading(false);
    } catch (error) {
      console.error('Error checking user access:', error);
      navigate('/login');
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
              <CardTitle>Action Required Items</CardTitle>
              <CardDescription>Items that need your immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              {actionRequiredRequests.length === 0 ? (
                <p className="text-muted-foreground">No action required items at this time.</p>
              ) : (
                <div className="space-y-4">
                  {/* Add your request items here */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Items</CardTitle>
              <CardDescription>Items currently assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              {allAssignedRequests.length === 0 ? (
                <p className="text-muted-foreground">No assigned items at this time.</p>
              ) : (
                <div className="space-y-4">
                  {/* Add your request items here */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Queue</CardTitle>
              <CardDescription>Items in your queue</CardDescription>
            </CardHeader>
            <CardContent>
              {myQueueRequests.length === 0 ? (
                <p className="text-muted-foreground">No items in your queue.</p>
              ) : (
                <div className="space-y-4">
                  {/* Add your request items here */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Items</CardTitle>
              <CardDescription>Items you have completed</CardDescription>
            </CardHeader>
            <CardContent>
              {completedRequests.length === 0 ? (
                <p className="text-muted-foreground">No completed items.</p>
              ) : (
                <div className="space-y-4">
                  {/* Add your request items here */}
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
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <p>Request ID: {selectedRequest.request_id}</p>
              <p>Status: {selectedRequest.status}</p>
              <p>Description: {selectedRequest.description}</p>
              {/* Add more request details here */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
