import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  CalendarIcon, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  User, 
  Building, 
  Mail, 
  FileText, 
  Upload,
  Clock,
  UserCheck,
  Send,
  Eye,
  LogIn
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRequestSubmission } from '@/hooks/useRequestSubmission';
import LoginPromptDialog from '@/components/LoginPromptDialog';
import AIAssistant from '@/components/AIAssistant';
import { useNavigate } from 'react-router-dom';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import RestoreFormDialog from '@/components/RestoreFormDialog';

interface MultiServiceRequestFormProps {
  selectedServices: string[];
  selectedOfferings: Record<string, string[]>;
  advisoryServices: Array<{
    id: string;
    title: string;
    offerings: Array<{ id: string; name: string; icon: any }>;
  }>;
  onClose: () => void;
  onSuccess: () => void;
  isOpen: boolean;
  onViewRequest?: (requestId: string) => void;
  restoredFormData?: any;
}

const projectDataSchema = z.object({
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  accountName: z.string().min(1, 'Account Name is required'),
  projectOwningUnit: z.string().optional(),
  deliveryExcellencePOC: z.string().optional(),
  projectPM: z.string().regex(/^\d+$/, 'Project PM ID must contain only numeric values').min(1, 'Project PM ID is required'),
  projectPOCEmail: z.string().min(1, 'Project POC ID is required'),
  lob: z.string().optional(),
  vertical: z.string().optional(),
  businessUnit: z.string().optional(),
  marketUnit: z.string().optional(),
});

const serviceRequirementSchema = z.object({
  expectedStartDate: z.date({
    required_error: 'Expected start date is required',
  }),
  requirementDetails: z.string().min(1, 'Requirement details are required'),
  expectedBusinessImpact: z.string().optional(),
  attachment: z.string().optional(),
});

type ProjectDataForm = z.infer<typeof projectDataSchema>;
type ServiceRequirementForm = z.infer<typeof serviceRequirementSchema>;

