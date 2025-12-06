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
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRequestSubmission } from '@/hooks/useRequestSubmission';
import { supabase } from '@/integrations/supabase/client';
import LoginPromptDialog from '@/components/LoginPromptDialog';
import AIAssistant from '@/components/AIAssistant';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import RestoreFormDialog from '@/components/RestoreFormDialog';

interface RequestSubmissionFormProps {
  selectedService: string;
  selectedOfferings: string[];
  serviceData: {
    title: string;
    offerings: Array<{ id: string; name: string; icon: any }>;
  };
  onClose: () => void;
  onSuccess: () => void;
  isOpen: boolean;
  onViewRequest?: (requestId: string) => void;
}

// Auto-assignment logic
const autoAssignConsultant = async (selectedOfferings: string[]) => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // For anonymous users, return a placeholder consultant
      // The actual assignment will be handled by the database trigger
      return { name: 'To be assigned', id: null };
    }

    // Get all active advisory consultants for authenticated users
    const { data: allTeamMembers, error: consultantsError } = await supabase
      .rpc('get_team_members_for_app');

    if (consultantsError) {
      console.error('Error fetching consultants:', consultantsError);
      // For anonymous users or when RPC fails, return placeholder
      return { name: 'To be assigned', id: null };
    }

    // Filter for Advisory Consultants only
    const consultants = (Array.isArray(allTeamMembers) ? allTeamMembers : []).filter(member => member.title === 'Advisory Consultant');

    if (consultants.length === 0) {
      console.error('No active consultants found');
      // Return placeholder when no consultants found
      return { name: 'To be assigned', id: null };
    }

    // Simple round-robin assignment for now
    // In a real system, this would be more sophisticated
    const randomIndex = Math.floor(Math.random() * consultants.length);
    return consultants[randomIndex];
    
  } catch (error) {
    console.error('Error in auto assignment:', error);
    // Return placeholder on any error
    return { name: 'To be assigned', id: null };
  }
};

const projectDataSchema = z.object({
  projectId: z.string().regex(/^\d+$/, 'Project ID must contain only numeric values').min(1, 'Project ID is required'),
  projectName: z.string().min(1, 'Project Name is required'),
  accountName: z.string().min(1, 'Account Name is required'),
  projectOwningUnit: z.string().optional(),
  deliveryExcellencePOC: z.string().optional(),
  projectPM: z.string().optional(),
  projectPOCEmail: z.string().email('Valid email format required').optional().or(z.literal('')),
  los: z.string().optional(),
  vertical: z.string().optional(),
  businessUnit: z.string().optional(),
  marketUnit: z.string().optional(),
});

const requirementDetailsSchema = z.object({
  expectedStartDate: z.date({
    required_error: 'Expected start date is required',
  }),
  requirementDetails: z.string().min(1, 'Requirement details are required'),
  expectedBusinessImpact: z.string().optional(),
  attachment: z.string().optional(),
});

type ProjectDataForm = z.infer<typeof projectDataSchema>;
type RequirementDetailsForm = z.infer<typeof requirementDetailsSchema>;

