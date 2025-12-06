import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit, Save, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  name: string;
  estimated_hours: number;
  service_offering_id: string | null;
  display_order: number;
  is_active: boolean;
}

interface SubActivity {
  id: string;
  activity_id: string;
  name: string;
  estimated_hours: number;
  display_order: number;
  is_active: boolean;
}

interface ServiceOffering {
  id: string;
  name: string;
}

export const ActivitiesManagement: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [subActivities, setSubActivities] = useState<SubActivity[]>([]);
  const [serviceOfferings, setServiceOfferings] = useState<ServiceOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [editingSubActivity, setEditingSubActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({
    name: '',
    estimated_hours: 0,
    service_offering_id: '',
    display_order: 0
  });
  const [newSubActivity, setNewSubActivity] = useState({
    activity_id: '',
    name: '',
    estimated_hours: 0,
    display_order: 0
  });
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddSubActivity, setShowAddSubActivity] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load service offerings
      const { data: serviceOfferingsData, error: serviceOfferingsError } = await supabase
        .from('service_offerings')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order');

      if (serviceOfferingsError) throw serviceOfferingsError;
      setServiceOfferings(serviceOfferingsData || []);

      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .order('service_offering_id', { nullsFirst: false })
        .order('display_order');

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Load sub-activities
      const { data: subActivitiesData, error: subActivitiesError } = await supabase
        .from('sub_activities')
        .select('*')
        .order('activity_id')
        .order('display_order');

      if (subActivitiesError) throw subActivitiesError;
      setSubActivities(subActivitiesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load activities data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createActivity = async () => {
    try {
      const { error } = await supabase
        .from('activities')
        .insert([{
          name: newActivity.name,
          estimated_hours: newActivity.estimated_hours,
          service_offering_id: newActivity.service_offering_id || null,
          display_order: newActivity.display_order
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity created successfully.",
      });

      setNewActivity({ name: '', estimated_hours: 0, service_offering_id: '', display_order: 0 });
      setShowAddActivity(false);
      loadData();
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({
        title: "Error",
        description: "Failed to create activity.",
        variant: "destructive",
      });
    }
  };

  const createSubActivity = async () => {
    try {
      const { error } = await supabase
        .from('sub_activities')
        .insert([{
          activity_id: newSubActivity.activity_id,
          name: newSubActivity.name,
          estimated_hours: newSubActivity.estimated_hours,
          display_order: newSubActivity.display_order
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sub-activity created successfully.",
      });

      setNewSubActivity({ activity_id: '', name: '', estimated_hours: 0, display_order: 0 });
      setShowAddSubActivity(false);
      loadData();
    } catch (error) {
      console.error('Error creating sub-activity:', error);
      toast({
        title: "Error",
        description: "Failed to create sub-activity.",
        variant: "destructive",
      });
    }
  };

  const updateActivity = async (activity: Activity) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({
          name: activity.name,
          estimated_hours: activity.estimated_hours,
          service_offering_id: activity.service_offering_id,
          display_order: activity.display_order,
          is_active: activity.is_active
        })
        .eq('id', activity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity updated successfully.",
      });

      setEditingActivity(null);
      loadData();
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: "Error",
        description: "Failed to update activity.",
        variant: "destructive",
      });
    }
  };

  const updateSubActivity = async (subActivity: SubActivity) => {
    try {
      const { error } = await supabase
        .from('sub_activities')
        .update({
          name: subActivity.name,
          estimated_hours: subActivity.estimated_hours,
          display_order: subActivity.display_order,
          is_active: subActivity.is_active
        })
        .eq('id', subActivity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sub-activity updated successfully.",
      });

      setEditingSubActivity(null);
      loadData();
    } catch (error) {
      console.error('Error updating sub-activity:', error);
      toast({
        title: "Error",
        description: "Failed to update sub-activity.",
        variant: "destructive",
      });
    }
  };

  const deleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_active: false })
        .eq('id', activityId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity deactivated successfully.",
      });

      loadData();
    } catch (error) {
      console.error('Error deactivating activity:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate activity.",
        variant: "destructive",
      });
    }
  };

  const deleteSubActivity = async (subActivityId: string) => {
    try {
      const { error } = await supabase
        .from('sub_activities')
        .update({ is_active: false })
        .eq('id', subActivityId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sub-activity deactivated successfully.",
      });

      loadData();
    } catch (error) {
      console.error('Error deactivating sub-activity:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate sub-activity.",
        variant: "destructive",
      });
    }
  };

  const getServiceOfferingName = (serviceOfferingId: string | null) => {
    if (!serviceOfferingId) return 'Default';
    const service = serviceOfferings.find(s => s.id === serviceOfferingId);
    return service?.name || 'Unknown';
  };

  const getSubActivitiesForActivity = (activityId: string) => {
    return subActivities.filter(sub => sub.activity_id === activityId);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activities Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activities Management</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddActivity(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Activity
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddSubActivity(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Sub-Activity
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Activity Form */}
          {showAddActivity && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Add New Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="activity-name">Activity Name</Label>
                    <Input
                      id="activity-name"
                      value={newActivity.name}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter activity name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activity-hours">Estimated Hours</Label>
                    <Input
                      id="activity-hours"
                      type="number"
                      value={newActivity.estimated_hours}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, estimated_hours: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activity-service">Service Offering</Label>
                    <Select
                      value={newActivity.service_offering_id}
                      onValueChange={(value) => setNewActivity(prev => ({ ...prev, service_offering_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service offering" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="">Default (All Services)</SelectItem>
                        {serviceOfferings.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="activity-order">Display Order</Label>
                    <Input
                      id="activity-order"
                      type="number"
                      value={newActivity.display_order}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={createActivity}
                    disabled={!newActivity.name}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Activity
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddActivity(false)}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Sub-Activity Form */}
          {showAddSubActivity && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Add New Sub-Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sub-activity-parent">Parent Activity</Label>
                    <Select
                      value={newSubActivity.activity_id}
                      onValueChange={(value) => setNewSubActivity(prev => ({ ...prev, activity_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent activity" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {activities.filter(a => a.is_active).map((activity) => (
                          <SelectItem key={activity.id} value={activity.id}>
                            {activity.name} ({getServiceOfferingName(activity.service_offering_id)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sub-activity-name">Sub-Activity Name</Label>
                    <Input
                      id="sub-activity-name"
                      value={newSubActivity.name}
                      onChange={(e) => setNewSubActivity(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter sub-activity name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-activity-hours">Estimated Hours</Label>
                    <Input
                      id="sub-activity-hours"
                      type="number"
                      value={newSubActivity.estimated_hours}
                      onChange={(e) => setNewSubActivity(prev => ({ ...prev, estimated_hours: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-activity-order">Display Order</Label>
                    <Input
                      id="sub-activity-order"
                      type="number"
                      value={newSubActivity.display_order}
                      onChange={(e) => setNewSubActivity(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={createSubActivity}
                    disabled={!newSubActivity.name || !newSubActivity.activity_id}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Sub-Activity
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddSubActivity(false)}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activities List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Activities</h3>
            {activities.map((activity) => (
              <Card key={activity.id} className={`${!activity.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {editingActivity === activity.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={activity.name}
                              onChange={(e) => setActivities(prev => 
                                prev.map(a => a.id === activity.id ? { ...a, name: e.target.value } : a)
                              )}
                              className="min-w-48"
                            />
                            <Input
                              type="number"
                              value={activity.estimated_hours}
                              onChange={(e) => setActivities(prev => 
                                prev.map(a => a.id === activity.id ? { ...a, estimated_hours: parseInt(e.target.value) || 0 } : a)
                              )}
                              className="w-20"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{activity.name}</h4>
                            <Badge variant="default" className="bg-gradient-to-r from-primary to-primary/80">
                              <Clock className="h-3 w-3 mr-1" />
                              {activity.estimated_hours}h
                            </Badge>
                            <Badge variant="outline">
                              {getServiceOfferingName(activity.service_offering_id)}
                            </Badge>
                            {!activity.is_active && (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editingActivity === activity.id ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateActivity(activity)}
                              className="flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingActivity(null)}
                              className="flex items-center gap-1"
                            >
                              <X className="h-3 w-3" />
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingActivity(activity.id)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteActivity(activity.id)}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-activities */}
                    <div className="ml-4 space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground">Sub-activities:</h5>
                      {getSubActivitiesForActivity(activity.id).map((subActivity) => (
                        <div key={subActivity.id} className={`flex items-center justify-between p-2 bg-muted/30 rounded ${!subActivity.is_active ? 'opacity-50' : ''}`}>
                          {editingSubActivity === subActivity.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={subActivity.name}
                                onChange={(e) => setSubActivities(prev => 
                                  prev.map(s => s.id === subActivity.id ? { ...s, name: e.target.value } : s)
                                )}
                                className="min-w-48"
                              />
                              <Input
                                type="number"
                                value={subActivity.estimated_hours}
                                onChange={(e) => setSubActivities(prev => 
                                  prev.map(s => s.id === subActivity.id ? { ...s, estimated_hours: parseInt(e.target.value) || 0 } : s)
                                )}
                                className="w-20"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{subActivity.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {subActivity.estimated_hours}h
                              </Badge>
                              {!subActivity.is_active && (
                                <Badge variant="destructive" className="text-xs">Inactive</Badge>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {editingSubActivity === subActivity.id ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => updateSubActivity(subActivity)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingSubActivity(null)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingSubActivity(subActivity.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteSubActivity(subActivity.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};