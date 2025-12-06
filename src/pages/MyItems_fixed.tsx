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

// Continue with the rest of the file structure...
// This is a placeholder to show the approach for fixing the file
