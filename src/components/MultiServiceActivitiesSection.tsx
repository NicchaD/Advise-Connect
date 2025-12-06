import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, CheckSquare, Save, Plus, Check, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  name: string;
  estimatedHours?: number;
  subActivities: SubActivity[];
  isCustom?: boolean;
  serviceOfferingId?: string;
}

interface SubActivity {
  id: string;
  name: string;
  estimatedHours?: number;
  isCustom?: boolean;
}

interface ServiceOfferingActivities {
  [serviceOfferingId: string]: {
    activities: {
      [activityId: string]: {
        selected: boolean;
        subActivities: {
          [subActivityId: string]: boolean;
        };
      };
    };
  };
}

interface ServiceOfferingActivitiesWithDetails {
  [serviceOfferingId: string]: {
    activities: {
      [activityId: string]: {
        selected: boolean;
        name?: string;
        estimated_hours?: number;
        subActivities: {
          [subActivityId: string]: {
            selected: boolean;
            name?: string;
            estimated_hours?: number;
          } | boolean;
        };
      };
    };
  };
}

interface MultiServiceActivitiesSectionProps {
  requestId: string;
  serviceOfferings: string[];
  currentStatus: string;
  readOnly?: boolean;
  onActivitiesChange?: (activities: ServiceOfferingActivities) => void;
  onSaveActivities?: () => void;
}

