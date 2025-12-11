import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Plus, Edit, Trash2, Settings, Users, List, Mail, Wrench, Package, Activity, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DropdownValue {
  id: string;
  category: string;
  value: string;
  display_order: number;
  is_active: boolean;
}

interface AdvisoryTeamMember {
  id: string;
  name: string;
  title: string;
  designation?: string;
  email?: string;
  advisory_services: string[];
  expertise: string[];
  user_id?: string;
  is_active: boolean;
  rate_per_hour?: number;
}

interface AdvisoryService {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
}

interface ServiceOffering {
  id: string;
  advisory_service_id: string;
  name: string;
  description?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
}

interface Activity {
  id: string;
  name: string;
  estimated_hours: number;
  service_offering_id: string;
  advisory_service_id?: string;
  display_order: number;
  is_active: boolean;
}

interface SubActivity {
  id: string;
  activity_id: string;
  name: string;
  estimated_hours: number;
  associated_tool?: string;
  display_order: number;
  is_active: boolean;
}

interface SystemSettingsProps {
  advisoryTeamPrefillData?: { name: string; title: string; email: string; user_id?: string; } | null;
  onClearPrefillData?: () => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ 
  advisoryTeamPrefillData, 
  onClearPrefillData 
}) => {
  const [activeSystemTab, setActiveSystemTab] = useState('advisory-services');
  const [dropdownValues, setDropdownValues] = useState<DropdownValue[]>([]);
  const [advisoryTeamMembers, setAdvisoryTeamMembers] = useState<AdvisoryTeamMember[]>([]);
  const [advisoryServices, setAdvisoryServices] = useState<AdvisoryService[]>([]);
  const [serviceOfferings, setServiceOfferings] = useState<ServiceOffering[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [subActivities, setSubActivities] = useState<SubActivity[]>([]);
  const [teamDlEmail, setTeamDlEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Dropdown management state
  const [isDropdownDialogOpen, setIsDropdownDialogOpen] = useState(false);
  const [editingDropdownValue, setEditingDropdownValue] = useState<DropdownValue | null>(null);
  const [dropdownFormData, setDropdownFormData] = useState({
    category: '',
    value: '',
    display_order: 0
  });

  // Team member management state
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<AdvisoryTeamMember | null>(null);
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    title: '',
    designation: '',
    email: '',
    advisory_services: [] as string[],
    expertise: [] as string[],
    user_id: '' as string | undefined,
    rate_per_hour: '' as string
  });

  // Advisory services management state
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<AdvisoryService | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    icon: '',
    display_order: 0
  });
  const [serviceFormErrors, setServiceFormErrors] = useState({
    name: ''
  });

  // Service offerings management state
  const [isOfferingDialogOpen, setIsOfferingDialogOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<ServiceOffering | null>(null);
  const [offeringFormData, setOfferingFormData] = useState({
    advisory_service_id: '',
    name: '',
    description: '',
    icon: '',
    display_order: 0
  });
  const [offeringFormErrors, setOfferingFormErrors] = useState({
    advisory_service_id: '',
    name: ''
  });
  // Multiple offerings state for create mode
  const [multipleOfferings, setMultipleOfferings] = useState([
    { name: '', description: '', icon: '', display_order: 0 }
  ]);
  const [multipleOfferingsErrors, setMultipleOfferingsErrors] = useState([
    { name: '' }
  ]);

  // Activities management state
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityFormData, setActivityFormData] = useState({
    name: '',
    estimated_hours: 0,
    service_offering_id: '',
    advisory_service_id: '',
    display_order: 0
  });
  // Multiple activities state for create mode
  const [multipleActivities, setMultipleActivities] = useState([
    { name: '', estimated_hours: 0, display_order: 0 }
  ]);
  const [multipleActivitiesErrors, setMultipleActivitiesErrors] = useState([
    { name: '' }
  ]);

  // Sub-activities management state
  const [isSubActivityDialogOpen, setIsSubActivityDialogOpen] = useState(false);
  const [editingSubActivity, setEditingSubActivity] = useState<SubActivity | null>(null);
  const [subActivityFormData, setSubActivityFormData] = useState({
    activity_id: '',
    name: '',
    estimated_hours: 0,
    associated_tool: '',
    advisory_service_id: '',
    service_offering_id: '',
    display_order: 0
  });
  // Multiple sub-activities state for create mode
  const [multipleSubActivities, setMultipleSubActivities] = useState([
    { name: '', estimated_hours: 0, associated_tool: '', display_order: 0 }
  ]);
  const [multipleSubActivitiesErrors, setMultipleSubActivitiesErrors] = useState([
    { name: '' }
  ]);

  const dropdownCategories = [
    { value: 'user_titles', label: 'User Titles' },
    { value: 'user_roles', label: 'User Roles' }
  ];

  useEffect(() => {
    fetchDropdownValues();
    fetchAdvisoryTeamMembers();
    fetchAdvisoryServices();
    fetchServiceOfferings();
    fetchActivities();
    fetchSubActivities();
    fetchSystemSettings();
  }, []);

  // Handle prefilled data from User Management
  useEffect(() => {
    if (advisoryTeamPrefillData) {
      setActiveSystemTab('advisory-team');
      setTeamFormData({
        name: advisoryTeamPrefillData.name,
        title: advisoryTeamPrefillData.title,
        designation: '',
        email: advisoryTeamPrefillData.email,
        advisory_services: [],
        expertise: [],
        user_id: advisoryTeamPrefillData.user_id,
        rate_per_hour: ''
      });
      setIsTeamDialogOpen(true);
      setEditingTeamMember(null);
    }
  }, [advisoryTeamPrefillData]);

  const fetchDropdownValues = async () => {
    try {
      const { data, error } = await supabase
        .from('dropdown_values')
        .select('*')
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setDropdownValues(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch dropdown values",
        variant: "destructive"
      });
    }
  };

  const fetchAdvisoryTeamMembers = async () => {
    try {
      // Use admin function to get full access including sensitive data (emails, rates)
      const { data, error } = await supabase.rpc('admin_get_advisory_team_members');

      if (error) throw error;
      setAdvisoryTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching advisory team members:', error);
      toast({
        title: "Error",
        description: "Failed to fetch advisory team members. Make sure you have admin access.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvisoryServices = async () => {
    try {
      const { data, error } = await supabase
        .from('advisory_services')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setAdvisoryServices(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch advisory services",
        variant: "destructive"
      });
    }
  };

  const fetchServiceOfferings = async () => {
    try {
      const { data, error } = await supabase
        .from('service_offerings')
        .select('*')
        .order('advisory_service_id', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setServiceOfferings(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch service offerings",
        variant: "destructive"
      });
    }
  };

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          advisory_services(name)
        `)
        .order('service_offering_id', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch activities",
        variant: "destructive"
      });
    }
  };

  const fetchSubActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('sub_activities')
        .select('*')
        .order('activity_id', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSubActivities(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch sub-activities",
        variant: "destructive"
      });
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', 'advisory_team_dl_email')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTeamDlEmail(data?.setting_value || '');
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const saveTeamDlEmail = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'advisory_team_dl_email',
          setting_value: teamDlEmail,
          description: 'Email address for Advisory Service Team Distribution List'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team DL email saved successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save team DL email",
        variant: "destructive"
      });
    }
  };

  // Dropdown value management functions
  const handleCreateDropdownValue = async () => {
    try {
      const { error } = await supabase
        .from('dropdown_values')
        .insert([dropdownFormData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dropdown value created successfully"
      });

      setDropdownFormData({
        category: '',
        value: '',
        display_order: 0
      });
      setIsDropdownDialogOpen(false);
      fetchDropdownValues();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create dropdown value",
        variant: "destructive"
      });
    }
  };

  const handleEditDropdownValue = async () => {
    if (!editingDropdownValue) return;

    try {
      const { error } = await supabase
        .from('dropdown_values')
        .update(dropdownFormData)
        .eq('id', editingDropdownValue.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dropdown value updated successfully"
      });

      setEditingDropdownValue(null);
      setDropdownFormData({
        category: '',
        value: '',
        display_order: 0
      });
      setIsDropdownDialogOpen(false);
      fetchDropdownValues();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update dropdown value",
        variant: "destructive"
      });
    }
  };

  const deleteDropdownValue = async (item: DropdownValue) => {
    try {
      const { error } = await supabase
        .from('dropdown_values')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dropdown value deleted successfully"
      });

      fetchDropdownValues();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete dropdown value",
        variant: "destructive"
      });
    }
  };

  // Team member management functions
  const handleCreateTeamMember = async () => {
    try {
      const insertData = {
        name: teamFormData.name,
        title: teamFormData.title,
        designation: teamFormData.designation,
        email: teamFormData.email,
        advisory_services: teamFormData.advisory_services,
        expertise: teamFormData.expertise,
        user_id: teamFormData.user_id || null,
        rate_per_hour: teamFormData.rate_per_hour ? parseFloat(teamFormData.rate_per_hour) : null
      };

      const { error } = await supabase
        .from('advisory_team_members')
        .insert([insertData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member created successfully"
      });

      setTeamFormData({
        name: '',
        title: '',
        designation: '',
        email: '',
        advisory_services: [],
        expertise: [],
        user_id: undefined,
        rate_per_hour: ''
      });
      setIsTeamDialogOpen(false);
      fetchAdvisoryTeamMembers();
      
      // Clear prefill data if it was used
      if (onClearPrefillData) {
        onClearPrefillData();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create team member",
        variant: "destructive"
      });
    }
  };

  const handleEditTeamMember = async () => {
    if (!editingTeamMember) return;

    try {
      const updateData = {
        name: teamFormData.name,
        title: teamFormData.title,
        designation: teamFormData.designation,
        email: teamFormData.email,
        advisory_services: teamFormData.advisory_services,
        expertise: teamFormData.expertise,
        user_id: teamFormData.user_id || null,
        rate_per_hour: teamFormData.rate_per_hour ? parseFloat(teamFormData.rate_per_hour) : null
      };

      const { error } = await supabase.rpc('admin_update_advisory_team_member', {
        member_id: editingTeamMember.id,
        update_data: updateData
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member updated successfully"
      });

      setEditingTeamMember(null);
      setTeamFormData({
        name: '',
        title: '',
        designation: '',
        email: '',
        advisory_services: [],
        expertise: [],
        user_id: undefined,
        rate_per_hour: ''
      });
      setIsTeamDialogOpen(false);
      fetchAdvisoryTeamMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive"
      });
    }
  };

  const deleteTeamMember = async (member: AdvisoryTeamMember) => {
    try {
      const { error } = await supabase
        .from('advisory_team_members')
        .delete()
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member deleted successfully"
      });

      fetchAdvisoryTeamMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team member",
        variant: "destructive"
      });
    }
  };

  const openEditDropdownDialog = (item: DropdownValue) => {
    setEditingDropdownValue(item);
    setDropdownFormData({
      category: item.category,
      value: item.value,
      display_order: item.display_order
    });
  };

  const openEditTeamMemberDialog = (member: AdvisoryTeamMember) => {
    setEditingTeamMember(member);
    setTeamFormData({
      name: member.name,
      title: member.title,
      designation: member.designation || '',
      email: member.email || '',
      advisory_services: member.advisory_services || [],
      expertise: member.expertise || [],
      user_id: member.user_id,
      rate_per_hour: member.rate_per_hour ? member.rate_per_hour.toString() : ''
    });
  };

  // Advisory services management functions
  const validateServiceForm = () => {
    const errors = { name: '' };
    
    if (!serviceFormData.name.trim()) {
      errors.name = 'Service Name is required';
    }
    
    setServiceFormErrors(errors);
    return !errors.name; // Return true if no errors
  };

  const handleCreateServiceAndNext = async () => {
    // Validate required fields
    if (!validateServiceForm()) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('advisory_services')
        .insert([serviceFormData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advisory service created successfully. Now create a service offering."
      });

      // Clear the service form
      setServiceFormData({
        name: '',
        description: '',
        icon: '',
        display_order: 0
      });
      setServiceFormErrors({ name: '' });
      setIsServiceDialogOpen(false);
      
      // Refresh advisory services list
      fetchAdvisoryServices();
      
      // Switch to service offerings tab and open the dialog with pre-selected service
      setActiveSystemTab('service-offerings');
      
      // Small delay to ensure tab switch completes before opening dialog
      setTimeout(() => {
        setOfferingFormData({
          advisory_service_id: data.id, // Pre-select the newly created service
          name: '',
          description: '',
          icon: '',
          display_order: 0
        });
        setEditingOffering(null);
        setIsOfferingDialogOpen(true);
      }, 100);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create advisory service",
        variant: "destructive"
      });
    }
  };

  const handleCreateService = async () => {
    // This is the original create function (kept for backward compatibility if needed)
    if (!validateServiceForm()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('advisory_services')
        .insert([serviceFormData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advisory service created successfully"
      });

      setServiceFormData({
        name: '',
        description: '',
        icon: '',
        display_order: 0
      });
      setServiceFormErrors({ name: '' });
      setIsServiceDialogOpen(false);
      fetchAdvisoryServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create advisory service",
        variant: "destructive"
      });
    }
  };

  // Pagination logic for Advisory Team
  const totalPages = Math.ceil(advisoryTeamMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTeamMembers = advisoryTeamMembers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleEditServiceAndNext = async () => {
    if (!editingService) return;

    // Validate required fields
    if (!validateServiceForm()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('advisory_services')
        .update(serviceFormData)
        .eq('id', editingService.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advisory service updated successfully. Now create a service offering."
      });

      const serviceId = editingService.id;
      
      // Clear the service form
      setEditingService(null);
      setServiceFormData({
        name: '',
        description: '',
        icon: '',
        display_order: 0
      });
      setServiceFormErrors({ name: '' });
      setIsServiceDialogOpen(false);
      
      // Refresh advisory services list
      fetchAdvisoryServices();
      
      // Switch to service offerings tab and open the dialog with pre-selected service
      setActiveSystemTab('service-offerings');
      
      // Small delay to ensure tab switch completes before opening dialog
      setTimeout(() => {
        setOfferingFormData({
          advisory_service_id: serviceId, // Pre-select the updated service
          name: '',
          description: '',
          icon: '',
          display_order: 0
        });
        setEditingOffering(null);
        setIsOfferingDialogOpen(true);
      }, 100);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update advisory service",
        variant: "destructive"
      });
    }
  };

  const handleEditService = async () => {
    if (!editingService) return;

    // Validate required fields
    if (!validateServiceForm()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('advisory_services')
        .update(serviceFormData)
        .eq('id', editingService.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advisory service updated successfully"
      });

      setEditingService(null);
      setServiceFormData({
        name: '',
        description: '',
        icon: '',
        display_order: 0
      });
      setServiceFormErrors({ name: '' });
      setIsServiceDialogOpen(false);
      fetchAdvisoryServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update advisory service",
        variant: "destructive"
      });
    }
  };

  const toggleServiceStatus = async (service: AdvisoryService) => {
    try {
      const { error } = await supabase
        .from('advisory_services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Advisory service ${!service.is_active ? 'activated' : 'deactivated'} successfully`
      });

      fetchAdvisoryServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update advisory service status",
        variant: "destructive"
      });
    }
  };

  const deleteService = async (service: AdvisoryService) => {
    try {
      const { error } = await supabase
        .from('advisory_services')
        .delete()
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advisory service deleted successfully"
      });

      fetchAdvisoryServices();
      fetchServiceOfferings(); // Refresh offerings as they may be affected
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete advisory service",
        variant: "destructive"
      });
    }
  };

  // Service offerings management functions
  const addNewOffering = () => {
    setMultipleOfferings([...multipleOfferings, { name: '', description: '', icon: '', display_order: multipleOfferings.length }]);
    setMultipleOfferingsErrors([...multipleOfferingsErrors, { name: '' }]);
  };

  const removeOffering = (index: number) => {
    if (multipleOfferings.length > 1) {
      const newOfferings = multipleOfferings.filter((_, i) => i !== index);
      const newErrors = multipleOfferingsErrors.filter((_, i) => i !== index);
      setMultipleOfferings(newOfferings);
      setMultipleOfferingsErrors(newErrors);
    }
  };

  const updateOffering = (index: number, field: string, value: string | number) => {
    const newOfferings = [...multipleOfferings];
    newOfferings[index] = { ...newOfferings[index], [field]: value };
    setMultipleOfferings(newOfferings);
    
    // Clear error when user starts typing
    if (field === 'name' && multipleOfferingsErrors[index].name) {
      const newErrors = [...multipleOfferingsErrors];
      newErrors[index] = { ...newErrors[index], name: '' };
      setMultipleOfferingsErrors(newErrors);
    }
  };

  const validateOfferingForm = () => {
    const errors = { advisory_service_id: '', name: '' };
    
    if (!offeringFormData.advisory_service_id.trim()) {
      errors.advisory_service_id = 'Advisory Service is required';
    }
    
    if (!offeringFormData.name.trim()) {
      errors.name = 'Offering Name is required';
    }
    
    setOfferingFormErrors(errors);
    return !errors.advisory_service_id && !errors.name; // Return true if no errors
  };

  const validateMultipleOfferings = (selectedServiceId: string) => {
    const errors = multipleOfferings.map(offering => ({
      name: offering.name.trim() ? '' : 'Offering Name is required'
    }));
    
    setMultipleOfferingsErrors(errors);
    
    const hasServiceError = !selectedServiceId.trim();
    const hasOfferingErrors = errors.some(error => error.name);
    
    return !hasServiceError && !hasOfferingErrors;
  };

  const handleCreateMultipleOfferingsAndNext = async (selectedServiceId: string) => {
    // Validate required fields
    if (!validateMultipleOfferings(selectedServiceId)) {
      return;
    }

    try {
      // Prepare offerings data with the selected advisory service
      const offeringsToInsert = multipleOfferings.map(offering => ({
        advisory_service_id: selectedServiceId,
        name: offering.name,
        description: offering.description,
        icon: offering.icon,
        display_order: offering.display_order
      }));

      const { data, error } = await supabase
        .from('service_offerings')
        .insert(offeringsToInsert)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `${multipleOfferings.length} service offering(s) created successfully. Now add activities.`
      });

      // Clear the offering form
      setMultipleOfferings([{ name: '', description: '', icon: '', display_order: 0 }]);
      setMultipleOfferingsErrors([{ name: '' }]);
      setIsOfferingDialogOpen(false);
      
      // Refresh service offerings list
      fetchServiceOfferings();
      
      // Switch to activities tab and open the dialog with pre-selected service offering (first one created)
      setActiveSystemTab('activities');
      
      // Small delay to ensure tab switch completes before opening dialog
      setTimeout(() => {
        setActivityFormData({
          name: '',
          estimated_hours: 0,
          service_offering_id: data[0].id, // Pre-select the first newly created offering
          advisory_service_id: selectedServiceId,
          display_order: 0
        });
        setEditingActivity(null);
        setIsActivityDialogOpen(true);
      }, 100);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create service offerings",
        variant: "destructive"
      });
    }
  };

  const handleCreateOfferingAndNext = async () => {
    // Validate required fields
    if (!validateOfferingForm()) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_offerings')
        .insert([offeringFormData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service offering created successfully. Now add activities."
      });

      // Clear the offering form
      setOfferingFormData({
        advisory_service_id: '',
        name: '',
        description: '',
        icon: '',
        display_order: 0
      });
      setOfferingFormErrors({ advisory_service_id: '', name: '' });
      setIsOfferingDialogOpen(false);
      
      // Refresh service offerings list
      fetchServiceOfferings();
      
      // Switch to activities tab and open the dialog with pre-selected service offering
      setActiveSystemTab('activities');
      
      // Small delay to ensure tab switch completes before opening dialog
      setTimeout(() => {
        setActivityFormData({
          name: '',
          estimated_hours: 0,
          service_offering_id: data.id, // Pre-select the newly created offering
          advisory_service_id: offeringFormData.advisory_service_id,
          display_order: 0
        });
        setEditingActivity(null);
        setIsActivityDialogOpen(true);
      }, 100);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create service offering",
        variant: "destructive"
      });
    }
  };

  const handleCreateOffering = async () => {
    // Validate required fields
    if (!validateOfferingForm()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_offerings')
        .insert([offeringFormData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service offering created successfully"
      });

      setOfferingFormData({
        advisory_service_id: '',
        name: '',
        description: '',
        icon: '',
        display_order: 0
      });
      setOfferingFormErrors({ advisory_service_id: '', name: '' });
      setIsOfferingDialogOpen(false);
      fetchServiceOfferings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create service offering",
        variant: "destructive"
      });
    }
  };

  const handleEditOfferingAndNext = async () => {
    if (!editingOffering) return;

    // Validate required fields
    if (!validateOfferingForm()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_offerings')
        .update(offeringFormData)
        .eq('id', editingOffering.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service offering updated successfully. Now add activities."
      });

      const offeringId = editingOffering.id;
      
      // Clear the offering form
      setEditingOffering(null);
      setOfferingFormData({
        advisory_service_id: '',
        name: '',
        description: '',
        icon: '',
        display_order: 0
      });
      setOfferingFormErrors({ advisory_service_id: '', name: '' });
      setIsOfferingDialogOpen(false);
      
      // Refresh service offerings list
      fetchServiceOfferings();
      
      // Switch to activities tab and open the dialog with pre-selected service offering
      setActiveSystemTab('activities');
      
      // Small delay to ensure tab switch completes before opening dialog
      setTimeout(() => {
        setActivityFormData({
          name: '',
          estimated_hours: 0,
          service_offering_id: offeringId, // Pre-select the updated offering
          advisory_service_id: offeringFormData.advisory_service_id,
          display_order: 0
        });
        setEditingActivity(null);
        setIsActivityDialogOpen(true);
      }, 100);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update service offering",
        variant: "destructive"
      });
    }
  };

  const handleEditOffering = async () => {
    if (!editingOffering) return;

    // Validate required fields
    if (!validateOfferingForm()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_offerings')
        .update(offeringFormData)
        .eq('id', editingOffering.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service offering updated successfully"
      });

      setEditingOffering(null);
      setOfferingFormData({
        advisory_service_id: '',
        name: '',
        description: '',
        icon: '',
        display_order: 0
      });
      setOfferingFormErrors({ advisory_service_id: '', name: '' });
      setIsOfferingDialogOpen(false);
      fetchServiceOfferings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update service offering",
        variant: "destructive"
      });
    }
  };

  const deleteOffering = async (offering: ServiceOffering) => {
    try {
      const { error } = await supabase
        .from('service_offerings')
        .delete()
        .eq('id', offering.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service offering deleted successfully"
      });

      fetchServiceOfferings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service offering",
        variant: "destructive"
      });
    }
  };

  const openEditServiceDialog = (service: AdvisoryService) => {
    setEditingService(service);
    setServiceFormData({
      name: service.name,
      description: service.description || '',
      icon: service.icon || '',
      display_order: service.display_order
    });
    setServiceFormErrors({ name: '' }); // Clear any existing errors
    setIsServiceDialogOpen(true);
  };

  const openEditOfferingDialog = (offering: ServiceOffering) => {
    setEditingOffering(offering);
    setOfferingFormData({
      advisory_service_id: offering.advisory_service_id,
      name: offering.name,
      description: offering.description || '',
      icon: offering.icon || '',
      display_order: offering.display_order
    });
    setOfferingFormErrors({ advisory_service_id: '', name: '' }); // Clear any existing errors
    setIsOfferingDialogOpen(true);
  };

  // Activities management functions
  const addNewActivity = () => {
    setMultipleActivities([...multipleActivities, { name: '', estimated_hours: 0, display_order: multipleActivities.length }]);
    setMultipleActivitiesErrors([...multipleActivitiesErrors, { name: '' }]);
  };

  const removeActivity = (index: number) => {
    if (multipleActivities.length > 1) {
      const newActivities = multipleActivities.filter((_, i) => i !== index);
      const newErrors = multipleActivitiesErrors.filter((_, i) => i !== index);
      setMultipleActivities(newActivities);
      setMultipleActivitiesErrors(newErrors);
    }
  };

  const updateActivity = (index: number, field: string, value: string | number) => {
    const newActivities = [...multipleActivities];
    newActivities[index] = { ...newActivities[index], [field]: value };
    setMultipleActivities(newActivities);
    
    // Clear error when user starts typing
    if (field === 'name' && multipleActivitiesErrors[index].name) {
      const newErrors = [...multipleActivitiesErrors];
      newErrors[index] = { ...newErrors[index], name: '' };
      setMultipleActivitiesErrors(newErrors);
    }
  };

  const validateMultipleActivities = (selectedServiceId: string, selectedOfferingId: string) => {
    const errors = multipleActivities.map(activity => ({
      name: activity.name.trim() ? '' : 'Activity Name is required'
    }));
    
    setMultipleActivitiesErrors(errors);
    
    const hasServiceError = !selectedServiceId.trim();
    const hasOfferingError = !selectedOfferingId.trim();
    const hasActivityErrors = errors.some(error => error.name);
    
    return !hasServiceError && !hasOfferingError && !hasActivityErrors;
  };

  const handleCreateMultipleActivitiesAndNext = async (selectedServiceId: string, selectedOfferingId: string) => {
    // Validate required fields
    if (!validateMultipleActivities(selectedServiceId, selectedOfferingId)) {
      return;
    }

    try {
      // Prepare activities data with the selected service offering
      const activitiesToInsert = multipleActivities.map(activity => ({
        name: activity.name,
        estimated_hours: activity.estimated_hours,
        service_offering_id: selectedOfferingId,
        advisory_service_id: selectedServiceId,
        display_order: activity.display_order
      }));

      const { data, error } = await supabase
        .from('activities')
        .insert(activitiesToInsert)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `${multipleActivities.length} activit${multipleActivities.length === 1 ? 'y' : 'ies'} created successfully. Now add sub-activities.`
      });

      // Clear the activities form
      setMultipleActivities([{ name: '', estimated_hours: 0, display_order: 0 }]);
      setMultipleActivitiesErrors([{ name: '' }]);
      setIsActivityDialogOpen(false);
      
      // Refresh activities list
      fetchActivities();
      
      // Open sub-activities dialog with pre-selected first activity
      setTimeout(() => {
        setSubActivityFormData({
          activity_id: data[0].id, // Pre-select the first newly created activity
          name: '',
          estimated_hours: 0,
          associated_tool: '',
          advisory_service_id: selectedServiceId,
          service_offering_id: selectedOfferingId,
          display_order: 0
        });
        setEditingSubActivity(null);
        setIsSubActivityDialogOpen(true);
      }, 100);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create activities",
        variant: "destructive"
      });
    }
  };

  const handleCreateMultipleActivities = async (selectedServiceId: string, selectedOfferingId: string) => {
    // Validate required fields
    if (!validateMultipleActivities(selectedServiceId, selectedOfferingId)) {
      return;
    }

    try {
      // Prepare activities data with the selected service offering
      const activitiesToInsert = multipleActivities.map(activity => ({
        name: activity.name,
        estimated_hours: activity.estimated_hours,
        service_offering_id: selectedOfferingId,
        advisory_service_id: selectedServiceId,
        display_order: activity.display_order
      }));

      const { error } = await supabase
        .from('activities')
        .insert(activitiesToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${multipleActivities.length} activit${multipleActivities.length === 1 ? 'y' : 'ies'} created successfully.`
      });

      // Clear the activities form
      setMultipleActivities([{ name: '', estimated_hours: 0, display_order: 0 }]);
      setMultipleActivitiesErrors([{ name: '' }]);
      setIsActivityDialogOpen(false);
      
      // Refresh activities list
      fetchActivities();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create activities",
        variant: "destructive"
      });
    }
  };

  const handleCreateActivity = async () => {
    try {
      const { error } = await supabase
        .from('activities')
        .insert([activityFormData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity created successfully"
      });

      setActivityFormData({
        name: '',
        estimated_hours: 0,
        service_offering_id: '',
        advisory_service_id: '',
        display_order: 0
      });
      setIsActivityDialogOpen(false);
      fetchActivities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create activity",
        variant: "destructive"
      });
    }
  };

  const handleEditActivity = async () => {
    if (!editingActivity) return;

    try {
      const { error } = await supabase
        .from('activities')
        .update(activityFormData)
        .eq('id', editingActivity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity updated successfully"
      });

      setEditingActivity(null);
      setActivityFormData({
        name: '',
        estimated_hours: 0,
        service_offering_id: '',
        advisory_service_id: '',
        display_order: 0
      });
      setIsActivityDialogOpen(false);
      fetchActivities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update activity",
        variant: "destructive"
      });
    }
  };

  const deleteActivity = async (activity: Activity) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_active: false })
        .eq('id', activity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity deactivated successfully"
      });

      fetchActivities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate activity",
        variant: "destructive"
      });
    }
  };

  const openEditActivityDialog = (activity: Activity) => {
    setEditingActivity(activity);
    setActivityFormData({
      name: activity.name,
      estimated_hours: activity.estimated_hours,
      service_offering_id: activity.service_offering_id,
      advisory_service_id: activity.advisory_service_id || '',
      display_order: activity.display_order
    });
    setIsActivityDialogOpen(true);
  };

  // Sub-activities management functions
  const addNewSubActivity = () => {
    setMultipleSubActivities([...multipleSubActivities, { name: '', estimated_hours: 0, associated_tool: '', display_order: multipleSubActivities.length }]);
    setMultipleSubActivitiesErrors([...multipleSubActivitiesErrors, { name: '' }]);
  };

  const removeSubActivity = (index: number) => {
    if (multipleSubActivities.length > 1) {
      const newSubActivities = multipleSubActivities.filter((_, i) => i !== index);
      const newErrors = multipleSubActivitiesErrors.filter((_, i) => i !== index);
      setMultipleSubActivities(newSubActivities);
      setMultipleSubActivitiesErrors(newErrors);
    }
  };

  const updateSubActivity = (index: number, field: string, value: string | number) => {
    const newSubActivities = [...multipleSubActivities];
    newSubActivities[index] = { ...newSubActivities[index], [field]: value };
    setMultipleSubActivities(newSubActivities);
    
    // Clear error when user starts typing
    if (field === 'name' && multipleSubActivitiesErrors[index].name) {
      const newErrors = [...multipleSubActivitiesErrors];
      newErrors[index] = { ...newErrors[index], name: '' };
      setMultipleSubActivitiesErrors(newErrors);
    }
  };

  const validateMultipleSubActivities = (selectedServiceId: string, selectedOfferingId: string, selectedActivityId: string) => {
    const errors = multipleSubActivities.map(subActivity => ({
      name: subActivity.name.trim() ? '' : 'Sub-Activity Name is required'
    }));
    
    setMultipleSubActivitiesErrors(errors);
    
    const hasServiceError = !selectedServiceId.trim();
    const hasOfferingError = !selectedOfferingId.trim();
    const hasActivityError = !selectedActivityId.trim();
    const hasSubActivityErrors = errors.some(error => error.name);
    
    return !hasServiceError && !hasOfferingError && !hasActivityError && !hasSubActivityErrors;
  };

  const handleCreateMultipleSubActivities = async (selectedServiceId: string, selectedOfferingId: string, selectedActivityId: string) => {
    // Validate required fields
    if (!validateMultipleSubActivities(selectedServiceId, selectedOfferingId, selectedActivityId)) {
      return;
    }

    try {
      // Prepare sub-activities data with the selected activity
      const subActivitiesToInsert = multipleSubActivities.map(subActivity => ({
        activity_id: selectedActivityId,
        name: subActivity.name,
        estimated_hours: subActivity.estimated_hours,
        associated_tool: subActivity.associated_tool || null,
        display_order: subActivity.display_order
      }));

      const { error } = await supabase
        .from('sub_activities')
        .insert(subActivitiesToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${multipleSubActivities.length} sub-activit${multipleSubActivities.length === 1 ? 'y' : 'ies'} created successfully.`
      });

      // Clear the sub-activities form
      setMultipleSubActivities([{ name: '', estimated_hours: 0, associated_tool: '', display_order: 0 }]);
      setMultipleSubActivitiesErrors([{ name: '' }]);
      setIsSubActivityDialogOpen(false);
      
      // Refresh sub-activities list
      fetchSubActivities();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create sub-activities",
        variant: "destructive"
      });
    }
  };

  const handleCreateSubActivity = async () => {
    if (!subActivityFormData.advisory_service_id || !subActivityFormData.service_offering_id || !subActivityFormData.activity_id || !subActivityFormData.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('sub_activities')
        .insert([{
          activity_id: subActivityFormData.activity_id,
          name: subActivityFormData.name,
          estimated_hours: subActivityFormData.estimated_hours,
          associated_tool: subActivityFormData.associated_tool || null,
          advisory_service_id: subActivityFormData.advisory_service_id,
          service_offering_id: subActivityFormData.service_offering_id,
          display_order: subActivityFormData.display_order
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sub-activity created successfully"
      });

      setSubActivityFormData({
        activity_id: '',
        name: '',
        estimated_hours: 0,
        associated_tool: '',
        advisory_service_id: '',
        service_offering_id: '',
        display_order: 0
      });
      setIsSubActivityDialogOpen(false);
      fetchSubActivities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create sub-activity",
        variant: "destructive"
      });
    }
  };

  const handleEditSubActivity = async () => {
    if (!editingSubActivity) return;

    try {
      const { error } = await supabase
        .from('sub_activities')
        .update(subActivityFormData)
        .eq('id', editingSubActivity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sub-activity updated successfully"
      });

      setEditingSubActivity(null);
      setSubActivityFormData({
        activity_id: '',
        name: '',
        estimated_hours: 0,
        associated_tool: '',
        advisory_service_id: '',
        service_offering_id: '',
        display_order: 0
      });
      setIsSubActivityDialogOpen(false);
      fetchSubActivities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update sub-activity",
        variant: "destructive"
      });
    }
  };

  const deleteSubActivity = async (subActivity: SubActivity) => {
    try {
      const { error } = await supabase
        .from('sub_activities')
        .update({ is_active: false })
        .eq('id', subActivity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sub-activity deactivated successfully"
      });

      fetchSubActivities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate sub-activity",
        variant: "destructive"
      });
    }
  };

  const openEditSubActivityDialog = (subActivity: SubActivity) => {
    setEditingSubActivity(subActivity);
    const activity = activities.find(a => a.id === subActivity.activity_id);
    setSubActivityFormData({
      activity_id: subActivity.activity_id,
      name: subActivity.name,
      estimated_hours: subActivity.estimated_hours,
      associated_tool: subActivity.associated_tool || '',
      advisory_service_id: activity?.advisory_service_id || '',
      service_offering_id: activity?.service_offering_id || '',
      display_order: subActivity.display_order
    });
    setIsSubActivityDialogOpen(true);
  };

  const getServiceOfferingName = (serviceOfferingId: string) => {
    const offering = serviceOfferings.find(o => o.id === serviceOfferingId);
    return offering?.name || 'Unknown';
  };

  const getActivityName = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    return activity?.name || 'Unknown';
  };

  if (loading) {
    return <div className="text-center py-8">Loading system settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeSystemTab} onValueChange={setActiveSystemTab} className="h-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="advisory-services" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Advisory Services
          </TabsTrigger>
          <TabsTrigger value="service-offerings" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Service Offerings
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="dropdown-values" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Access Levels
          </TabsTrigger>
          <TabsTrigger value="advisory-team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Advisory Team
          </TabsTrigger>
          <TabsTrigger value="email-settings" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="advisory-services" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="text-left">
                  <CardTitle className="text-left">Manage Advisory Services</CardTitle>
                  <CardDescription className="text-left">
                    Configure the main advisory service categories available in the system
                  </CardDescription>
                </div>
                <Dialog open={isServiceDialogOpen} onOpenChange={(open) => {
                  setIsServiceDialogOpen(open);
                  if (open && !editingService) {
                    // Clear errors when opening create dialog
                    setServiceFormErrors({ name: '' });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Advisory Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingService ? 'Edit Advisory Service' : 'Create New Advisory Service'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingService 
                          ? 'Edit advisory service information. Use "Save" to update only, or "Save and Proceed Next" to update and create service offerings.' 
                          : 'Add advisory service information. After saving, you\'ll be guided to create service offerings.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="service-name">Service Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="service-name"
                          value={serviceFormData.name}
                          onChange={(e) => {
                            setServiceFormData({ ...serviceFormData, name: e.target.value });
                            // Clear error when user starts typing
                            if (serviceFormErrors.name) {
                              setServiceFormErrors({ ...serviceFormErrors, name: '' });
                            }
                          }}
                          placeholder="Enter service name (required)"
                          className={serviceFormErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                          required
                        />
                        {serviceFormErrors.name && (
                          <p className="text-sm text-red-500 mt-1">{serviceFormErrors.name}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="service-description">Description</Label>
                        <Input
                          id="service-description"
                          value={serviceFormData.description}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="service-icon">Icon</Label>
                        <Input
                          id="service-icon"
                          value={serviceFormData.icon}
                          placeholder="e.g., Code, Lightbulb, Settings"
                          onChange={(e) => setServiceFormData({ ...serviceFormData, icon: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="service-display-order">Display Order</Label>
                        <Input
                          id="service-display-order"
                          type="number"
                          value={serviceFormData.display_order}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, display_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      {editingService ? (
                        // Edit mode: Show both buttons
                        <div className="flex gap-3">
                          <Button 
                            onClick={handleEditService} 
                            className="flex-1"
                          >
                            Save
                          </Button>
                          <Button 
                            onClick={handleEditServiceAndNext} 
                            className="flex-1"
                          >
                            Save and Proceed Next
                          </Button>
                        </div>
                      ) : (
                        // Create mode: Show only "Save and Proceed Next" button
                        <Button 
                          onClick={handleCreateServiceAndNext} 
                          className="w-full"
                        >
                          Save and Proceed Next
                        </Button>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Service Name</TableHead>
                    <TableHead className="text-center">Description</TableHead>
                    <TableHead className="text-center">Icon</TableHead>
                    <TableHead className="text-center">Order</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advisoryServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.description}</TableCell>
                      <TableCell>{service.icon}</TableCell>
                      <TableCell>{service.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={service.is_active ? 'default' : 'secondary'}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditServiceDialog(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Advisory Service</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{service.name}"? This will also delete all associated service offerings. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteService(service)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service-offerings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="text-left">
                  <CardTitle className="text-left">Manage Service Offerings</CardTitle>
                  <CardDescription className="text-left">
                    Configure specific offerings available for each advisory service
                  </CardDescription>
                </div>
                <Dialog open={isOfferingDialogOpen} onOpenChange={(open) => {
                  setIsOfferingDialogOpen(open);
                  if (open && !editingOffering) {
                    // Clear errors and reset multiple offerings when opening create dialog
                    setOfferingFormErrors({ advisory_service_id: '', name: '' });
                    setMultipleOfferings([{ name: '', description: '', icon: '', display_order: 0 }]);
                    setMultipleOfferingsErrors([{ name: '' }]);
                  }
                  if (!open) {
                    // Reset editing state when closing dialog
                    setEditingOffering(null);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Service Offering
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>
                        {editingOffering ? 'Edit Service Offering' : 'Add New Service Offering'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingOffering 
                          ? 'Edit service offering information. Use "Save" to update only, or "Save and Proceed Next" to update and add activities.' 
                          : 'Add new service offering information. After saving, you\'ll be guided to add activities.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2">
                      <div className="space-y-4">
                      {editingOffering ? (
                        // Edit mode: Single offering form
                        <>
                          <div>
                            <Label htmlFor="offering-service">Advisory Service <span className="text-red-500">*</span></Label>
                            <Select 
                              value={offeringFormData.advisory_service_id} 
                              onValueChange={(value) => {
                                setOfferingFormData({ ...offeringFormData, advisory_service_id: value });
                                // Clear error when user selects a value
                                if (offeringFormErrors.advisory_service_id) {
                                  setOfferingFormErrors({ ...offeringFormErrors, advisory_service_id: '' });
                                }
                              }}
                            >
                              <SelectTrigger className={offeringFormErrors.advisory_service_id ? 'border-red-500 focus:border-red-500' : ''}>
                                <SelectValue placeholder="Select advisory service (required)" />
                              </SelectTrigger>
                              <SelectContent>
                                {advisoryServices.map(service => (
                                  <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {offeringFormErrors.advisory_service_id && (
                              <p className="text-sm text-red-500 mt-1">{offeringFormErrors.advisory_service_id}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="offering-name">Offering Name <span className="text-red-500">*</span></Label>
                            <Input
                              id="offering-name"
                              value={offeringFormData.name}
                              onChange={(e) => {
                                setOfferingFormData({ ...offeringFormData, name: e.target.value });
                                // Clear error when user starts typing
                                if (offeringFormErrors.name) {
                                  setOfferingFormErrors({ ...offeringFormErrors, name: '' });
                                }
                              }}
                              placeholder="Enter offering name (required)"
                              className={offeringFormErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                              required
                            />
                            {offeringFormErrors.name && (
                              <p className="text-sm text-red-500 mt-1">{offeringFormErrors.name}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="offering-description">Description</Label>
                            <Input
                              id="offering-description"
                              value={offeringFormData.description}
                              onChange={(e) => setOfferingFormData({ ...offeringFormData, description: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="offering-icon">Icon</Label>
                            <Input
                              id="offering-icon"
                              value={offeringFormData.icon}
                              placeholder="e.g., FileCheck, Building, GitBranch"
                              onChange={(e) => setOfferingFormData({ ...offeringFormData, icon: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="offering-display-order">Display Order</Label>
                            <Input
                              id="offering-display-order"
                              type="number"
                              value={offeringFormData.display_order}
                              onChange={(e) => setOfferingFormData({ ...offeringFormData, display_order: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </>
                      ) : (
                        // Create mode: Single offering form
                        <>
                          <div>
                            <Label htmlFor="offering-service">Advisory Service <span className="text-red-500">*</span></Label>
                            <Select 
                              value={offeringFormData.advisory_service_id} 
                              onValueChange={(value) => {
                                setOfferingFormData({ ...offeringFormData, advisory_service_id: value });
                                // Clear error when user selects a value
                                if (offeringFormErrors.advisory_service_id) {
                                  setOfferingFormErrors({ ...offeringFormErrors, advisory_service_id: '' });
                                }
                              }}
                            >
                              <SelectTrigger className={offeringFormErrors.advisory_service_id ? 'border-red-500 focus:border-red-500' : ''}>
                                <SelectValue placeholder="Select advisory service (required)" />
                              </SelectTrigger>
                              <SelectContent>
                                {advisoryServices.map(service => (
                                  <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {offeringFormErrors.advisory_service_id && (
                              <p className="text-sm text-red-500 mt-1">{offeringFormErrors.advisory_service_id}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="offering-name">Offering Name <span className="text-red-500">*</span></Label>
                            <Input
                              id="offering-name"
                              value={offeringFormData.name}
                              onChange={(e) => {
                                setOfferingFormData({ ...offeringFormData, name: e.target.value });
                                // Clear error when user starts typing
                                if (offeringFormErrors.name) {
                                  setOfferingFormErrors({ ...offeringFormErrors, name: '' });
                                }
                              }}
                              placeholder="Enter offering name (required)"
                              className={offeringFormErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                              required
                            />
                            {offeringFormErrors.name && (
                              <p className="text-sm text-red-500 mt-1">{offeringFormErrors.name}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="offering-description">Description</Label>
                            <Input
                              id="offering-description"
                              value={offeringFormData.description}
                              onChange={(e) => setOfferingFormData({ ...offeringFormData, description: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="offering-icon">Icon</Label>
                            <Input
                              id="offering-icon"
                              value={offeringFormData.icon}
                              placeholder="e.g., FileCheck, Building, GitBranch"
                              onChange={(e) => setOfferingFormData({ ...offeringFormData, icon: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="offering-display-order">Display Order</Label>
                            <Input
                              id="offering-display-order"
                              type="number"
                              value={offeringFormData.display_order}
                              onChange={(e) => setOfferingFormData({ ...offeringFormData, display_order: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </>
                      )}
                      {editingOffering ? (
                        // Edit mode: Show both buttons
                        <div className="flex gap-3">
                          <Button 
                            onClick={handleEditOffering} 
                            className="flex-1"
                          >
                            Save
                          </Button>
                          <Button 
                            onClick={handleEditOfferingAndNext} 
                            className="flex-1"
                          >
                            Save and Proceed Next
                          </Button>
                        </div>
                      ) : (
                        // Create mode: Show only "Save and Proceed Next" button for single offering
                        <Button 
                          onClick={handleCreateOfferingAndNext} 
                          className="w-full"
                        >
                          Save and Proceed Next
                        </Button>
                      )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {advisoryServices.map(service => {
                  const currentServiceOfferings = serviceOfferings.filter(offering => offering.advisory_service_id === service.id);
                  return (
                    <div key={service.id}>
                      <h3 className="text-lg font-medium mb-3">{service.name}</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center">Offering Name</TableHead>
                            <TableHead className="text-center">Description</TableHead>
                            <TableHead className="text-center">Icon</TableHead>
                            <TableHead className="text-center">Order</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentServiceOfferings.map((offering) => (
                            <TableRow key={offering.id}>
                              <TableCell className="font-medium">{offering.name}</TableCell>
                              <TableCell>{offering.description}</TableCell>
                              <TableCell>{offering.icon}</TableCell>
                              <TableCell>{offering.display_order}</TableCell>
                              <TableCell>
                                <Badge variant={offering.is_active ? 'default' : 'secondary'}>
                                  {offering.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditOfferingDialog(offering)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Service Offering</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{offering.name}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteOffering(offering)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activities Management */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="text-left">
                    <CardTitle className="text-left">Manage Activities</CardTitle>
                    <CardDescription className="text-left">
                      Configure activities for each service offering
                    </CardDescription>
                  </div>
                  <Dialog open={isActivityDialogOpen} onOpenChange={(open) => {
                    setIsActivityDialogOpen(open);
                    if (open && !editingActivity) {
                      // Clear errors and reset multiple activities when opening create dialog
                      setMultipleActivities([{ name: '', estimated_hours: 0, display_order: 0 }]);
                      setMultipleActivitiesErrors([{ name: '' }]);
                    }
                    if (!open) {
                      // Reset editing state when closing dialog
                      setEditingActivity(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Activity
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>
                          {editingActivity ? 'Edit Activity' : 'Add New Activities'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingActivity 
                            ? 'Edit activity information.' 
                            : 'Add new activities for the selected service offering.'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto pr-2">
                        <div className="space-y-4">
                          {editingActivity ? (
                            // Edit mode: Single activity form
                            <>
                              <div>
                                <Label htmlFor="activity-advisory-service">Advisory Service</Label>
                                <Select 
                                  value={activityFormData.advisory_service_id} 
                                  onValueChange={(value) => {
                                    setActivityFormData({ 
                                      ...activityFormData, 
                                      advisory_service_id: value,
                                      service_offering_id: '' // Reset service offering when advisory service changes
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select advisory service" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {advisoryServices.map(service => (
                                      <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="activity-service-offering">Service Offering</Label>
                                <Select 
                                  value={activityFormData.service_offering_id} 
                                  onValueChange={(value) => setActivityFormData({ ...activityFormData, service_offering_id: value })}
                                  disabled={!activityFormData.advisory_service_id}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={!activityFormData.advisory_service_id ? "Select advisory service first" : "Select service offering"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {serviceOfferings
                                      .filter(offering => offering.advisory_service_id === activityFormData.advisory_service_id)
                                      .map(offering => (
                                        <SelectItem key={offering.id} value={offering.id}>{offering.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="activity-name">Activity Name</Label>
                                <Input
                                  id="activity-name"
                                  value={activityFormData.name}
                                  onChange={(e) => setActivityFormData({ ...activityFormData, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="activity-hours">Estimated Hours</Label>
                                <Input
                                  id="activity-hours"
                                  type="number"
                                  value={activityFormData.estimated_hours}
                                  onChange={(e) => setActivityFormData({ ...activityFormData, estimated_hours: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="activity-display-order">Display Order</Label>
                                <Input
                                  id="activity-display-order"
                                  type="number"
                                  value={activityFormData.display_order}
                                  onChange={(e) => setActivityFormData({ ...activityFormData, display_order: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <Button 
                                onClick={handleEditActivity} 
                                className="w-full"
                              >
                                Update Activity
                              </Button>
                            </>
                          ) : (
                            // Create mode: Multiple activities form
                            <>
                              <div>
                                <Label htmlFor="activity-advisory-service">Advisory Service <span className="text-red-500">*</span></Label>
                                <Select 
                                  value={activityFormData.advisory_service_id} 
                                  onValueChange={(value) => {
                                    setActivityFormData({ 
                                      ...activityFormData, 
                                      advisory_service_id: value,
                                      service_offering_id: '' // Reset service offering when advisory service changes
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select advisory service (required)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {advisoryServices.map(service => (
                                      <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label htmlFor="activity-service-offering">Service Offering <span className="text-red-500">*</span></Label>
                                <Select 
                                  value={activityFormData.service_offering_id} 
                                  onValueChange={(value) => setActivityFormData({ ...activityFormData, service_offering_id: value })}
                                  disabled={!activityFormData.advisory_service_id}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={!activityFormData.advisory_service_id ? "Select advisory service first" : "Select service offering (required)"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {serviceOfferings
                                      .filter(offering => offering.advisory_service_id === activityFormData.advisory_service_id)
                                      .map(offering => (
                                        <SelectItem key={offering.id} value={offering.id}>{offering.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-base font-medium">Activities <span className="text-red-500">*</span></Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addNewActivity}
                                    className="flex items-center gap-1"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add Activity
                                  </Button>
                                </div>
                                
                                {multipleActivities.map((activity, index) => (
                                  <div key={index} className="border rounded-lg p-4 space-y-3 relative">
                                    {multipleActivities.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeActivity(index)}
                                        className="absolute top-2 right-2 h-6 w-6 p-0"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                    
                                    <div>
                                      <Label htmlFor={`activity-name-${index}`}>Activity Name <span className="text-red-500">*</span></Label>
                                      <Input
                                        id={`activity-name-${index}`}
                                        value={activity.name}
                                        onChange={(e) => updateActivity(index, 'name', e.target.value)}
                                        placeholder="Enter activity name (required)"
                                        className={multipleActivitiesErrors[index]?.name ? 'border-red-500 focus:border-red-500' : ''}
                                        required
                                      />
                                      {multipleActivitiesErrors[index]?.name && (
                                        <p className="text-sm text-red-500 mt-1">{multipleActivitiesErrors[index].name}</p>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label htmlFor={`activity-hours-${index}`}>Estimated Hours</Label>
                                        <Input
                                          id={`activity-hours-${index}`}
                                          type="number"
                                          value={activity.estimated_hours}
                                          onChange={(e) => updateActivity(index, 'estimated_hours', parseInt(e.target.value) || 0)}
                                          placeholder="0"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`activity-display-order-${index}`}>Display Order</Label>
                                        <Input
                                          id={`activity-display-order-${index}`}
                                          type="number"
                                          value={activity.display_order}
                                          onChange={(e) => updateActivity(index, 'display_order', parseInt(e.target.value) || 0)}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <Button 
                                onClick={() => handleCreateMultipleActivitiesAndNext(activityFormData.advisory_service_id, activityFormData.service_offering_id)} 
                                className="w-full"
                              >
                                Save and Proceed Next
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceOfferings.map((offering) => {
                    const offeringActivities = activities.filter(activity => activity.service_offering_id === offering.id && activity.is_active);
                    if (offeringActivities.length === 0) return null;
                    
                    return (
                      <div key={offering.id}>
                        <h3 className="text-lg font-medium mb-3">{offering.name}</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Activity Name</TableHead>
                              <TableHead>Advisory Service</TableHead>
                              <TableHead>Estimated Hours</TableHead>
                              <TableHead>Order</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {offeringActivities.map((activity) => (
                              <TableRow key={activity.id}>
                                <TableCell className="font-medium">{activity.name}</TableCell>
                                <TableCell>{(activity as any).advisory_services?.name || 'N/A'}</TableCell>
                                <TableCell>{activity.estimated_hours}</TableCell>
                                <TableCell>{activity.display_order}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEditActivityDialog(activity)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Deactivate Activity</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to deactivate "{activity.name}"? This will also deactivate all associated sub-activities.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deleteActivity(activity)}>
                                            Deactivate
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Sub-Activities Management */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="text-left">
                    <CardTitle className="text-left">Manage Sub-Activities</CardTitle>
                    <CardDescription className="text-left">
                      Configure sub-activities for each activity
                    </CardDescription>
                  </div>
                  <Dialog open={isSubActivityDialogOpen} onOpenChange={(open) => {
                    setIsSubActivityDialogOpen(open);
                    if (open && !editingSubActivity) {
                      // Clear errors and reset multiple sub-activities when opening create dialog
                      setMultipleSubActivities([{ name: '', estimated_hours: 0, associated_tool: '', display_order: 0 }]);
                      setMultipleSubActivitiesErrors([{ name: '' }]);
                    }
                    if (!open) {
                      // Reset editing state when closing dialog
                      setEditingSubActivity(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Sub-Activity
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>
                          {editingSubActivity ? 'Edit Sub-Activity' : 'Add New Sub-Activities'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingSubActivity 
                            ? 'Edit sub-activity information.' 
                            : 'Add new sub-activities for the selected activity.'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto pr-2">
                        <div className="space-y-4">
                          {editingSubActivity ? (
                            // Edit mode: Single sub-activity form
                            <>
                              <div>
                                <Label htmlFor="subactivity-advisory-service">Advisory Service</Label>
                                <Select 
                                  value={subActivityFormData.advisory_service_id} 
                                  onValueChange={(value) => {
                                    setSubActivityFormData({ 
                                      ...subActivityFormData, 
                                      advisory_service_id: value,
                                      service_offering_id: '', // Reset service offering when advisory service changes
                                      activity_id: '' // Reset activity when advisory service changes
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select advisory service" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {advisoryServices.filter(s => s.is_active).map(service => (
                                      <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="subactivity-service-offering">Service Offering</Label>
                                <Select 
                                  value={subActivityFormData.service_offering_id} 
                                  onValueChange={(value) => {
                                    setSubActivityFormData({ 
                                      ...subActivityFormData, 
                                      service_offering_id: value,
                                      activity_id: '' // Reset activity when service offering changes
                                    });
                                  }}
                                  disabled={!subActivityFormData.advisory_service_id}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={!subActivityFormData.advisory_service_id ? "Select advisory service first" : "Select service offering"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {serviceOfferings
                                      .filter(offering => offering.advisory_service_id === subActivityFormData.advisory_service_id && offering.is_active)
                                      .map(offering => (
                                        <SelectItem key={offering.id} value={offering.id}>{offering.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="subactivity-activity">Activity</Label>
                                <Select 
                                  value={subActivityFormData.activity_id} 
                                  onValueChange={(value) => setSubActivityFormData({ ...subActivityFormData, activity_id: value })}
                                  disabled={!subActivityFormData.service_offering_id}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={!subActivityFormData.service_offering_id ? "Select service offering first" : "Select activity"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {activities
                                      .filter(activity => activity.service_offering_id === subActivityFormData.service_offering_id && activity.is_active)
                                      .map(activity => (
                                        <SelectItem key={activity.id} value={activity.id}>
                                          {activity.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="subactivity-name">Sub-Activity Name</Label>
                                <Input
                                  id="subactivity-name"
                                  value={subActivityFormData.name}
                                  onChange={(e) => setSubActivityFormData({ ...subActivityFormData, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="subactivity-hours">Estimated Hours</Label>
                                <Input
                                  id="subactivity-hours"
                                  type="number"
                                  value={subActivityFormData.estimated_hours}
                                  onChange={(e) => setSubActivityFormData({ ...subActivityFormData, estimated_hours: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="subactivity-tool">Associated Tool</Label>
                                <Input
                                  id="subactivity-tool"
                                  value={subActivityFormData.associated_tool}
                                  placeholder="e.g., SonarQube, Jenkins, etc."
                                  onChange={(e) => setSubActivityFormData({ ...subActivityFormData, associated_tool: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="subactivity-display-order">Display Order</Label>
                                <Input
                                  id="subactivity-display-order"
                                  type="number"
                                  value={subActivityFormData.display_order}
                                  onChange={(e) => setSubActivityFormData({ ...subActivityFormData, display_order: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <Button 
                                onClick={handleEditSubActivity} 
                                className="w-full"
                              >
                                Update Sub-Activity
                              </Button>
                            </>
                          ) : (
                            // Create mode: Single sub-activity form (for now)
                            <>
                              <div>
                                <Label htmlFor="subactivity-advisory-service">Advisory Service <span className="text-red-500">*</span></Label>
                                <Select 
                                  value={subActivityFormData.advisory_service_id} 
                                  onValueChange={(value) => {
                                    setSubActivityFormData({ 
                                      ...subActivityFormData, 
                                      advisory_service_id: value,
                                      service_offering_id: '', // Reset service offering when advisory service changes
                                      activity_id: '' // Reset activity when advisory service changes
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select advisory service (required)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {advisoryServices.filter(s => s.is_active).map(service => (
                                      <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="subactivity-service-offering">Service Offering <span className="text-red-500">*</span></Label>
                                <Select 
                                  value={subActivityFormData.service_offering_id} 
                                  onValueChange={(value) => {
                                    setSubActivityFormData({ 
                                      ...subActivityFormData, 
                                      service_offering_id: value,
                                      activity_id: '' // Reset activity when service offering changes
                                    });
                                  }}
                                  disabled={!subActivityFormData.advisory_service_id}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={!subActivityFormData.advisory_service_id ? "Select advisory service first" : "Select service offering (required)"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {serviceOfferings
                                      .filter(offering => offering.advisory_service_id === subActivityFormData.advisory_service_id && offering.is_active)
                                      .map(offering => (
                                        <SelectItem key={offering.id} value={offering.id}>{offering.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="subactivity-activity">Activity <span className="text-red-500">*</span></Label>
                                <Select 
                                  value={subActivityFormData.activity_id} 
                                  onValueChange={(value) => setSubActivityFormData({ ...subActivityFormData, activity_id: value })}
                                  disabled={!subActivityFormData.service_offering_id}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={!subActivityFormData.service_offering_id ? "Select service offering first" : "Select activity (required)"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {activities
                                      .filter(activity => activity.service_offering_id === subActivityFormData.service_offering_id && activity.is_active)
                                      .map(activity => (
                                        <SelectItem key={activity.id} value={activity.id}>
                                          {activity.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="subactivity-name">Sub-Activity Name <span className="text-red-500">*</span></Label>
                                <Input
                                  id="subactivity-name"
                                  value={subActivityFormData.name}
                                  onChange={(e) => setSubActivityFormData({ ...subActivityFormData, name: e.target.value })}
                                  placeholder="Enter sub-activity name (required)"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="subactivity-hours">Estimated Hours</Label>
                                <Input
                                  id="subactivity-hours"
                                  type="number"
                                  value={subActivityFormData.estimated_hours}
                                  onChange={(e) => setSubActivityFormData({ ...subActivityFormData, estimated_hours: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="subactivity-tool">Associated Tool</Label>
                                <Input
                                  id="subactivity-tool"
                                  value={subActivityFormData.associated_tool}
                                  placeholder="e.g., SonarQube, Jenkins, etc."
                                  onChange={(e) => setSubActivityFormData({ ...subActivityFormData, associated_tool: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="subactivity-display-order">Display Order</Label>
                                <Input
                                  id="subactivity-display-order"
                                  type="number"
                                  value={subActivityFormData.display_order}
                                  onChange={(e) => setSubActivityFormData({ ...subActivityFormData, display_order: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <Button 
                                onClick={handleCreateSubActivity} 
                                className="w-full"
                              >
                                Create Sub-Activity
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.filter(a => a.is_active).map((activity) => {
                    const activitySubActivities = subActivities.filter(sub => sub.activity_id === activity.id && sub.is_active);
                    if (activitySubActivities.length === 0) return null;
                    
                    return (
                      <div key={activity.id}>
                        <h3 className="text-lg font-medium mb-3">
                          {activity.name} 
                          <span className="text-sm text-muted-foreground ml-2">
                            ({getServiceOfferingName(activity.service_offering_id)})
                          </span>
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Sub-Activity Name</TableHead>
                              <TableHead>Hours</TableHead>
                              <TableHead>Associated Tool</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activitySubActivities.map((subActivity) => (
                              <TableRow key={subActivity.id}>
                                <TableCell className="font-medium">{subActivity.name}</TableCell>
                                <TableCell>{subActivity.estimated_hours}</TableCell>
                                <TableCell>{subActivity.associated_tool || '-'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEditSubActivityDialog(subActivity)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Deactivate Sub-Activity</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to deactivate "{subActivity.name}"?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deleteSubActivity(subActivity)}>
                                            Deactivate
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dropdown-values" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <CardTitle>Manage Access Levels</CardTitle>
                  <CardDescription>
                    Configure access levels for users throughout the system
                  </CardDescription>
                </div>
                <Dialog open={isDropdownDialogOpen} onOpenChange={setIsDropdownDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Dropdown Value
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingDropdownValue ? 'Edit Dropdown Value' : 'Create New Dropdown Value'}
                      </DialogTitle>
                      <DialogDescription>
                        Add or edit dropdown options for form fields.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select 
                          value={dropdownFormData.category} 
                          onValueChange={(value) => setDropdownFormData({ ...dropdownFormData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {dropdownCategories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="value">Value</Label>
                        <Input
                          id="value"
                          value={dropdownFormData.value}
                          onChange={(e) => setDropdownFormData({ ...dropdownFormData, value: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="display_order">Display Order</Label>
                        <Input
                          id="display_order"
                          type="number"
                          value={dropdownFormData.display_order}
                          onChange={(e) => setDropdownFormData({ ...dropdownFormData, display_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <Button 
                        onClick={editingDropdownValue ? handleEditDropdownValue : handleCreateDropdownValue} 
                        className="w-full"
                      >
                        {editingDropdownValue ? 'Update Value' : 'Create Value'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {dropdownCategories.map(category => {
                  const categoryValues = dropdownValues.filter(item => item.category === category.value);
                  return (
                    <div key={category.value}>
                      <h3 className="text-lg font-medium mb-3">{category.label}</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Value</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryValues.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.value}</TableCell>
                              <TableCell>{item.display_order}</TableCell>
                              <TableCell>
                                <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                  {item.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditDropdownDialog(item)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Edit Dropdown Value</DialogTitle>
                                        <DialogDescription>
                                          Update the dropdown value information.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="edit-category">Category</Label>
                                          <Select 
                                            value={dropdownFormData.category} 
                                            onValueChange={(value) => setDropdownFormData({ ...dropdownFormData, category: value })}
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {dropdownCategories.map(cat => (
                                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-value">Value</Label>
                                          <Input
                                            id="edit-value"
                                            value={dropdownFormData.value}
                                            onChange={(e) => setDropdownFormData({ ...dropdownFormData, value: e.target.value })}
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-display_order">Display Order</Label>
                                          <Input
                                            id="edit-display_order"
                                            type="number"
                                            value={dropdownFormData.display_order}
                                            onChange={(e) => setDropdownFormData({ ...dropdownFormData, display_order: parseInt(e.target.value) || 0 })}
                                          />
                                        </div>
                                        <Button onClick={handleEditDropdownValue} className="w-full">
                                          Save Changes
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Dropdown Value</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{item.value}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteDropdownValue(item)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advisory-team" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <CardTitle>Advisory Team Management</CardTitle>
                  <CardDescription>
                    Manage advisory team members for assignment purposes
                  </CardDescription>
                </div>
                <Dialog open={isTeamDialogOpen} onOpenChange={(open) => {
                  setIsTeamDialogOpen(open);
                  if (!open && onClearPrefillData) {
                    onClearPrefillData();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Team Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTeamMember ? 'Edit Team Member' : 'Add New Team Member'}
                      </DialogTitle>
                      <DialogDescription>
                        Add or edit advisory team member information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={teamFormData.name}
                          onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Select 
                          value={teamFormData.title} 
                          onValueChange={(value) => setTeamFormData({ ...teamFormData, title: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Advisory Consultant">Advisory Consultant</SelectItem>
                            <SelectItem value="Advisory Service Lead">Advisory Service Lead</SelectItem>
                            <SelectItem value="Advisory Service Head">Advisory Service Head</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="designation">Designation</Label>
                        <Select 
                          value={teamFormData.designation} 
                          onValueChange={(value) => setTeamFormData({ ...teamFormData, designation: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select designation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Programmer Analyst">Programmer Analyst</SelectItem>
                            <SelectItem value="Associate">Associate</SelectItem>
                            <SelectItem value="Senior Associate">Senior Associate</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Senior Manager">Senior Manager</SelectItem>
                            <SelectItem value="Associate Director">Associate Director</SelectItem>
                            <SelectItem value="Director">Director</SelectItem>
                            <SelectItem value="Senior Director">Senior Director</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={teamFormData.email}
                          onChange={(e) => setTeamFormData({ ...teamFormData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="rate_per_hour">Rate/hour ($)</Label>
                        <Input
                          id="rate_per_hour"
                          type="number"
                          step="0.01"
                          min="0"
                          value={teamFormData.rate_per_hour}
                          onChange={(e) => setTeamFormData({ ...teamFormData, rate_per_hour: e.target.value })}
                          placeholder="Enter hourly rate"
                        />
                      </div>
                      <div>
                        <Label htmlFor="advisory-services">Advisory Services</Label>
                        <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                          {advisoryServices.map(service => (
                            <div key={service.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`service-${service.id}`}
                                checked={teamFormData.advisory_services.includes(service.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTeamFormData({ 
                                      ...teamFormData, 
                                      advisory_services: [...teamFormData.advisory_services, service.id] 
                                    });
                                  } else {
                                    setTeamFormData({ 
                                      ...teamFormData, 
                                      advisory_services: teamFormData.advisory_services.filter(id => id !== service.id),
                                      expertise: teamFormData.expertise.filter(expId => {
                                        const offering = serviceOfferings.find(o => o.id === expId);
                                        return offering?.advisory_service_id !== service.id;
                                      })
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`service-${service.id}`} className="text-sm">
                                {service.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="expertise">Expertise (Service Offerings)</Label>
                        {teamFormData.advisory_services.length > 0 ? (
                          <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                            {serviceOfferings
                              .filter(offering => teamFormData.advisory_services.includes(offering.advisory_service_id))
                              .map(offering => (
                                <div key={offering.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`offering-${offering.id}`}
                                    checked={teamFormData.expertise.includes(offering.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setTeamFormData({ 
                                          ...teamFormData, 
                                          expertise: [...teamFormData.expertise, offering.id] 
                                        });
                                      } else {
                                        setTeamFormData({ 
                                          ...teamFormData, 
                                          expertise: teamFormData.expertise.filter(id => id !== offering.id)
                                        });
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`offering-${offering.id}`} className="text-sm">
                                    {offering.name}
                                  </Label>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground border rounded-md p-3">
                            Please select advisory services first to see available expertise areas.
                          </p>
                        )}
                      </div>
                      <Button 
                        onClick={editingTeamMember ? handleEditTeamMember : handleCreateTeamMember} 
                        className="w-full"
                      >
                        {editingTeamMember ? 'Update Member' : 'Add Member'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rate/hour</TableHead>
                    <TableHead>Advisory Services</TableHead>
                    <TableHead>Expertise</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTeamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.title}</TableCell>
                      <TableCell>{member.designation || 'Not Specified'}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.rate_per_hour ? `$${member.rate_per_hour}` : 'Not Set'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.advisory_services?.map(serviceId => {
                            const service = advisoryServices.find(s => s.id === serviceId);
                            return service ? (
                              <Badge key={serviceId} variant="secondary" className="text-xs">
                                {service.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.expertise?.map(offeringId => {
                            const offering = serviceOfferings.find(o => o.id === offeringId);
                            return offering ? (
                              <Badge key={offeringId} variant="outline" className="text-xs">
                                {offering.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? 'default' : 'secondary'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              openEditTeamMemberDialog(member);
                              setIsTeamDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {member.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTeamMember(member)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {advisoryTeamMembers.length > itemsPerPage && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>
                Configure system email settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="team-dl-email">Advisory Service Team Distribution List Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="team-dl-email"
                      type="email"
                      value={teamDlEmail}
                      onChange={(e) => setTeamDlEmail(e.target.value)}
                      placeholder="Enter team distribution list email"
                      className="flex-1"
                    />
                    <Button onClick={saveTeamDlEmail}>
                      Save
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    This email will be used for sending notifications to the advisory team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};