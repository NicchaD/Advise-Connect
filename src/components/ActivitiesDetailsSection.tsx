/**
 * ActivitiesDetailsSection.tsx - Reusable Activities Details Component
 * 
 * OVERVIEW:
 * A reusable component that displays completed vs pending work breakdown from timesheet data.
 * This component was extracted from MyRequests.tsx to eliminate code duplication across
 * MyRequests, MyItems, and other components that need to show activity progress.
 * 
 * FEATURES:
 * 1. Activity Progress Visualization - Shows completed vs pending work
 * 2. Database Integration - Fetches human-readable activity names
 * 3. Statistical Summary - Provides progress statistics and counts
 * 4. Collapsible Interface - Can be expanded/collapsed for better UX
 * 5. Responsive Design - Adapts to different screen sizes
 * 6. Empty State Handling - Graceful handling when no data is available
 * 
 * USAGE:
 * ```tsx
 * <ActivitiesDetailsSection
 *   timesheetData={selectedRequest.timesheet_data}
 *   requestId={selectedRequest.id}
 *   isCollapsible={true}
 *   isExpanded={isExpanded}
 *   onToggle={() => setIsExpanded(!isExpanded)}
 * />
 * ```
 * 
 * DATA PROCESSING:
 * 1. Extracts sub-activity IDs from timesheet data structure
 * 2. Fetches human-readable names from database
 * 3. Groups activities by completion status
 * 4. Calculates progress statistics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { ActivitiesDetailsSectionProps } from '@/types/shared';

/**
 * ActivitiesDetailsSection Component
 * 
 * RESPONSIBILITIES:
 * 1. Process timesheet data to extract activity information
 * 2. Fetch human-readable activity names from database
 * 3. Categorize activities as completed or pending
 * 4. Display visual progress indicators and statistics
 * 5. Provide collapsible interface for space management
 * 6. Handle empty states gracefully
 * 
 * DATA STRUCTURE:
 * Input timesheet data format:
 * {
 *   "day1": {
 *     "subActivityId1-day0-part1": true,   // Completed
 *     "subActivityId2-day0-part2": false,  // Pending
 *   },
 *   "day2": { ... }
 * }
 * 
 * Output: Processed activity groups with statistics
 */
export const ActivitiesDetailsSection: React.FC<ActivitiesDetailsSectionProps> = ({
  timesheetData,
  requestId,
  isCollapsible = true,
  isExpanded = false,
  onToggle,
  className,
  variant = 'default'
}) => {
  const [subActivityNames, setSubActivityNames] = useState<Record<string, string>>({});

  /**
   * Extract Unique Sub-Activity IDs
   * 
   * Processes the timesheet data structure to extract all unique sub-activity IDs.
   * The timesheet data contains keys in format: "subActivityId-day0-part1"
   * This function extracts just the subActivityId portion.
   */
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

  /**
   * Fetch Sub-Activity Names
   * 
   * Retrieves human-readable names for sub-activities from the database.
   * This replaces technical IDs with user-friendly names for better UX.
   */
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

  /**
   * Process Timesheet Data
   * 
   * Processes the raw timesheet data to categorize activities and calculate statistics.
   * Groups activities by completion status and provides summary metrics.
   */
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
            
            // Create activity information object
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
    
    // Group activities by name to avoid duplication
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

  // Variant-specific styling
  const getContainerClasses = () => {
    const baseClasses = "rounded-lg p-6 shadow-lg";
    
    switch (variant) {
      case 'compact':
        return cn(baseClasses, "bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-300 p-4");
      default:
        return cn(baseClasses, "bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300");
    }
  };

  const HeaderContent = () => (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between text-left hover:bg-purple-100 rounded-lg p-2 transition-colors"
    >
      <div className="flex items-center gap-3">
        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-purple-700">Activities Details</h3>
        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-600 border-purple-300">
          {isExpanded ? 'Expanded' : 'Collapsed'}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-purple-500">
          {isExpanded ? 'Click to collapse' : 'Click to expand activities'}
        </span>
        <svg 
          className={`h-5 w-5 text-purple-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>
  );

  const ContentSection = () => (
    <div className="space-y-4">
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
  );

  return (
    <div className="space-y-4">
      <div className={cn(getContainerClasses(), className, "p-4 shadow-sm")}>
        {isCollapsible ? (
          <>
            <HeaderContent />
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-purple-200 animate-in slide-in-from-top-2 duration-300">
                <ContentSection />
              </div>
            )}
          </>
        ) : (
          <>
            <HeaderContent />
            <div className="mt-4">
              <ContentSection />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
