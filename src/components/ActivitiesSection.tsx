import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, CheckSquare, Save, Plus, Check, RefreshCw } from 'lucide-react';
import { getActivitiesForServiceOffering } from '@/data/serviceActivities';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  name: string;
  estimatedHours?: number;
  subActivities: SubActivity[];
  isCustom?: boolean;
}

interface SubActivity {
  id: string;
  name: string;
  estimatedHours?: number;
  isCustom?: boolean;
}

interface SelectedActivities {
  [activityId: string]: {
    selected: boolean;
    subActivities: {
      [subActivityId: string]: boolean;
    };
  };
}

interface ActivitiesSectionProps {
  requestId: string;
  serviceOfferings: string[];
  currentStatus: string;
  readOnly?: boolean;
  onActivitiesChange?: (activities: SelectedActivities) => void;
  onSaveActivities?: () => void;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
  requestId,
  serviceOfferings,
  currentStatus,
  readOnly = false,
  onActivitiesChange,
  onSaveActivities
}) => {
  const [selectedActivities, setSelectedActivities] = useState<SelectedActivities>({});
  const [expandedActivities, setExpandedActivities] = useState<{[key: string]: boolean}>({});
  const [customActivities, setCustomActivities] = useState<Activity[]>([]);
  const [databaseActivities, setDatabaseActivities] = useState<Activity[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [showCreateSubActivity, setShowCreateSubActivity] = useState(false);
  const [selectedActivityForSub, setSelectedActivityForSub] = useState('');
  const [newSubActivityName, setNewSubActivityName] = useState('');
  const [hasSaved, setHasSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load custom activities first, then database activities, then existing selections
    loadCustomActivities();
  }, [requestId]);

  // Load activities from database when component mounts
  const loadDatabaseActivities = async () => {
    try {
      setRefreshing(true);
      console.log('Loading database activities for serviceOfferings:', serviceOfferings);
      
      // Get service offering IDs from the request's service offerings
      let serviceOfferingsData = null;
      let serviceOfferingsError = null;
      
      if (serviceOfferings && serviceOfferings.length > 0) {
        // Check if serviceOfferings contains IDs or names by checking the first item
        const firstItem = serviceOfferings[0];
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstItem);
        
        if (isUUID) {
          // If IDs are passed, use them directly
          serviceOfferingsData = serviceOfferings.map(id => ({ id }));
        } else {
          // If names are passed, look up IDs
          const result = await supabase
            .from('service_offerings')
            .select('id')
            .in('name', serviceOfferings);
          serviceOfferingsData = result.data;
          serviceOfferingsError = result.error;
        }
      }

      console.log('Service offerings data:', serviceOfferingsData, 'Error:', serviceOfferingsError);

      let serviceOfferingIds: string[] = [];
      if (serviceOfferingsData && !serviceOfferingsError) {
        serviceOfferingIds = serviceOfferingsData.map(so => so.id);
      }

      console.log('Service offering IDs:', serviceOfferingIds);

      // Load activities for the specific service offerings or default activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          name,
          estimated_hours,
          service_offering_id,
          sub_activities (
            id,
            name,
            estimated_hours
          )
        `)
        .or(serviceOfferingIds.length > 0 ? `service_offering_id.in.(${serviceOfferingIds.join(',')}),service_offering_id.is.null` : 'service_offering_id.is.null')
        .eq('is_active', true)
        .order('display_order');

      console.log('Activities data:', activitiesData, 'Error:', activitiesError);

      if (activitiesError) {
        console.error('Error loading activities:', activitiesError);
        return;
      }

      // Transform data to match the Activity interface
      const transformedActivities: Activity[] = (activitiesData || []).map(activity => ({
        id: activity.id,
        name: activity.name,
        estimatedHours: activity.estimated_hours,
        subActivities: (activity.sub_activities || []).map(subActivity => ({
          id: subActivity.id,
          name: subActivity.name,
          estimatedHours: subActivity.estimated_hours,
          isCustom: false
        })),
        isCustom: false
      }));

      setDatabaseActivities(transformedActivities);
      
      // Only show success toast when manually refreshing (not on initial load)
      if (refreshing) {
        toast({
          title: "Success",
          description: "Activities refreshed successfully.",
        });
      }
    } catch (error) {
      console.error('Error loading database activities:', error);
      toast({
        title: "Error",
        description: "Failed to refresh activities.",
        variant: "destructive",
      });
      // Fallback to default activities if database fails
      const primaryServiceOffering = serviceOfferings[0];
      const defaultActivities = getActivitiesForServiceOffering(primaryServiceOffering);
      setDatabaseActivities(defaultActivities.map(a => ({ ...a, isCustom: false })));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDatabaseActivities();
  }, [serviceOfferings]);

  // Load existing activities after both database and custom activities are loaded
  useEffect(() => {
    if (databaseActivities.length > 0 && customActivities !== null) {
      loadExistingActivities();
    }
  }, [databaseActivities, customActivities, requestId]);

  const loadExistingActivities = async () => {
    try {
      const { data: request, error } = await supabase
        .from('requests')
        .select('selected_activities')
        .eq('id', requestId)
        .maybeSingle();

      if (error) {
        console.error('Error loading activities:', error);
        return;
      }

      if (request?.selected_activities && typeof request.selected_activities === 'object') {
        console.log('ActivitiesSection - Loading existing activities:', request.selected_activities);
        
        const savedData = request.selected_activities as any;
        
        // Check if data is in new format (with activities and subActivities keys)
        if (savedData.activities || savedData.subActivities) {
          // Transform from saved format back to UI format
          const transformedActivities: SelectedActivities = {};
          
          // Process main activities
          if (savedData.activities) {
            Object.entries(savedData.activities).forEach(([activityId, activityData]: [string, any]) => {
              if (activityData.selected) {
                transformedActivities[activityId] = {
                  selected: true,
                  subActivities: {}
                };
              }
            });
          }
          
          // Process sub-activities
          if (savedData.subActivities) {
            Object.entries(savedData.subActivities).forEach(([subActivityId, subActivityData]: [string, any]) => {
              if (subActivityData.selected) {
                // Find which activity this sub-activity belongs to
                for (const activity of [...databaseActivities, ...customActivities]) {
                  const subActivity = activity.subActivities.find(sa => sa.id === subActivityId);
                  if (subActivity) {
                    if (!transformedActivities[activity.id]) {
                      transformedActivities[activity.id] = { selected: false, subActivities: {} };
                    }
                    transformedActivities[activity.id].subActivities[subActivityId] = true;
                    break;
                  }
                }
              }
            });
          }
          
          setSelectedActivities(transformedActivities);
          onActivitiesChange?.(transformedActivities);
        } else {
          // Data is already in the correct UI format
          setSelectedActivities(savedData as SelectedActivities);
          onActivitiesChange?.(savedData as SelectedActivities);
        }
      } else {
        console.log('ActivitiesSection - No selected activities found for request:', requestId);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const loadCustomActivities = async () => {
    try {
      const { data: request, error } = await supabase
        .from('requests')
        .select('service_specific_data')
        .eq('id', requestId)
        .maybeSingle();

      if (error) {
        console.error('Error loading custom activities:', error);
        return;
      }

      if (request?.service_specific_data && typeof request.service_specific_data === 'object' && 
          'customActivities' in request.service_specific_data && 
          Array.isArray((request.service_specific_data as any).customActivities)) {
        setCustomActivities((request.service_specific_data as any).customActivities);
      }
    } catch (error) {
      console.error('Error loading custom activities:', error);
    }
  };

  // Auto-save function for activities
  const autoSaveActivities = async (activitiesToSave: SelectedActivities) => {
    try {
      console.log('Auto-saving activities:', activitiesToSave);
      
      // Calculate and store activity details with hours
      const activitiesWithHours = {
        activities: {},
        subActivities: {}
      };

      // Process selected activities
      Object.entries(activitiesToSave).forEach(([activityId, activityData]) => {
        if (activityData.selected) {
          const activity = databaseActivities.find(a => a.id === activityId) || 
                          customActivities.find(a => a.id === activityId);
          if (activity) {
            activitiesWithHours.activities[activityId] = {
              selected: true,
              name: activity.name,
              estimated_hours: activity.estimatedHours || 0
            };
          }
        }

        // Process sub-activities
        Object.entries(activityData.subActivities || {}).forEach(([subActivityId, isSelected]) => {
          if (isSelected) {
            // Find sub-activity in database activities
            let subActivity = null;
            for (const activity of databaseActivities) {
              const found = activity.subActivities?.find(sa => sa.id === subActivityId);
              if (found) {
                subActivity = found;
                break;
              }
            }
            
            // Also check custom activities
            if (!subActivity) {
              for (const customActivity of customActivities) {
                const found = customActivity.subActivities?.find(sa => sa.id === subActivityId);
                if (found) {
                  subActivity = found;
                  break;
                }
              }
            }
            
            if (subActivity) {
              activitiesWithHours.subActivities[subActivityId] = {
                selected: true,
                name: subActivity.name,
                estimated_hours: subActivity.estimatedHours || 0
              };
            }
          }
        });
      });

      // Get current service_specific_data
      const { data: currentRequest, error: fetchError } = await supabase
        .from('requests')
        .select('service_specific_data')
        .eq('id', requestId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const updatedServiceData = {
        ...(currentRequest?.service_specific_data as any || {}),
        customActivities: customActivities
      };

      const { error } = await supabase
        .from('requests')
        .update({ 
          selected_activities: activitiesWithHours,
          service_specific_data: updatedServiceData
        })
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      console.log('Activities auto-saved successfully');
    } catch (error) {
      console.error('Error auto-saving activities:', error);
    }
  };

  const saveActivities = async () => {
    setSaving(true);
    try {
      await autoSaveActivities(selectedActivities);
      setHasSaved(true);
      toast({
        title: "Success",
        description: "Activities with hours saved successfully.",
      });
      
      // Call the parent callback to save estimation data
      onSaveActivities?.();
    } catch (error) {
      console.error('Error saving activities:', error);
      toast({
        title: "Error",
        description: "Failed to save activities.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createCustomActivity = async () => {
    console.log('createCustomActivity called with:', newActivityName);
    if (!newActivityName.trim()) {
      console.log('Activity name is empty, returning');
      return;
    }

    const newActivity: Activity = {
      id: `custom-activity-${Date.now()}`,
      name: newActivityName.trim(),
      subActivities: [],
      isCustom: true
    };

    // Add to custom activities
    const updatedCustomActivities = [...customActivities, newActivity];
    setCustomActivities(updatedCustomActivities);

    // Automatically check the new activity
    const newSelectedActivities = { ...selectedActivities };
    newSelectedActivities[newActivity.id] = { selected: true, subActivities: {} };
    setSelectedActivities(newSelectedActivities);
    onActivitiesChange?.(newSelectedActivities);

    // Expand the new activity to show sub-activities section
    setExpandedActivities(prev => ({ ...prev, [newActivity.id]: true }));

    // Reset form
    setNewActivityName('');
    setShowCreateActivity(false);

    // Save to database immediately
    try {
      setSaving(true);
      
      // Get current service_specific_data
      const { data: currentRequest, error: fetchError } = await supabase
        .from('requests')
        .select('service_specific_data')
        .eq('id', requestId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const updatedServiceData = {
        ...(currentRequest?.service_specific_data as any || {}),
        customActivities: updatedCustomActivities
      };

      const { error } = await supabase
        .from('requests')
        .update({ 
          selected_activities: newSelectedActivities,
          service_specific_data: updatedServiceData
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom activity created and saved successfully.",
      });
    } catch (error) {
      console.error('Error saving custom activity:', error);
      toast({
        title: "Error",
        description: "Failed to save custom activity.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createCustomSubActivity = async () => {
    console.log('createCustomSubActivity called with:', { newSubActivityName, selectedActivityForSub });
    if (!newSubActivityName.trim() || !selectedActivityForSub) {
      console.log('Sub-activity name or parent activity missing, returning');
      return;
    }

    const newSubActivity: SubActivity = {
      id: `custom-sub-${Date.now()}`,
      name: newSubActivityName.trim(),
      isCustom: true
    };

    // Update custom activities with the new sub-activity
    const updatedCustomActivities = customActivities.map(activity => 
      activity.id === selectedActivityForSub
        ? { ...activity, subActivities: [...activity.subActivities, newSubActivity] }
        : activity
    );
    setCustomActivities(updatedCustomActivities);

    // Automatically check the new sub-activity
    const newSelectedActivities = { ...selectedActivities };
    if (!newSelectedActivities[selectedActivityForSub]) {
      newSelectedActivities[selectedActivityForSub] = { selected: false, subActivities: {} };
    }
    newSelectedActivities[selectedActivityForSub].subActivities[newSubActivity.id] = true;
    setSelectedActivities(newSelectedActivities);
    onActivitiesChange?.(newSelectedActivities);

    // Reset form
    setNewSubActivityName('');
    setSelectedActivityForSub('');
    setShowCreateSubActivity(false);

    // Save to database immediately
    try {
      setSaving(true);
      
      // Get current service_specific_data
      const { data: currentRequest, error: fetchError } = await supabase
        .from('requests')
        .select('service_specific_data')
        .eq('id', requestId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const updatedServiceData = {
        ...(currentRequest?.service_specific_data as any || {}),
        customActivities: updatedCustomActivities
      };

      const { error } = await supabase
        .from('requests')
        .update({ 
          selected_activities: newSelectedActivities,
          service_specific_data: updatedServiceData
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom sub-activity created and saved successfully.",
      });
    } catch (error) {
      console.error('Error saving custom sub-activity:', error);
      toast({
        title: "Error",
        description: "Failed to save custom sub-activity.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Show activities section for "Estimation" status or when in read-only mode
  console.log('ActivitiesSection - currentStatus:', currentStatus, 'readOnly:', readOnly, 'serviceOfferings:', serviceOfferings);
  console.log('ActivitiesSection - selectedActivities:', selectedActivities);
  console.log('ActivitiesSection - selectedActivities keys:', Object.keys(selectedActivities));
  
  // Show for Estimation status (editable), Review status (read-only), Approval status (read-only), or Approved status (read-only)
  if (currentStatus !== 'Estimation' && currentStatus !== 'Review' && currentStatus !== 'Approval' && currentStatus !== 'Approved') {
    console.log('ActivitiesSection - Not showing: status is not Estimation, Review, Approval, or Approved');
    return null;
  }
  
  // Additional debug to check if we have activities or data
  if (currentStatus === 'Review' && Object.keys(selectedActivities).length === 0) {
    console.log('ActivitiesSection - Review status but no selected activities loaded yet');
  }

  const allActivities = [...databaseActivities, ...customActivities];

  const handleActivityChange = async (activityId: string, checked: boolean) => {
    const newSelectedActivities = { ...selectedActivities };
    
    if (!newSelectedActivities[activityId]) {
      newSelectedActivities[activityId] = { selected: false, subActivities: {} };
    }
    
    newSelectedActivities[activityId].selected = checked;
    
    // If unchecking activity, also uncheck all sub-activities
    if (!checked) {
      newSelectedActivities[activityId].subActivities = {};
      setExpandedActivities(prev => ({ ...prev, [activityId]: false }));
    } else {
      // If checking activity, expand it to show sub-activities
      setExpandedActivities(prev => ({ ...prev, [activityId]: true }));
    }
    
    setSelectedActivities(newSelectedActivities);
    onActivitiesChange?.(newSelectedActivities);
    
    // Auto-save activities in Estimation status
    if (currentStatus === 'Estimation' && !readOnly) {
      await autoSaveActivities(newSelectedActivities);
    }
  };

  const handleSubActivityChange = async (activityId: string, subActivityId: string, checked: boolean) => {
    const newSelectedActivities = { ...selectedActivities };
    
    if (!newSelectedActivities[activityId]) {
      newSelectedActivities[activityId] = { selected: false, subActivities: {} };
    }
    
    newSelectedActivities[activityId].subActivities[subActivityId] = checked;
    
    setSelectedActivities(newSelectedActivities);
    onActivitiesChange?.(newSelectedActivities);
    
    // Auto-save activities in Estimation status
    if (currentStatus === 'Estimation' && !readOnly) {
      await autoSaveActivities(newSelectedActivities);
    }
  };

  const toggleActivityExpansion = (activityId: string) => {
    setExpandedActivities(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }));
  };

  const getSelectedCount = (activityId: string) => {
    const activity = selectedActivities[activityId];
    if (!activity) return 0;
    return Object.values(activity.subActivities).filter(Boolean).length;
  };

  const hasSelectedSubActivities = (activityId: string) => {
    return getSelectedCount(activityId) > 0;
  };

  const getTotalSubActivities = (activityId: string) => {
    const activity = allActivities.find(a => a.id === activityId);
    return activity?.subActivities.length || 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Activities & Sub-activities
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {readOnly ? 'Selected activities and sub-activities for this request' : 'Select the activities and sub-activities required for this estimation'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleFormSubmit}>
          {!readOnly && (
            <div className="flex justify-between items-center">
              <Button 
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  loadDatabaseActivities();
                }}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Activities'}
              </Button>
              <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  saveActivities();
                }}
                disabled={saving || refreshing}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : (hasSaved ? 'Update Status' : 'Save Activities')}
              </Button>
            </div>
          )}
        {allActivities.length === 0 && currentStatus === 'Review' ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-muted-foreground">No activities found for this request.</p>
            <p className="text-xs text-muted-foreground">Activities may not have been selected during the estimation phase.</p>
          </div>
        ) : (
          allActivities.map((activity) => {
            const isSelected = selectedActivities[activity.id]?.selected || false;
            const isExpanded = expandedActivities[activity.id] || false;
            const selectedCount = getSelectedCount(activity.id);
            const totalCount = getTotalSubActivities(activity.id);
            
            // In read-only mode, auto-expand activities that have selected sub-activities
            const shouldShowSubActivities = isSelected && (isExpanded || (readOnly && selectedCount > 0));
            
            // In read-only mode, only show activities that have selected sub-activities
            if (readOnly && !hasSelectedSubActivities(activity.id)) return null;

            return (
              <div key={activity.id} className={`border rounded-lg p-4 space-y-3 ${hasSelectedSubActivities(activity.id) ? 'bg-primary/5 border-primary/30' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center gap-2">
                       <label 
                         className={`text-sm font-medium leading-none cursor-pointer ${hasSelectedSubActivities(activity.id) ? 'text-primary font-semibold' : ''}`}
                       >
                        {activity.name}
                      </label>
                      {activity.estimatedHours && (
                        <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
                          {activity.estimatedHours}h
                        </Badge>
                      )}
                      {activity.isCustom && (
                        <Badge variant="outline" className="ml-1 text-xs">Custom</Badge>
                      )}
                    </div>
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedCount}/{totalCount}
                      </Badge>
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleActivityExpansion(activity.id);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {(isExpanded || (readOnly && selectedCount > 0)) && (
                  <div className="ml-6 space-y-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground font-medium">Sub-activities:</p>
                    <div className="grid gap-2">
                       {activity.subActivities.map((subActivity) => {
                         const isSubSelected = selectedActivities[activity.id]?.subActivities[subActivity.id] || false;
                         const subActivityWithDefault = { ...subActivity, isCustom: subActivity.isCustom || false };
                         
                         // In read-only mode, only show selected sub-activities
                         if (readOnly && !isSubSelected) return null;
                         
                         return (
                           <div key={subActivity.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${activity.id}-${subActivity.id}`}
                                checked={isSubSelected}
                                disabled={readOnly}
                                onCheckedChange={(checked) => {
                                  handleSubActivityChange(activity.id, subActivity.id, !!checked);
                                }}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <label 
                                  htmlFor={`${activity.id}-${subActivity.id}`}
                                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (!readOnly) {
                                      handleSubActivityChange(activity.id, subActivity.id, !isSubSelected);
                                    }
                                  }}
                                >
                                  {subActivity.name}
                                </label>
                                {subActivity.estimatedHours && (
                                  <Badge variant="secondary" className="text-xs bg-gradient-to-r from-secondary to-secondary/80">
                                    {subActivity.estimatedHours}h
                                  </Badge>
                                )}
                                {subActivityWithDefault.isCustom && (
                                  <Badge variant="outline" className="ml-1 text-xs">Custom</Badge>
                                )}
                              </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        
        {/* Show message when no selected activities in read-only mode */}
        {readOnly && allActivities.length > 0 && Object.keys(selectedActivities).length === 0 && (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-muted-foreground">No activities were selected for this request.</p>
            <p className="text-xs text-muted-foreground">Activities should have been selected during the estimation phase.</p>
          </div>
        )}
        
        {/* Show message when activities exist but none are selected in read-only mode */}
        {readOnly && allActivities.length > 0 && Object.keys(selectedActivities).length > 0 && 
         !Object.values(selectedActivities).some(activity => activity.selected) && (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-muted-foreground">No activities are currently selected for review.</p>
            <p className="text-xs text-muted-foreground">Please check if activities were properly saved during estimation.</p>
          </div>
        )}

        {/* Custom Activity Creation Section - Hide in read-only mode */}
        {!readOnly && (
        <div className="border-t pt-4 space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCreateActivity(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Activity
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCreateSubActivity(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Sub Activity
            </Button>
          </div>

          {/* Create Activity Form */}
          {showCreateActivity && (
            <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
              <h4 className="text-sm font-medium">Create New Activity</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter activity name"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createCustomActivity()}
                />
                <Button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    createCustomActivity();
                  }}
                  disabled={!newActivityName.trim()}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Save
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCreateActivity(false);
                    setNewActivityName('');
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Create Sub Activity Form */}
          {showCreateSubActivity && (
            <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
              <h4 className="text-sm font-medium">Create New Sub Activity</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Select Activity</label>
                  <Select value={selectedActivityForSub} onValueChange={setSelectedActivityForSub}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {allActivities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.name}
                          {activity.isCustom && <span className="text-muted-foreground"> (Custom)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedActivityForSub && (
                  <div>
                    <label className="text-sm font-medium">Enter Sub Activity</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter sub activity name"
                        value={newSubActivityName}
                        onChange={(e) => setNewSubActivityName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && createCustomSubActivity()}
                      />
                      <Button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          createCustomSubActivity();
                        }}
                        disabled={!newSubActivityName.trim()}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  </div>
                )}
                
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCreateSubActivity(false);
                    setSelectedActivityForSub('');
                    setNewSubActivityName('');
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
        )}
        </form>
      </CardContent>
    </Card>
  );
};