export const MultiServiceActivitiesSection: React.FC<MultiServiceActivitiesSectionProps> = ({
  requestId,
  serviceOfferings,
  currentStatus,
  readOnly = false,
  onActivitiesChange,
  onSaveActivities
}) => {
  const [selectedActivities, setSelectedActivities] = useState<ServiceOfferingActivities>({});
  const [expandedActivities, setExpandedActivities] = useState<{[key: string]: boolean}>({});
  const [serviceOfferingActivities, setServiceOfferingActivities] = useState<{[serviceOfferingId: string]: Activity[]}>({});
  const [serviceOfferingMap, setServiceOfferingMap] = useState<{[id: string]: string}>({});
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [selectedServiceOfferingForActivity, setSelectedServiceOfferingForActivity] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadServiceOfferings();
    loadExistingActivities();
  }, [requestId]);

  useEffect(() => {
    if (Object.keys(serviceOfferingMap).length > 0) {
      loadActivitiesForServiceOfferings();
    }
  }, [serviceOfferings, serviceOfferingMap]);

  const loadServiceOfferings = async () => {
    try {
      // Get service offering details
      const { data: serviceOfferingsData, error } = await supabase
        .from('service_offerings')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;

      const offeringMap: {[id: string]: string} = {};
      serviceOfferingsData?.forEach(offering => {
        offeringMap[offering.id] = offering.name;
      });
      setServiceOfferingMap(offeringMap);
    } catch (error) {
      console.error('Error loading service offerings:', error);
    }
  };

  const loadActivitiesForServiceOfferings = async () => {
    try {
      setRefreshing(true);
      
      // Convert service offering names to IDs if needed
      let serviceOfferingIds: string[] = [];
      
      if (serviceOfferings && serviceOfferings.length > 0) {
        const firstItem = serviceOfferings[0];
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstItem);
        
        if (isUUID) {
          serviceOfferingIds = serviceOfferings;
        } else {
          // Convert names to IDs
          serviceOfferingIds = serviceOfferings
            .map(name => Object.entries(serviceOfferingMap).find(([id, offeringName]) => offeringName === name)?.[0])
            .filter(Boolean) as string[];
        }
      }

      const activitiesByServiceOffering: {[serviceOfferingId: string]: Activity[]} = {};

      // Load activities for each service offering
      for (const serviceOfferingId of serviceOfferingIds) {
        const { data: activitiesData, error } = await supabase
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
          .eq('service_offering_id', serviceOfferingId)
          .eq('is_active', true)
          .order('display_order');

        if (error) {
          console.error(`Error loading activities for service offering ${serviceOfferingId}:`, error);
          continue;
        }

        const transformedActivities: Activity[] = (activitiesData || []).map(activity => ({
          id: activity.id,
          name: activity.name,
          estimatedHours: activity.estimated_hours,
          serviceOfferingId: activity.service_offering_id,
          subActivities: (activity.sub_activities || []).map(subActivity => ({
            id: subActivity.id,
            name: subActivity.name,
            estimatedHours: subActivity.estimated_hours,
            isCustom: false
          })),
          isCustom: false
        }));

        activitiesByServiceOffering[serviceOfferingId] = transformedActivities;
      }

      setServiceOfferingActivities(activitiesByServiceOffering);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast({
        title: "Error",
        description: "Failed to load activities.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const loadExistingActivities = async () => {
    try {
      const { data: request, error } = await supabase
        .from('requests')
        .select('service_offering_activities')
        .eq('id', requestId)
        .maybeSingle();

      if (error) {
        console.error('Error loading existing activities:', error);
        return;
      }

      if (request?.service_offering_activities && typeof request.service_offering_activities === 'object') {
        setSelectedActivities(request.service_offering_activities as ServiceOfferingActivities);
        onActivitiesChange?.(request.service_offering_activities as ServiceOfferingActivities);
      }
    } catch (error) {
      console.error('Error loading existing activities:', error);
    }
  };

  const autoSaveActivities = async (activitiesToSave: ServiceOfferingActivities) => {
    try {
      console.log('Auto-saving service offering activities:', activitiesToSave);
      
      // Calculate and store activity details with hours for each service offering
      const activitiesWithHours: ServiceOfferingActivitiesWithDetails = {};

      Object.entries(activitiesToSave).forEach(([serviceOfferingId, serviceData]) => {
        activitiesWithHours[serviceOfferingId] = {
          activities: {}
        };

        Object.entries(serviceData.activities || {}).forEach(([activityId, activityData]) => {
          if (activityData.selected) {
            const activity = serviceOfferingActivities[serviceOfferingId]?.find(a => a.id === activityId);
            if (activity) {
              activitiesWithHours[serviceOfferingId].activities[activityId] = {
                selected: true,
                name: activity.name,
                estimated_hours: activity.estimatedHours || 0,
                subActivities: {}
              };
            }
          }

          // Process sub-activities
          Object.entries(activityData.subActivities || {}).forEach(([subActivityId, isSelected]) => {
            if (isSelected) {
              const activity = serviceOfferingActivities[serviceOfferingId]?.find(a => a.id === activityId);
              const subActivity = activity?.subActivities?.find(sa => sa.id === subActivityId);
              
              if (subActivity) {
                if (!activitiesWithHours[serviceOfferingId].activities[activityId]) {
                  activitiesWithHours[serviceOfferingId].activities[activityId] = {
                    selected: false,
                    subActivities: {}
                  };
                }
                activitiesWithHours[serviceOfferingId].activities[activityId].subActivities[subActivityId] = {
                  selected: true,
                  name: subActivity.name,
                  estimated_hours: subActivity.estimatedHours || 0
                };
              }
            }
          });
        });
      });

      const { error } = await supabase
        .from('requests')
        .update({ 
          service_offering_activities: activitiesWithHours
        })
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      console.log('Service offering activities auto-saved successfully');
    } catch (error) {
      console.error('Error auto-saving activities:', error);
    }
  };

  const saveActivities = async () => {
    setSaving(true);
    try {
      await autoSaveActivities(selectedActivities);
      
      // Call the parent callback to trigger refresh of the entire request data
      onSaveActivities?.();
      
      toast({
        title: "Success",
        description: "Activities saved successfully.",
      });
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

  const handleActivityChange = async (serviceOfferingId: string, activityId: string, checked: boolean) => {
    const newSelectedActivities = { ...selectedActivities };
    
    if (!newSelectedActivities[serviceOfferingId]) {
      newSelectedActivities[serviceOfferingId] = { activities: {} };
    }
    
    if (!newSelectedActivities[serviceOfferingId].activities[activityId]) {
      newSelectedActivities[serviceOfferingId].activities[activityId] = { selected: false, subActivities: {} };
    }
    
    newSelectedActivities[serviceOfferingId].activities[activityId].selected = checked;
    
    if (!checked) {
      newSelectedActivities[serviceOfferingId].activities[activityId].subActivities = {};
      setExpandedActivities(prev => ({ ...prev, [`${serviceOfferingId}-${activityId}`]: false }));
    } else {
      setExpandedActivities(prev => ({ ...prev, [`${serviceOfferingId}-${activityId}`]: true }));
    }
    
    setSelectedActivities(newSelectedActivities);
    onActivitiesChange?.(newSelectedActivities);
  };

  const handleSubActivityChange = async (serviceOfferingId: string, activityId: string, subActivityId: string, checked: boolean) => {
    const newSelectedActivities = { ...selectedActivities };
    
    if (!newSelectedActivities[serviceOfferingId]) {
      newSelectedActivities[serviceOfferingId] = { activities: {} };
    }
    
    if (!newSelectedActivities[serviceOfferingId].activities[activityId]) {
      newSelectedActivities[serviceOfferingId].activities[activityId] = { selected: false, subActivities: {} };
    }
    
    newSelectedActivities[serviceOfferingId].activities[activityId].subActivities[subActivityId] = checked;
    
    setSelectedActivities(newSelectedActivities);
    onActivitiesChange?.(newSelectedActivities);
  };

  const toggleActivityExpansion = (serviceOfferingId: string, activityId: string) => {
    const key = `${serviceOfferingId}-${activityId}`;
    setExpandedActivities(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getSelectedCount = (serviceOfferingId: string, activityId: string) => {
    const activity = selectedActivities[serviceOfferingId]?.activities[activityId];
    if (!activity) return 0;
    return Object.values(activity.subActivities).filter(Boolean).length;
  };

  const hasSelectedSubActivities = (serviceOfferingId: string, activityId: string) => {
    return getSelectedCount(serviceOfferingId, activityId) > 0;
  };

  const getTotalSubActivities = (serviceOfferingId: string, activityId: string) => {
    const activity = serviceOfferingActivities[serviceOfferingId]?.find(a => a.id === activityId);
    return activity?.subActivities.length || 0;
  };

  // Calculate total hours from all service offerings
  const calculateTotalHours = () => {
    let totalHours = 0;
    
    Object.entries(selectedActivities).forEach(([serviceOfferingId, serviceData]) => {
      Object.entries(serviceData.activities || {}).forEach(([activityId, activityData]) => {
        // Add activity hours if selected
        if (activityData.selected) {
          const activity = serviceOfferingActivities[serviceOfferingId]?.find(a => a.id === activityId);
          if (activity?.estimatedHours) {
            totalHours += activity.estimatedHours;
          }
        }
        
        // Add sub-activity hours
        Object.entries(activityData.subActivities || {}).forEach(([subActivityId, isSelected]) => {
          if (isSelected) {
            const activity = serviceOfferingActivities[serviceOfferingId]?.find(a => a.id === activityId);
            const subActivity = activity?.subActivities?.find(sa => sa.id === subActivityId);
            if (subActivity?.estimatedHours) {
              totalHours += subActivity.estimatedHours;
            }
          }
        });
      });
    });
    
    return totalHours;
  };

  // Show for Estimation status (editable), Review status (read-only), Approval status (read-only), or Approved status (read-only)
  if (currentStatus !== 'Estimation' && currentStatus !== 'Review' && currentStatus !== 'Approval' && currentStatus !== 'Approved') {
    return null;
  }

  // If only one service offering, show simplified version
  if (serviceOfferings.length <= 1) {
    return null; // Fall back to the original ActivitiesSection component
  }

  const serviceOfferingIds = serviceOfferings.map(offering => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offering);
    if (isUUID) {
      return offering;
    } else {
      return Object.entries(serviceOfferingMap).find(([id, name]) => name === offering)?.[0] || offering;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Activities & Sub-activities by Service Offering
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {readOnly 
            ? 'Selected activities and sub-activities for each service offering in this request' 
            : 'Select the activities and sub-activities required for each service offering in this estimation'}
        </p>
        {!readOnly && (
          <div className="text-xs text-primary bg-primary/10 p-2 rounded">
            Total estimated hours across all service offerings: {calculateTotalHours()}h
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {!readOnly && (
          <div className="flex justify-between items-center">
            <Button 
              type="button"
              variant="outline"
              onClick={loadActivitiesForServiceOfferings}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Activities'}
            </Button>
            <Button 
              type="button"
              onClick={saveActivities}
              disabled={saving || refreshing}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Activities'}
            </Button>
          </div>
        )}

        {serviceOfferingIds.map(serviceOfferingId => {
          const serviceOfferingName = serviceOfferingMap[serviceOfferingId] || serviceOfferingId;
          const activities = serviceOfferingActivities[serviceOfferingId] || [];
          
          return (
            <div key={serviceOfferingId} className="border-2 border-primary/20 rounded-lg p-4 bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
                  <Badge variant="default" className="px-3 py-1">
                    {serviceOfferingName}
                  </Badge>
                </h3>
                <div className="text-sm text-muted-foreground">
                  {activities.length} activities available for this service offering
                </div>
              </div>

              <div className="space-y-3">
                {activities.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No activities found for this service offering.
                  </div>
                ) : (
                  activities.map((activity) => {
                    const isSelected = selectedActivities[serviceOfferingId]?.activities[activity.id]?.selected || false;
                    const isExpanded = expandedActivities[`${serviceOfferingId}-${activity.id}`] || false;
                    const selectedCount = getSelectedCount(serviceOfferingId, activity.id);
                    const totalCount = getTotalSubActivities(serviceOfferingId, activity.id);
                    
                    // In read-only mode, auto-expand activities that have selected sub-activities
                    const shouldShowSubActivities = isSelected && (isExpanded || (readOnly && selectedCount > 0));
                    
                    // In read-only mode, only show activities that have selected sub-activities
                    if (readOnly && !hasSelectedSubActivities(serviceOfferingId, activity.id)) return null;

                    return (
                      <div key={activity.id} className={`border rounded-lg p-3 space-y-2 bg-background ${hasSelectedSubActivities(serviceOfferingId, activity.id) ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center gap-2">
                              <label className={`text-sm font-medium leading-none cursor-pointer ${hasSelectedSubActivities(serviceOfferingId, activity.id) ? 'text-primary font-semibold' : ''}`}>
                                {activity.name}
                              </label>
                              {activity.estimatedHours && (
                                <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
                                  {activity.estimatedHours}h
                                </Badge>
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
                              onClick={() => toggleActivityExpansion(serviceOfferingId, activity.id)}
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
                          <div className="ml-4 space-y-2 pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground font-medium">Sub-activities:</p>
                            <div className="grid gap-2">
                              {activity.subActivities.map((subActivity) => {
                                const isSubSelected = selectedActivities[serviceOfferingId]?.activities[activity.id]?.subActivities[subActivity.id] || false;
                                
                                // In read-only mode, only show selected sub-activities
                                if (readOnly && !isSubSelected) return null;
                                
                                return (
                                  <div key={subActivity.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`${serviceOfferingId}-${activity.id}-${subActivity.id}`}
                                      checked={isSubSelected}
                                      disabled={readOnly}
                                      onCheckedChange={(checked) => {
                                        handleSubActivityChange(serviceOfferingId, activity.id, subActivity.id, !!checked);
                                      }}
                                    />
                                    <div className="flex items-center gap-2 flex-1">
                                      <label 
                                        htmlFor={`${serviceOfferingId}-${activity.id}-${subActivity.id}`}
                                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          if (!readOnly) {
                                            handleSubActivityChange(serviceOfferingId, activity.id, subActivity.id, !isSubSelected);
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
              </div>

              {readOnly && activities.length > 0 && !activities.some(activity => hasSelectedSubActivities(serviceOfferingId, activity.id)) && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No activities were selected for this service offering.
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};