export default function RequestSubmissionForm({ 
  selectedService, 
  selectedOfferings, 
  serviceData, 
  onClose, 
  onSuccess,
  isOpen,
  onViewRequest 
}: RequestSubmissionFormProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [projectData, setProjectData] = useState<ProjectDataForm | null>(null);
  const [showAcknowledgement, setShowAcknowledgement] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [assignedConsultant, setAssignedConsultant] = useState('');
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const { toast } = useToast();
  const { submitRequest, isSubmitting } = useRequestSubmission();
  const { saveFormData, loadFormData, clearFormData, checkForRestoredData } = useFormPersistence({
    formType: 'single_service'
  });

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
      los: '',
      vertical: '',
      businessUnit: '',
      marketUnit: '',
    },
  });

  const requirementForm = useForm<RequirementDetailsForm>({
    resolver: zodResolver(requirementDetailsSchema),
    defaultValues: {
      requirementDetails: '',
      expectedBusinessImpact: '',
      attachment: '',
    },
  });

  const selectedOfferingNames = selectedOfferings.map(id => 
    serviceData.offerings.find(offering => offering.id === id)?.name
  ).filter(Boolean);

  // Check authentication status and restore form data
  useEffect(() => {
    const checkAuthAndRestore = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsUserAuthenticated(!!user);

      if (user) {
        // User is logged in, check for saved form data
        const restoredData = await checkForRestoredData();
        if (restoredData && isOpen) {
          setShowRestoreDialog(true);
          setPendingFormData(restoredData);
        }
      } else if (isOpen) {
        // Anonymous user, try to load existing form data
        const savedData = await loadFormData();
        if (savedData) {
          restoreFormData(savedData);
        }
      }
    };

    if (isOpen) {
      checkAuthAndRestore();
    }
  }, [isOpen, checkForRestoredData, loadFormData]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsUserAuthenticated(!!session?.user);
      
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

  // Save form data for anonymous users
  useEffect(() => {
    if (!isUserAuthenticated && isOpen && (projectData || projectForm.formState.isDirty || requirementForm.formState.isDirty)) {
      const formData = {
        currentPage,
        projectData,
        projectFormData: projectForm.getValues(),
        requirementFormData: requirementForm.getValues(),
        selectedService,
        selectedOfferings,
        serviceData
      };
      saveFormData(formData);
    }
  }, [currentPage, projectData, isUserAuthenticated, isOpen, saveFormData, selectedService, selectedOfferings, serviceData]);

  const restoreFormData = (savedData: any) => {
    if (savedData.currentPage) setCurrentPage(savedData.currentPage);
    if (savedData.projectData) setProjectData(savedData.projectData);
    if (savedData.projectFormData) projectForm.reset(savedData.projectFormData);
    if (savedData.requirementFormData) requirementForm.reset(savedData.requirementFormData);
  };

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

  const handleClose = async () => {
    // Clear any form data when closing
    if (!isUserAuthenticated) {
      await clearFormData();
    }
    onClose();
  };


  // Generate request ID
  const generateRequestId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `REQ-${timestamp}-${random}`.toUpperCase();
  };

  const handleProjectDataSubmit = (data: ProjectDataForm) => {
    setProjectData(data);
    setCurrentPage(2);
  };

  const handleRequirementDetailsSubmit = async (data: RequirementDetailsForm) => {
    if (!projectData) return;

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    setIsUserAuthenticated(!!user);

    // Generate request ID and assign consultant
    const newRequestId = generateRequestId();
    const consultant = await autoAssignConsultant(selectedOfferings);
    
    if (!consultant) {
      toast({
        title: "Error",
        description: "Unable to assign consultant. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    setRequestId(newRequestId);
    setAssignedConsultant(consultant.name);

    // Submit to database
    const result = await submitRequest({
      projectData,
      serviceRequirement: data,
      serviceId: selectedService,
      serviceName: serviceData.title,
      selectedOfferings,
      requestId: newRequestId,
      assignedConsultant: consultant.name,
      assignedConsultantId: null, // user_id not available from basic view for security
    });

    if (result.success) {
      // Show acknowledgement modal
      setShowAcknowledgement(true);
    }
  };

  const handleCloseWithReset = () => {
    setCurrentPage(1);
    setProjectData(null);
    setShowAcknowledgement(false);
    projectForm.reset();
    requirementForm.reset();
    handleClose();
    if (showAcknowledgement) {
      onSuccess();
    }
  };

  const progress = currentPage === 1 ? 50 : 100;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseWithReset}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6 text-primary" />
            Request Submission - {serviceData.title}
          </DialogTitle>
          <DialogDescription className="text-lg">
            Complete the form to submit your advisory service request
          </DialogDescription>
        </DialogHeader>

        {!showAcknowledgement && (
          <>
            {/* Enhanced Progress Indicator */}
            <Card className="bg-gradient-card border-0 shadow-colored">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Step {currentPage} of 2</span>
                    <span className="text-sm text-muted-foreground font-medium">{progress}% Complete</span>
                  </div>
                  <div className="relative">
                    <Progress value={progress} className="h-3 bg-muted" />
                    <div className="absolute inset-0 bg-gradient-primary rounded-full opacity-20 animate-pulse" 
                         style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="flex justify-between">
                    <div className={`flex items-center gap-3 ${currentPage === 1 ? 'text-primary' : 'text-muted-foreground'} transition-colors`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${currentPage >= 1 ? 'bg-primary border-primary' : 'border-muted'}`}>
                        {currentPage >= 1 && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <span className="font-medium">Project Data</span>
                    </div>
                    <div className={`flex items-center gap-3 ${currentPage === 2 ? 'text-primary' : 'text-muted-foreground'} transition-colors`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${currentPage >= 2 ? 'bg-primary border-primary' : 'border-muted'}`}>
                        {currentPage >= 2 && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <span className="font-medium">Requirement Details</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Service Summary */}
            <Card className="bg-gradient-card border-0 shadow-colored">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm px-3 py-1 bg-gradient-primary text-white">
                      {serviceData.title}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedOfferingNames.map((name, index) => (
                      <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                        {name}
                      </Badge>
                    ))}
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
                        Project Data
                      </CardTitle>
                      <CardDescription className="text-lg">
                        Please provide the required project information
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
                                <FormLabel>Project ID *</FormLabel>
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
                                <FormLabel>Project Name *</FormLabel>
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
                                <FormLabel>Project PM ID</FormLabel>
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
                              <FormLabel>Project POC Email ID</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Enter email address" {...field} />
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
                            name="los"
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
                    <Button 
                      type="submit" 
                      disabled={!projectForm.formState.isValid}
                      className="bg-gradient-primary hover:opacity-90 shadow-colored text-lg py-6 px-8 font-semibold"
                    >
                      Next Step
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Page 2: Requirement Details */}
            {currentPage === 2 && (
              <Form {...requirementForm}>
                <form onSubmit={requirementForm.handleSubmit(handleRequirementDetailsSubmit)} className="space-y-6">
                  <Card className="border-0 shadow-colored">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <FileText className="h-6 w-6 text-primary" />
                        Requirement Details
                      </CardTitle>
                      <CardDescription className="text-lg">
                        Provide specific details about your requirements
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Tools (Auto-populated) */}
                      <div>
                        <Label className="text-sm font-semibold">Tools (Selected from previous step)</Label>
                        <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted rounded-lg">
                          {selectedOfferingNames.map((name, index) => (
                            <Badge key={index} variant="secondary">{name}</Badge>
                          ))}
                        </div>
                      </div>

                      {/* Expected Start Date */}
                      <FormField
                        control={requirementForm.control}
                        name="expectedStartDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="flex items-center gap-1">
                              Expected Start Date *
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
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
                                     // Auto-close the popover after selection
                                     const trigger = document.activeElement?.closest('[data-state="open"]') as HTMLElement;
                                     if (trigger) {
                                       setTimeout(() => trigger.click(), 100);
                                     }
                                   }}
                                   disabled={(date) => date < new Date()}
                                   initialFocus
                                   className="p-3 pointer-events-auto"
                                 />
                               </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      {/* Optional Fields */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-muted-foreground">Additional Information (Optional)</h4>
                        
                         <FormField
                           control={requirementForm.control}
                           name="requirementDetails"
                           render={({ field }) => {
                             const selectedOfferingNames = selectedOfferings.map(offeringId => {
                               const offering = serviceData.offerings.find(o => o.id === offeringId);
                               return offering?.name || offeringId;
                             });

                             const generatePlaceholder = () => {
                               if (selectedOfferingNames.length > 1) {
                                 return selectedOfferingNames.map((name, index) => 
                                   `Section ${index + 1} - ${name}:\n[Describe your specific requirements for ${name}...]\n`
                                 ).join('\n');
                               }
                               return "Describe your specific requirements in detail...";
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
                                 <FormLabel className="flex items-center gap-2 text-lg">
                                   Requirement Details 
                                   <span className="text-destructive">*</span>
                                   <AIAssistant
                                     onTextUpdate={field.onChange}
                                     currentText={field.value}
                                     selectedServiceId={selectedService}
                                     selectedOfferings={selectedOfferings}
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
                                     className="min-h-[150px]"
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
                          control={requirementForm.control}
                          name="expectedBusinessImpact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expected Business Impact</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the expected business impact..."
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />


                        <FormField
                          control={requirementForm.control}
                          name="attachment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Attachment</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <Input placeholder="File URL or description" {...field} />
                                  <Button type="button" variant="outline" size="icon">
                                    <Upload className="h-4 w-4" />
                                  </Button>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCurrentPage(1)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    <Button 
                      type="submit"
                      disabled={!requirementForm.watch('expectedStartDate') || !requirementForm.watch('requirementDetails')}
                      className="bg-gradient-primary hover:opacity-90 shadow-colored text-lg py-6 px-8 font-semibold"
                    >
                      <Send className="mr-2 h-5 w-5" />
                      Submit Request and Assign
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </>
        )}

        {/* Enhanced Acknowledgement Modal */}
        {showAcknowledgement && (
          <div className="space-y-8">
            <Card className="bg-gradient-primary border-0 text-white shadow-hero">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-glow">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold mb-2">Request Successfully Submitted!</CardTitle>
                <CardDescription className="text-white/90 text-lg">
                  {isUserAuthenticated 
                    ? "Your advisory service request has been processed and assigned to our expert team"
                    : "Your advisory service request has been submitted. Please login to view and track your request."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-white/10 p-6 rounded-xl space-y-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">Request ID:</span>
                    <Badge variant="outline" className="font-mono text-sm bg-white text-primary px-3 py-1">
                      {requestId}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">Assigned Consultant:</span>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      <span className="font-medium">{assignedConsultant}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">Service:</span>
                    <span className="font-medium">{serviceData.title}</span>
                  </div>
                </div>

                {isUserAuthenticated && (
                  <div className="text-center text-white/90">
                    <p className="text-lg mb-3">📧 Email notifications have been sent to:</p>
                    <ul className="space-y-2 text-sm">
                      <li>• Assigned consultant ({assignedConsultant})</li>
                      <li>• Advisory team distribution list</li>
                      <li>• Your project team</li>
                    </ul>
                  </div>
                )}

                {!isUserAuthenticated && (
                  <div className="text-center text-white/90">
                    <p className="text-lg mb-3">ℹ️ To track your request progress:</p>
                    <div className="bg-white/10 p-4 rounded-lg">
                      <p className="text-sm">• Login to view request details and status updates</p>
                      <p className="text-sm">• Receive email notifications about progress</p>
                      <p className="text-sm">• Communicate directly with your assigned consultant</p>
                    </div>
                  </div>
                )}

                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <p className="text-white/90 text-center">
                    <Clock className="inline h-5 w-5 mr-2" />
                    <strong>Next Steps:</strong> The assigned consultant will contact you within 24 hours to discuss project details and timeline.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button 
                onClick={handleCloseWithReset} 
                className="flex-1 bg-white text-primary hover:bg-white/90 font-semibold text-lg py-6 shadow-colored"
              >
                {isUserAuthenticated ? "Return to Dashboard" : "Continue Browsing"}
              </Button>
              {isUserAuthenticated ? (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAcknowledgement(false);
                    onViewRequest?.(requestId);
                  }}
                  className="flex-1 border-white/30 text-white hover:bg-white/10 font-semibold text-lg py-6"
                >
                  View Request
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setShowLoginPrompt(true)}
                  className="flex-1 border-white/30 text-white hover:bg-white/10 font-semibold text-lg py-6"
                >
                  Login to View Request
                </Button>
              )}
            </div>
          </div>
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