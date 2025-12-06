import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Clock } from "lucide-react";

interface TimesheetSectionProps {
  requestId: string;
  selectedActivities: any;
  timesheetData: any;
  isReadOnly?: boolean;
  billabilityPercentage?: number;
  onTimesheetUpdate: (data: any) => void;
}

interface SubActivity {
  id: string;
  name: string;
  estimated_hours: number;
  completed?: boolean;
}

interface DayActivity {
  subActivityId: string;
  subActivityName: string;
  hours: number;
  isPartial?: boolean;
  partNumber?: number;
  totalParts?: number;
  uniqueKey?: string; // Unique identifier for this specific day entry
}

export const TimesheetSection: React.FC<TimesheetSectionProps> = ({
  requestId,
  selectedActivities,
  timesheetData,
  isReadOnly = false,
  billabilityPercentage = 100,
  onTimesheetUpdate,
}) => {
  const [completedActivities, setCompletedActivities] = useState<Record<string, boolean>>({});
  const [dayActivities, setDayActivities] = useState<DayActivity[][]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [subActivitiesList, setSubActivitiesList] = useState<SubActivity[]>([]);

  // Load sub-activities data and initialize completion status
  useEffect(() => {
    const loadSubActivities = async () => {
      // Handle both single-service and multi-service activity structures
      let selectedSubActivityIds: string[] = [];
      
      // Check for multi-service structure (service_offering_activities)
      if (selectedActivities && Array.isArray(selectedActivities)) {
        selectedActivities.forEach((serviceActivity: any) => {
          if (serviceActivity.subActivities) {
            Object.keys(serviceActivity.subActivities).forEach(id => {
              if (serviceActivity.subActivities[id]?.selected) {
                selectedSubActivityIds.push(id);
              }
            });
          }
        });
      }
      // Check for single-service structure (selected_activities)
      else if (selectedActivities?.subActivities) {
        selectedSubActivityIds = Object.keys(selectedActivities.subActivities).filter(
          id => selectedActivities.subActivities[id]?.selected
        );
      }

      if (selectedSubActivityIds.length === 0) return;

      try {
        const { data: subActivities, error } = await supabase
          .from('sub_activities')
          .select('id, name, estimated_hours')
          .in('id', selectedSubActivityIds);

        if (error) throw error;

        setSubActivitiesList(subActivities || []);

        // We'll initialize completion status after day activities are distributed
        // This is now handled in the distributeDays function
      } catch (error) {
        console.error('Error loading sub-activities:', error);
        toast.error('Failed to load sub-activities');
      }
    };

    loadSubActivities();
  }, [selectedActivities, timesheetData]);

  // Initialize day activities and completion status when subActivitiesList changes
  useEffect(() => {
    if (subActivitiesList.length > 0) {
      const distributedDays = distributeDays();
      setDayActivities(distributedDays);

      // Initialize completion status from timesheet data
      const initialCompletion: Record<string, boolean> = {};
      distributedDays.flat().forEach(activity => {
        if (activity.uniqueKey) {
          // Check if this specific day entry was completed (fallback to old sub-activity ID for backward compatibility)
          initialCompletion[activity.uniqueKey] = 
            timesheetData?.completed?.[activity.uniqueKey] || 
            timesheetData?.completed?.[activity.subActivityId] || 
            false;
        }
      });
      setCompletedActivities(initialCompletion);
    }
  }, [subActivitiesList, billabilityPercentage, timesheetData]);

  const handleActivityToggle = (uniqueKey: string, completed: boolean) => {
    if (isReadOnly) return;
    
    setCompletedActivities(prev => ({
      ...prev,
      [uniqueKey]: completed
    }));
  };

  const handleSaveTimesheet = async () => {
    if (isReadOnly) return;
    
    setIsSaving(true);
    try {
      const timesheetUpdate = {
        completed: completedActivities,
        lastUpdated: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('requests')
        .update({ timesheet_data: timesheetUpdate })
        .eq('id', requestId);

      if (error) throw error;

      onTimesheetUpdate(timesheetUpdate);
      toast.success('Timesheet saved successfully');
    } catch (error) {
      console.error('Error saving timesheet:', error);
      toast.error('Failed to save timesheet');
    } finally {
      setIsSaving(false);
    }
  };

  const getCompletionStats = () => {
    const totalEntries = dayActivities.flat().length;
    const completedEntries = Object.values(completedActivities).filter(Boolean).length;
    return { completed: completedEntries, total: totalEntries };
  };

  const getTotalHours = () => {
    return subActivitiesList.reduce((total, subActivity) => {
      return total + (subActivity.estimated_hours || 0);
    }, 0);
  };

  const getCompletedHours = () => {
    return dayActivities.flat().reduce((total, activity) => {
      if (completedActivities[activity.uniqueKey || '']) {
        return total + activity.hours;
      }
      return total;
    }, 0);
  };

  // Function to distribute activities across days based on billability percentage
  const distributeDays = () => {
    if (subActivitiesList.length === 0) return [];

    const days: DayActivity[][] = [];
    let currentDay: DayActivity[] = [];
    let currentDayHours = 0;
    const DAILY_WORK_HOURS = 8;
    const DAILY_LIMIT = (DAILY_WORK_HOURS * billabilityPercentage) / 100;

    // Sort activities by estimated hours for better distribution
    const sortedActivities = [...subActivitiesList].sort((a, b) => a.estimated_hours - b.estimated_hours);

    sortedActivities.forEach(subActivity => {
      let remainingHours = subActivity.estimated_hours;
      let partNumber = 1;
      const totalParts = Math.ceil(subActivity.estimated_hours / DAILY_LIMIT);

      while (remainingHours > 0) {
        const hoursToAdd = Math.min(remainingHours, DAILY_LIMIT - currentDayHours);
        
        if (hoursToAdd > 0) {
          // Generate unique key for this specific day entry
          const uniqueKey = `${subActivity.id}-day${days.length}-part${partNumber}`;
          
          // Add to current day
          const activity: DayActivity = {
            subActivityId: subActivity.id,
            subActivityName: subActivity.name,
            hours: hoursToAdd,
            isPartial: totalParts > 1,
            partNumber: totalParts > 1 ? partNumber : undefined,
            totalParts: totalParts > 1 ? totalParts : undefined,
            uniqueKey: uniqueKey,
          };
          
          currentDay.push(activity);
          currentDayHours += hoursToAdd;
          remainingHours -= hoursToAdd;
          
          if (remainingHours > 0) {
            partNumber++;
          }
        }

        // If current day is full or no more hours can be added, start a new day
        if (currentDayHours >= DAILY_LIMIT || (remainingHours > 0 && hoursToAdd === 0)) {
          days.push([...currentDay]);
          currentDay = [];
          currentDayHours = 0;
        }
      }
    });

    // Add the last day if it has activities
    if (currentDay.length > 0) {
      days.push(currentDay);
    }

    return days;
  };

  if (subActivitiesList.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="h-5 w-5" />
            Timesheet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No sub-activities found for this request.</p>
        </CardContent>
      </Card>
    );
  }

  const { completed, total } = getCompletionStats();
  const totalHours = getTotalHours();
  const completedHours = getCompletedHours();

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Clock className="h-5 w-5" />
          Timesheet {isReadOnly && "(Read-only)"}
        </CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Progress: {completed}/{total} activities</span>
          <span>Hours: {completedHours}/{totalHours}h</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>

        {/* Day-wise Activity Distribution */}
        <div className="space-y-6">
          {dayActivities.map((dayActivitiesList, dayIndex) => {
            const dayTotalHours = dayActivitiesList.reduce((sum, activity) => sum + activity.hours, 0);
            const DAILY_LIMIT = (8 * billabilityPercentage) / 100;
            
            return (
              <div key={dayIndex} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-primary/10 px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">
                      Day {dayIndex + 1}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{dayTotalHours}h / {DAILY_LIMIT}h ({billabilityPercentage}% of 8h)</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  {dayActivitiesList.map((activity, activityIndex) => (
                    <div 
                      key={activity.uniqueKey || `${activity.subActivityId}-${activityIndex}`}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={completedActivities[activity.uniqueKey || ''] || false}
                          disabled={isReadOnly}
                          onCheckedChange={(checked) => 
                            handleActivityToggle(activity.uniqueKey || '', checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {activity.subActivityName}
                            </p>
                            {activity.isPartial && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                                Part {activity.partNumber}/{activity.totalParts}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {activity.hours}h for this day
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary">
                          {activity.hours}h
                        </span>
                        {completedActivities[activity.uniqueKey || ''] && (
                          <div className="text-sm text-green-600 font-medium">
                            ✓
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Button - Only show if not read-only */}
        {!isReadOnly && (
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSaveTimesheet}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Timesheet'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};