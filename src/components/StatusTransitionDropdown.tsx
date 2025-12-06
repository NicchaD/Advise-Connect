import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StatusTransitionDropdownProps {
  currentStatus: string;
  requestId: string;
  userRole: string;
  userTitle?: string;
  isAssignee: boolean;
  isAdmin: boolean;
  onStatusChange: (newStatus?: string) => void;
  allocationPercentage?: string;
  billabilityPercentage?: number;
}

interface Transition {
  to_status: string;
  role_required: string;
}

export const StatusTransitionDropdown = ({
  currentStatus,
  requestId,
  userRole,
  userTitle,
  isAssignee,
  isAdmin,
  onStatusChange,
  allocationPercentage,
  billabilityPercentage,
}: StatusTransitionDropdownProps) => {
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [showAllocationAlert, setShowAllocationAlert] = useState(false);
  const [showBillabilityAlert, setShowBillabilityAlert] = useState(false);

  useEffect(() => {
    fetchAvailableTransitions();
  }, [currentStatus]);

  const fetchAvailableTransitions = async () => {
    try {
      const { data, error } = await supabase
        .from('status_transitions')
        .select('to_status, role_required')
        .eq('from_status', currentStatus);

      if (error) throw error;
      setTransitions(data || []);
    } catch (error) {
      console.error('Error fetching transitions:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validation: Check if billability percentage is filled when changing from "Review" to "Approval"
      if (currentStatus === 'Review' && newStatus === 'Approval') {
        if (billabilityPercentage === null || billabilityPercentage === undefined || billabilityPercentage <= 0) {
          setShowBillabilityAlert(true);
          setLoading(false);
          return;
        }
      }

      // Validation: Check if activities are selected when changing from "Estimation" to "Review"
      if (currentStatus === 'Estimation' && newStatus === 'Review') {
        const { data: requestData, error: requestError } = await supabase
          .from('requests')
          .select('selected_activities, service_offering_activities')
          .eq('id', requestId)
          .single();

        if (requestError) {
          throw new Error('Failed to fetch request data');
        }

        // Check if activities are selected in either selected_activities or service_offering_activities
        const selectedActivities = requestData?.selected_activities as any || {};
        const serviceOfferingActivities = requestData?.service_offering_activities as any || {};
        
        let hasSelectedActivities = false;
        
        // Check selected_activities field
        if (selectedActivities.activities !== undefined || selectedActivities.subActivities !== undefined) {
          const hasMainActivities = selectedActivities.activities && 
            Object.values(selectedActivities.activities).some((activity: any) => activity?.selected);
          const hasSubActivities = selectedActivities.subActivities && 
            Object.values(selectedActivities.subActivities).some((subActivity: any) => subActivity?.selected);
          hasSelectedActivities = hasMainActivities || hasSubActivities;
        } else {
          // Handle old format for backwards compatibility
          hasSelectedActivities = Object.keys(selectedActivities).some(activityId => {
            const activity = selectedActivities[activityId];
            return activity?.selected || 
                   (activity?.subActivities && Object.values(activity.subActivities).some((sub: any) => sub === true));
          });
        }
        
        // If not found in selected_activities, check service_offering_activities
        if (!hasSelectedActivities && serviceOfferingActivities) {
          hasSelectedActivities = Object.values(serviceOfferingActivities).some((offering: any) => {
            if (offering?.activities) {
              const hasOfferingActivities = Object.values(offering.activities).some((activity: any) => activity?.selected);
              const hasOfferingSubActivities = Object.values(offering.activities).some((activity: any) => 
                activity?.subActivities && Object.values(activity.subActivities).some((sub: any) => sub?.selected)
              );
              return hasOfferingActivities || hasOfferingSubActivities;
            }
            return false;
          });
        }

        if (!hasSelectedActivities) {
          setShowValidationAlert(true);
          setLoading(false);
          return;
        }
      }

      // Freeze estimation data when transitioning from "Estimation" to "Review"
      if (currentStatus === 'Estimation' && newStatus === 'Review') {
        try {
          // First, get the request data including assignee info
          const { data: requestData, error: requestError } = await supabase
            .from('requests')
            .select(`
              selected_activities,
              service_offering_activities,
              assignee_id
            `)
            .eq('id', requestId)
            .single();

          if (requestError) throw requestError;

          // Get assignee information for rate and role
          const { data: assigneeData, error: assigneeError } = await supabase
            .from('advisory_team_members')
            .select('rate_per_hour, designation, title')
            .eq('user_id', requestData.assignee_id)
            .single();

          if (assigneeError) {
            console.warn('Could not fetch assignee data for estimation freeze:', assigneeError);
          }

          // Calculate totals
          const calculateTotalHours = (selectedActivities: any, serviceOfferingActivities: any) => {
            let totalHours = 0;
            
            if (selectedActivities?.activities) {
              Object.entries(selectedActivities.activities).forEach(([activityId, activity]: [string, any]) => {
                if (activity?.selected && activity?.estimatedHours) {
                  totalHours += parseInt(activity.estimatedHours) || 0;
                }
              });
            }
            
            if (selectedActivities?.subActivities) {
              Object.entries(selectedActivities.subActivities).forEach(([subActivityId, subActivity]: [string, any]) => {
                if (subActivity?.selected && subActivity?.estimatedHours) {
                  totalHours += parseInt(subActivity.estimatedHours) || 0;
                }
              });
            }
            
            if (serviceOfferingActivities) {
              Object.entries(serviceOfferingActivities).forEach(([offeringId, offering]: [string, any]) => {
                if (offering?.activities) {
                  Object.entries(offering.activities).forEach(([activityId, activity]: [string, any]) => {
                    if (activity?.selected && activity?.estimatedHours) {
                      totalHours += parseInt(activity.estimatedHours) || 0;
                    }
                  });
                }
                if (offering?.subActivities) {
                  Object.entries(offering.subActivities).forEach(([subActivityId, subActivity]: [string, any]) => {
                    if (subActivity?.selected && subActivity?.estimatedHours) {
                      totalHours += parseInt(subActivity.estimatedHours) || 0;
                    }
                  });
                }
              });
            }
            
            return totalHours;
          };

          const totalHours = calculateTotalHours(requestData.selected_activities, requestData.service_offering_activities);
          const totalPDEstimate = Math.ceil(totalHours / 8);
          const totalCost = totalHours * (assigneeData?.rate_per_hour || 0);
          const currentAssigneeRole = assigneeData?.designation || assigneeData?.title || 'Not assigned';

          // Save frozen estimation data
          await supabase
            .from('requests')
            .update({
              saved_total_hours: totalHours,
              saved_total_cost: totalCost,
              saved_total_pd_estimate: totalPDEstimate,
              saved_assignee_rate: assigneeData?.rate_per_hour || 0,
              saved_assignee_role: currentAssigneeRole,
              estimation_saved_at: new Date().toISOString()
            })
            .eq('id', requestId);

        } catch (estimationError) {
          console.error('Error freezing estimation data:', estimationError);
          // Continue with status transition even if estimation freeze fails
        }
      }

      const { data, error } = await supabase.rpc('update_request_status_and_assignee', {
        p_request_id: requestId,
        new_status: newStatus,
        performed_by: user.id,
      });

      if (error) throw error;

      // Check if the function returned an error due to no consultants available
      if (data && typeof data === 'object' && 'success' in data && !data.success && 'error' in data) {
        toast.error(data.error as string);
        return;
      }

      // Check if the request was reassigned to another user
      if (data && typeof data === 'object' && 'reassigned' in data && data.reassigned) {
        toast.success('Status successfully updated. Request Reassigned');
      } else {
        toast.success(`Status updated to ${newStatus}`);
      }
      
      onStatusChange(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const canTransition = (transition: Transition) => {
    if (isAdmin) return true;
    
    // Special case for "Approval" status: only the assignee can make transitions
    if (currentStatus === 'Approval') {
      if (!isAssignee) return false;
      // Only allow advisory team members to transition from Approval
      return userTitle === 'Advisory Consultant' || 
             userTitle === 'Advisory Service Lead' || 
             userTitle === 'Advisory Service Head';
    }
    
    if (!isAssignee) return false;
    
    // Check if user role/title matches required role for transition
    if (transition.role_required === 'Requestor') {
      return userRole === 'Standard User' || userRole === 'Requestor';
    }
    
    // Check both role and title for advisory team roles
    return userRole === transition.role_required || userTitle === transition.role_required;
  };

  const availableTransitions = transitions.filter(canTransition);

  // Show disabled button if user is not assignee and not admin
  if (!isAssignee && !isAdmin) {
    return (
      <Button variant="outline" disabled className="min-w-[120px]">
        {currentStatus}
      </Button>
    );
  }

  // Show disabled button if no transitions available but still show the current status
  if (availableTransitions.length === 0) {
    return (
      <Button variant="outline" disabled className="min-w-[120px]">
        {currentStatus}
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={loading} className="min-w-[120px]">
            {currentStatus}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {availableTransitions.map((transition) => (
            <DropdownMenuItem
              key={transition.to_status}
              onClick={() => handleStatusChange(transition.to_status)}
              disabled={loading}
            >
              {transition.to_status}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showValidationAlert} onOpenChange={setShowValidationAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Activities Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Please select relevant activities for estimation before proceeding to Review status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowValidationAlert(false)}>
            Understood
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAllocationAlert} onOpenChange={setShowAllocationAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Allocation Percentage Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Please fill the Allocation Percentage field before proceeding to Approved status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowAllocationAlert(false)}>
            Understood
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBillabilityAlert} onOpenChange={setShowBillabilityAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Billability Percentage Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Please fill the Billability Percentage field before proceeding to Approval status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowBillabilityAlert(false)}>
            Understood
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};