export default function MultiServiceRequestForm({ 
  selectedServices, 
  selectedOfferings, 
  advisoryServices,
  onClose, 
  onSuccess,
  isOpen,
  onViewRequest,
  restoredFormData
}: MultiServiceRequestFormProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const [projectData, setProjectData] = useState<ProjectDataForm | null>(null);
  const [serviceRequirements, setServiceRequirements] = useState<Record<string, ServiceRequirementForm>>({});
  const [showAcknowledgement, setShowAcknowledgement] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [assignments, setAssignments] = useState<Array<{
    requestId: string;
    serviceId: string;
    serviceName: string;
    consultant: string;
  }>>([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();
  const { submitMultipleRequests, isSubmitting } = useRequestSubmission();
  const navigate = useNavigate();
  const { saveFormData, loadFormData, clearFormData, checkForRestoredData } = useFormPersistence({
    formType: 'multi_service'
  });

  const totalPages = 1 + selectedServices.length; // Project Data + one page per service
  const progress = ((currentPage - 1) / (totalPages - 1)) * 100;

  // Check authentication status and restore form data
  useEffect(() => {
    const checkAuthAndRestore = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      if (user) {
        // User is logged in, check for saved form data
        const restoredData = await checkForRestoredData();
        if (restoredData && isOpen) {
          setShowRestoreDialog(true);
          setPendingFormData(restoredData);
        }
      } else if (isOpen && !restoredFormData) {
        // Anonymous user, try to load existing form data
        const savedData = await loadFormData();
        if (savedData) {
          restoreFormData(savedData);
        }
      }

      // Handle restored form data passed as prop
      if (restoredFormData && isOpen) {
        restoreFormData(restoredFormData);
      }
    };

    if (isOpen) {
      checkAuthAndRestore();
    }
  }, [isOpen, checkForRestoredData, loadFormData, restoredFormData]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session?.user);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // User just logged in, check for saved form data
        const restoredData = await checkForRestoredData();
        if (restoredData && isOpen) {
          setShowRestoreDialog(true);
          setPendingFormData(restoredData);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [isOpen, checkForRestoredData]);

  // Restore form data helper
  const restoreFormData = (savedData: any) => {
    if (savedData.currentPage) setCurrentPage(savedData.currentPage);
    if (savedData.currentServiceIndex) setCurrentServiceIndex(savedData.currentServiceIndex);
    if (savedData.projectData) setProjectData(savedData.projectData);
    if (savedData.serviceRequirements) setServiceRequirements(savedData.serviceRequirements);
    if (savedData.projectFormData) projectForm.reset(savedData.projectFormData);
    if (savedData.serviceFormData) serviceForm.reset(savedData.serviceFormData);
  };

  // Handle immediate submission of restored form data from parent component
  useEffect(() => {
    if (restoredFormData && isAuthenticated && isOpen) {
      restoreFormData(restoredFormData);
      
      // If we have complete data, trigger immediate submission
      if (restoredFormData.projectData && restoredFormData.serviceRequirements) {
        setTimeout(() => {
          // Get the last service requirement to pass to final submission
          const lastServiceId = selectedServices[selectedServices.length - 1];
          const lastServiceRequirement = restoredFormData.serviceRequirements[lastServiceId];
          if (lastServiceRequirement) {
            handleFinalSubmission(lastServiceRequirement);
          }
        }, 1000); // Small delay to ensure state is properly set
      }
    }
  }, [restoredFormData, isAuthenticated, isOpen]);

  const handleRestoreFormData = () => {
    if (pendingFormData) {
      restoreFormData(pendingFormData);
      setPendingFormData(null);
    }
    setShowRestoreDialog(false);
  };

  const handleCancelRestore = async () => {
    await clearFormData();
    setPendingFormData(null);
    setShowRestoreDialog(false);
  };

  const projectForm = useForm<ProjectDataForm>({
    resolver: zodResolver(projectDataSchema),
    defaultValues: {
      projectId: '',
      projectName: '',
      accountName: '',
      projectOwningUnit: '',
      deliveryExcellencePOC: '',
      projectPM: '',
      projectPOCEmail: '',
      lob: '',
      vertical: '',
      businessUnit: '',
      marketUnit: '',
    },
  });

  const serviceForm = useForm<ServiceRequirementForm>({
    resolver: zodResolver(serviceRequirementSchema),
    defaultValues: {
      requirementDetails: '',
      expectedBusinessImpact: '',
      attachment: '',
    },
  });

  // Save form data for anonymous users
  useEffect(() => {
    if (isAuthenticated === false && isOpen && (projectData || Object.keys(serviceRequirements).length > 0 || projectForm.formState.isDirty || serviceForm.formState.isDirty)) {
      const formData = {
        currentPage,
        currentServiceIndex,
        projectData,
        serviceRequirements,
        projectFormData: projectForm.getValues(),
        serviceFormData: serviceForm.getValues(),
        selectedServices,
        selectedOfferings
      };
      saveFormData(formData);
    }
  }, [currentPage, currentServiceIndex, projectData, serviceRequirements, isAuthenticated, isOpen, saveFormData, selectedServices, selectedOfferings]);

  // Auto-assignment logic for each service
  const autoAssignConsultant = async (serviceId: string, offerings: string[]) => {
    try {
      // Get all active advisory consultants
    const { data: allTeamMembers, error: consultantsError } = await supabase
        .rpc('get_team_members_for_app');

      if (consultantsError) {
        console.error('Error fetching consultants:', consultantsError);
        return null;
      }

      // Filter for Advisory Consultants only
      const consultants = (Array.isArray(allTeamMembers) ? allTeamMembers : []).filter(member => member.title === 'Advisory Consultant');

      if (consultants.length === 0) {
        console.log('No active advisory consultants found');
        return null;
      }

      // Filter consultants by expertise matching selected offerings
      const matchingConsultants = consultants.filter(consultant => {
        if (!consultant.expertise || consultant.expertise.length === 0) {
          return false;
        }
        
        // Check if any consultant expertise matches any selected offering
        return offerings.some(offering => 
          consultant.expertise.some((expertise: string) => 
            expertise.toLowerCase().includes(offering.toLowerCase()) ||
            offering.toLowerCase().includes(expertise.toLowerCase())
          )
        );
      });

      if (matchingConsultants.length === 0) {
        console.log('No consultants found matching expertise:', offerings);
        // If no expertise match, return any consultant (fallback)
        // Since we're using basic view without user_id, we'll match by name
        const { data: requestCounts } = await supabase
          .from('requests')
          .select('current_assignee_name')
          .in('current_assignee_name', consultants.map(c => c.name))
          .not('current_assignee_name', 'is', null);

        const consultantRequestCounts = consultants.map(consultant => ({
          ...consultant,
          requestCount: requestCounts?.filter(r => r.current_assignee_name === consultant.name).length || 0
        }));

        // Sort by lowest request count
        consultantRequestCounts.sort((a, b) => a.requestCount - b.requestCount);
        return consultantRequestCounts[0];
      }

      // Count current requests for each matching consultant
      const { data: requestCounts, error: requestCountsError } = await supabase
        .from('requests')
        .select('current_assignee_name')
        .in('current_assignee_name', matchingConsultants.map(c => c.name))
        .not('current_assignee_name', 'is', null);

      if (requestCountsError) {
        console.error('Error fetching request counts:', requestCountsError);
        // Return first matching consultant as fallback
        return matchingConsultants[0];
      }

      // Calculate request counts for each consultant
      const consultantRequestCounts = matchingConsultants.map(consultant => ({
        ...consultant,
        requestCount: requestCounts?.filter(r => r.current_assignee_name === consultant.name).length || 0
      }));

      // Sort by lowest request count
      consultantRequestCounts.sort((a, b) => a.requestCount - b.requestCount);
      
      console.log('Auto-assignment result:', {
        serviceId,
        offerings,
        selectedConsultant: consultantRequestCounts[0]?.name,
        requestCount: consultantRequestCounts[0]?.requestCount
      });

      return consultantRequestCounts[0];
    } catch (error) {
      console.error('Error in auto-assignment:', error);
      return null;
    }
  };

  // Generate request ID
  const generateRequestId = (serviceId: string) => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 3);
    const servicePrefix = serviceId.split('-').map(word => word[0].toUpperCase()).join('');
    return `${servicePrefix}-${timestamp}-${random}`.toUpperCase();
  };

  const handleProjectDataSubmit = (data: ProjectDataForm) => {
    setProjectData(data);
    setCurrentPage(2);
    setCurrentServiceIndex(0);
  };

  const handleServiceRequirementSubmit = (data: ServiceRequirementForm) => {
    const currentServiceId = selectedServices[currentServiceIndex];
    setServiceRequirements(prev => ({
      ...prev,
      [currentServiceId]: data
    }));

    if (currentServiceIndex < selectedServices.length - 1) {
      // Move to next service
      setCurrentServiceIndex(currentServiceIndex + 1);
      setCurrentPage(currentPage + 1);
      serviceForm.reset();
    } else {
      // All services completed, check authentication before submission
      if (isAuthenticated) {
        handleFinalSubmission(data);
      } else {
        // Save data and redirect to login
        const formData = {
          currentPage,
          currentServiceIndex,
          projectData,
          serviceRequirements: { ...serviceRequirements, [currentServiceId]: data },
          projectFormData: projectForm.getValues(),
          serviceFormData: serviceForm.getValues(),
          selectedServices,
          selectedOfferings
        };
        saveFormData(formData);
        navigate('/login');
      }
    }
  };

  const handleSignInToSubmit = () => {
    const formData = {
      currentPage,
      currentServiceIndex,
      projectData,
      serviceRequirements,
      projectFormData: projectForm.getValues(),
      serviceFormData: serviceForm.getValues(),
      selectedServices,
      selectedOfferings
    };
    saveFormData(formData);
    navigate('/login');
  };

  const handleFinalSubmission = async (lastServiceData: ServiceRequirementForm) => {
    if (!projectData) return;

    try {
      const allRequirements = {
        ...serviceRequirements,
        [selectedServices[currentServiceIndex]]: lastServiceData
      };

      const requestsToSubmit = [];

      // Create requests for each service - let database handle auto-assignment
      for (const serviceId of selectedServices) {
        const serviceOfferings = selectedOfferings[serviceId] || [];
        const requestId = generateRequestId(serviceId);
        const service = advisoryServices.find(s => s.id === serviceId);
        const requirements = allRequirements[serviceId];

        if (service && requirements) {
          requestsToSubmit.push({
            projectData,
            serviceRequirement: requirements,
            serviceId,
            serviceName: service.title,
            selectedOfferings: serviceOfferings,
            requestId,
            assignedConsultant: '', // Will be set by database trigger
            assignedConsultantId: undefined, // Will be set by database trigger
          });
        }
      }

      // Submit to database - auto-assignment will happen via trigger
      const result = await submitMultipleRequests(requestsToSubmit);

      if (result.success) {
        // Clear saved form data on successful submission
        clearFormData();
        
        // Fetch the created requests to get assignment info for acknowledgement
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: createdRequests } = await supabase
            .from('requests')
            .select('request_id, current_assignee_name, advisory_services')
            .eq('requestor_id', user.id)
            .in('request_id', requestsToSubmit.map(r => r.requestId));

          if (createdRequests) {
            const newAssignments = createdRequests.map(request => {
              const service = advisoryServices.find(s => s.id === request.advisory_services[0]);
              return {
                requestId: request.request_id,
                serviceId: request.advisory_services[0],
                serviceName: service?.title || 'Unknown Service',
                consultant: request.current_assignee_name || 'Auto-assigned'
              };
            });
            setAssignments(newAssignments);
          }
        }
        
        setShowAcknowledgement(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit requests. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setCurrentPage(1);
    setCurrentServiceIndex(0);
    setProjectData(null);
    setServiceRequirements({});
    setShowAcknowledgement(false);
    setAssignments([]);
    projectForm.reset();
    serviceForm.reset();
    // Clear form data when closing
    clearFormData();
    onClose();
    if (showAcknowledgement) {
      onSuccess();
    }
  };

  const currentService = selectedServices[currentServiceIndex];
  const currentServiceData = advisoryServices.find(s => s.id === currentService);
  const currentServiceOfferings = selectedOfferings[currentService] || [];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6 text-primary" />
            Multi-Service Request Submission
          </DialogTitle>
          <DialogDescription className="text-lg">
            Complete the forms for each selected advisory service
          </DialogDescription>
        </DialogHeader>

        {showAcknowledgement ? (
          // Acknowledgement Screen
          <div className="space-y-6">
            <Card className="bg-gradient-stats text-white border-0 shadow-hero">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <CheckCircle className="h-8 w-8" />
                  Requests Submitted Successfully!
                </CardTitle>
                <CardDescription className="text-white/90 text-lg">
                  Your advisory service requests have been submitted and assigned to consultants
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="space-y-4">
              {assignments.map((assignment, index) => {
                const serviceOfferings = selectedOfferings[assignment.serviceId] || [];
                const service = advisoryServices.find(s => s.id === assignment.serviceId);
                
                return (
                  <Card key={assignment.requestId} className="bg-gradient-card border-0 shadow-colored">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-primary mb-2">
                            {assignment.serviceName}
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Request ID:</span> {assignment.requestId}</p>
                            <p><span className="font-medium">Assigned Consultant:</span> {assignment.consultant}</p>
                            {serviceOfferings.length > 0 && (
                              <div>
                                <span className="font-medium">Selected Offerings:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {serviceOfferings.map(offeringId => {
                                    const offering = service?.offerings.find(o => o.id === offeringId);
                                    return offering ? (
                                      <Badge key={offeringId} variant="secondary" className="text-xs">
                                        {offering.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            // Check if user is authenticated
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) {
                              setShowLoginPrompt(true);
                              return;
                            }
                            if (onViewRequest) {
                              onViewRequest(assignment.requestId);
                            }
                            handleClose();
                          }}
                          className="gap-2 ml-4"
                        >
                          <Eye className="h-4 w-4" />
                          View Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-center gap-4">
              <Button onClick={handleClose} className="bg-primary text-white hover:bg-primary-hover px-6">
                Close
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  handleClose();
                  // This would trigger creating another request
                }}
                className="px-6"
              >
                Create Another Request
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Progress Indicator */}
            <Card className="bg-gradient-card border-0 shadow-colored">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">
                      {currentPage === 1 ? 'Project Data' : `${currentServiceData?.title} Requirements`}
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">
                      Step {currentPage} of {totalPages} ({Math.round(progress)}% Complete)
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={progress} className="h-3 bg-muted" />
                    <div className="absolute inset-0 bg-gradient-primary rounded-full opacity-20 animate-pulse" 
                         style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Page 1: Project Data */}
            {currentPage === 1 && (
              <Form {...projectForm}>
                <form onSubmit={projectForm.handleSubmit(handleProjectDataSubmit)} className="space-y-6">
                  <Card className="border-0 shadow-colored">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <Building className="h-6 w-6 text-primary" />
                        Project Data (Common for All Services)
                      </CardTitle>
                      <CardDescription className="text-lg">
                        This information will be used for all selected advisory services
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Mandatory Fields */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-destructive">* Required Fields</h4>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={projectForm.control}
                            name="projectId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Project ID</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter project ID" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={projectForm.control}
                            name="projectName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Project Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter project name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={projectForm.control}
                            name="accountName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Account Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter account name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={projectForm.control}
                            name="projectOwningUnit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Project Owning Unit</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter owning unit" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={projectForm.control}
                            name="deliveryExcellencePOC"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Delivery Excellence POC</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter POC name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={projectForm.control}
                            name="projectPM"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Project PM ID *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter PM ID (numeric)" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={projectForm.control}
                          name="projectPOCEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project POC ID *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter POC ID" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator />

                      {/* Project Optional Fields */}
                      <div className="space-y-4">
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={projectForm.control}
                            name="lob"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LOS</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter LOS" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={projectForm.control}
                            name="vertical"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vertical</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter vertical" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={projectForm.control}
                            name="businessUnit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Unit</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter business unit" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={projectForm.control}
                            name="marketUnit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Market Unit</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter market unit" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button type="submit" className="bg-primary text-white hover:bg-primary-hover px-6">
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Service-specific pages */}
            {currentPage > 1 && currentServiceData && (
              <Form {...serviceForm}>
                <form onSubmit={serviceForm.handleSubmit(handleServiceRequirementSubmit)} className="space-y-6">
                  {/* Service Summary */}
                  <Card className="bg-gradient-card border-0 shadow-colored">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-sm px-3 py-1 bg-gradient-primary text-white">
                            {currentServiceData.title}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Service {currentServiceIndex + 1} of {selectedServices.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentServiceOfferings.map(offeringId => {
                            const offering = currentServiceData.offerings.find(o => o.id === offeringId);
                            return offering ? (
                              <Badge key={offeringId} variant="outline" className="text-sm px-3 py-1">
                                {offering.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-colored">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <FileText className="h-6 w-6 text-primary" />
                        {currentServiceData.title} - Requirement Details
                      </CardTitle>
                      <CardDescription className="text-lg">
                        Please provide specific requirements for this advisory service
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={serviceForm.control}
                          name="expectedStartDate"
                          render={({ field }) => {
                            const [open, setOpen] = useState(false);
                            
                            return (
                              <FormItem className="flex flex-col">
                                <FormLabel>Expected Start Date *</FormLabel>
                                <Popover open={open} onOpenChange={setOpen}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                     <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={(date) => {
                                        field.onChange(date);
                                        setOpen(false); // Close popover immediately after selection
                                      }}
                                      disabled={(date) =>
                                        date < new Date()
                                      }
                                      initialFocus
                                      className={cn("p-3 pointer-events-auto")}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />

                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Selected Offerings</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {currentServiceOfferings.map(offeringId => {
                                const offering = currentServiceData.offerings.find(o => o.id === offeringId);
                                return offering ? (
                                  <Badge key={offeringId} variant="secondary" className="text-xs">
                                    {offering.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                       <FormField
                         control={serviceForm.control}
                         name="requirementDetails"
                         render={({ field }) => {
                           const selectedOfferingNames = currentServiceOfferings.map(offeringId => {
                             const offering = currentServiceData?.offerings.find(o => o.id === offeringId);
                             return offering?.name || offeringId;
                           });

                           const generatePlaceholder = () => {
                             if (selectedOfferingNames.length > 1) {
                               return selectedOfferingNames.map((name, index) => 
                                 `Section ${index + 1} - ${name}:\n[Describe your specific requirements for ${name}...]\n`
                               ).join('\n');
                             }
                             return `Describe your specific requirements for ${currentServiceData?.title}...`;
                           };

                           const generateInitialValue = () => {
                             if (selectedOfferingNames.length > 1 && !field.value) {
                               return selectedOfferingNames.map((name, index) => 
                                 `Section ${index + 1} - ${name}:\n\n`
                               ).join('\n');
                             }
                             return field.value;
                           };

                           return (
                             <FormItem>
                               <FormLabel className="flex items-center gap-2">
                                 Requirement Details *
                                 <AIAssistant
                                   onTextUpdate={field.onChange}
                                   currentText={field.value}
                                   selectedServiceId={currentService}
                                   selectedOfferings={currentServiceOfferings}
                                   placeholder={generatePlaceholder()}
                                 />
                               </FormLabel>
                               {selectedOfferingNames.length > 1 && (
                                 <div className="text-sm text-muted-foreground mb-2 p-3 bg-muted/50 rounded-md">
                                   <strong>Multiple offerings selected:</strong> Please provide requirements for each offering in separate sections below.
                                   <div className="mt-2 flex flex-wrap gap-2">
                                     {selectedOfferingNames.map((name, index) => (
                                       <Badge key={index} variant="outline" className="text-xs">
                                         Section {index + 1}: {name}
                                       </Badge>
                                     ))}
                                   </div>
                                 </div>
                               )}
                               <FormControl>
                                 <Textarea 
                                   placeholder={generatePlaceholder()}
                                   className="min-h-[120px]"
                                   value={generateInitialValue()}
                                   onChange={(e) => field.onChange(e.target.value)}
                                 />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           );
                         }}
                       />

                      <FormField
                        control={serviceForm.control}
                        name="expectedBusinessImpact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expected Business Impact</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the expected business impact..."
                                className="min-h-[80px]"
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={serviceForm.control}
                        name="attachment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Attachment</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input 
                                  placeholder="Upload file or provide link"
                                  {...field} 
                                />
                                <Button type="button" variant="outline" size="icon">
                                  <Upload className="h-4 w-4" />
                                </Button>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        if (currentPage === 2) {
                          setCurrentPage(1);
                        } else {
                          setCurrentServiceIndex(currentServiceIndex - 1);
                          setCurrentPage(currentPage - 1);
                        }
                        serviceForm.reset();
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    {currentServiceIndex < selectedServices.length - 1 ? (
                      <Button type="submit" className="bg-primary text-white hover:bg-primary-hover px-6">
                        Proceed to Next Service
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <>
                        {isAuthenticated ? (
                          <Button type="submit" className="bg-primary text-white hover:bg-primary-hover px-6">
                            Place Request & Assign
                            <Send className="h-4 w-4 ml-2" />
                          </Button>
                        ) : (
                          <Button 
                            type="button" 
                            onClick={handleSignInToSubmit}
                            className="bg-gradient-primary text-white hover:shadow-glow hover:scale-105 transition-all duration-300 px-8 py-3 text-lg font-semibold border-2 border-primary/20 shadow-elegant"
                          >
                            <LogIn className="h-5 w-5 mr-2" />
                            Sign in to Submit Request
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </form>
              </Form>
            )}
          </>
        )}
        
        <LoginPromptDialog 
          open={showLoginPrompt} 
          onOpenChange={setShowLoginPrompt} 
        />
        
        <RestoreFormDialog
          isOpen={showRestoreDialog}
          onPlaceRequest={handleRestoreFormData}
          onCancel={handleCancelRestore}
        />
      </DialogContent>
    </Dialog>
  );
}