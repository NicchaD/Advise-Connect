import React, { useState, useEffect } from 'react';
import { getUserDisplayName } from '@/lib/userUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  User, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TimelineEntry {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_at: string;
  performed_by: string;
  performed_by_name: string | null;
}

interface RequestTimelineProps {
  requestId: string;
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

const getActionIcon = (action: string) => {
  if (action.includes('Status')) {
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  } else if (action.includes('Reassigned') || action.includes('Assignee')) {
    return <UserCheck className="h-4 w-4 text-blue-600" />;
  }
  return <FileText className="h-4 w-4 text-gray-600" />;
};

const formatValue = (action: string, value: string | null): string => {
  if (!value) return 'Unassigned';
  
  if (action.includes('Assignee') || action.includes('Reassigned')) {
    // For assignee changes, we'll show the user ID for now
    // You could enhance this by fetching user names
    return value;
  }
  
  return value;
};

export default function RequestTimeline({ requestId }: RequestTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [consultantNames, setConsultantNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTimeline();
    fetchConsultantNames();
  }, [requestId]);

  const fetchConsultantNames = async () => {
    try {
      // Note: We can't get user_id from basic view for security
      // Instead, we'll build names map from request history where we have the data
      const { data: historyData, error: historyError } = await supabase
        .from('request_history')
        .select('old_value, new_value')
        .eq('action', 'Reassigned')
        .eq('request_id', requestId);

      if (historyError) throw historyError;

      const namesMap: Record<string, string> = {};
      // We'll rely on the names already stored in requests table
      // This is a limitation of the security restrictions
      setConsultantNames(namesMap);
    } catch (error) {
      console.error('Error fetching consultant names:', error);
    }
  };

  const fetchTimeline = async () => {
    try {
      // First get the timeline entries
      const { data: historyData, error: historyError } = await supabase
        .from('request_history')
        .select('*')
        .eq('request_id', requestId)
        .order('performed_at', { ascending: true });

      if (historyError) throw historyError;

      // Then get the usernames for the performed_by users using our utility
      const userIds = [...new Set(historyData?.map(entry => entry.performed_by) || [])];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, email')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const usernameMap: Record<string, string> = {};
      profilesData?.forEach(profile => {
        usernameMap[profile.user_id] = getUserDisplayName(profile);
      });

      const timelineData = historyData?.map(entry => ({
        ...entry,
        performed_by_name: usernameMap[entry.performed_by] || getUserDisplayName({ 
          user_id: entry.performed_by, 
          username: '', 
          email: '' 
        })
      })) || [];

      setTimeline(timelineData);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssigneeName = (userId: string): string => {
    return consultantNames[userId] || 'Unknown Consultant';
  };

  const renderTimelineEntry = (entry: TimelineEntry, index: number) => {
    const isStatusChange = entry.action.includes('Status');
    const isAssigneeChange = entry.action.includes('Reassigned') || entry.action.includes('Assignee');

    return (
      <div key={entry.id} className="flex items-start gap-4">
        {/* Timeline indicator */}
        <div className="flex flex-col items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-200">
            {getActionIcon(entry.action)}
          </div>
          {index < timeline.length - 1 && (
            <div className="h-12 w-0.5 bg-gray-200 mt-2" />
          )}
        </div>

        {/* Timeline content */}
        <div className="flex-1 min-w-0 pb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {entry.action}
            </span>
            <span className="text-xs text-gray-500">
              by {entry.performed_by_name}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Clock className="h-3 w-3" />
            {format(new Date(entry.performed_at), 'PPp')}
          </div>

          {/* Show the change details */}
          {isStatusChange && (
            <div className="flex items-center gap-2">
              {entry.old_value && (
                <Badge className={STATUS_COLORS[entry.old_value as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}>
                  {entry.old_value}
                </Badge>
              )}
              <ChevronRight className="h-3 w-3 text-gray-400" />
              {entry.new_value && (
                <Badge className={STATUS_COLORS[entry.new_value as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}>
                  {entry.new_value}
                </Badge>
              )}
            </div>
          )}

          {isAssigneeChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm">
                From: <span className="font-medium">{entry.old_value ? getAssigneeName(entry.old_value) : 'Unassigned'}</span>
              </span>
              <ChevronRight className="h-3 w-3 text-gray-400" />
              <span className="text-sm">
                To: <span className="font-medium">{entry.new_value ? getAssigneeName(entry.new_value) : 'Unassigned'}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Request Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Loading timeline...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Request Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No timeline history available</p>
          </div>
        ) : (
          <div className="space-y-0">
            {timeline.map((entry, index) => renderTimelineEntry(entry, index))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}