import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectData {
  projectId?: string;
  projectName?: string;
  accountName?: string;
  projectOwningUnit?: string;
  deliveryExcellencePOC?: string;
  projectPM?: string;
  projectPOCEmail?: string;
  los?: string;
  vertical?: string;
  businessUnit?: string;
  marketUnit?: string;
}

interface ServiceRequirement {
  expectedStartDate?: Date;
  requirementDetails?: string;
  expectedBusinessImpact?: string;
  attachment?: string;
}

interface RequestSubmissionData {
  projectData: ProjectData;
  serviceRequirement: ServiceRequirement;
  serviceId: string;
  serviceName: string;
  selectedOfferings: string[];
  requestId: string;
  assignedConsultant: string;
  assignedConsultantId?: string;
}

export const useRequestSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitRequest = async (data: RequestSubmissionData) => {
    setIsSubmitting(true);
    try {
      // Get current user (can be null for anonymous requests)
      const { data: { user } } = await supabase.auth.getUser();

      const requestData = {
        request_id: data.requestId,
        requestor_id: user?.id || null, // Allow null for anonymous requests
        assignee_id: null, // Will be auto-assigned by database trigger
        assigned_consultant_name: null, // Will be set by database trigger
        advisory_services: [data.serviceId],
        selected_tools: data.selectedOfferings,
        original_assignee_id: null, // Will be set by database trigger
        status: 'New',
        project_data: {
          projectId: data.projectData.projectId,
          projectName: data.projectData.projectName,
          accountName: data.projectData.accountName,
          projectOwningUnit: data.projectData.projectOwningUnit,
          deliveryExcellencePOC: data.projectData.deliveryExcellencePOC,
          projectPM: data.projectData.projectPM,
          projectPOCEmail: data.projectData.projectPOCEmail,
          los: data.projectData.los,
          vertical: data.projectData.vertical,
          businessUnit: data.projectData.businessUnit,
          marketUnit: data.projectData.marketUnit,
        },
        service_specific_data: {
          serviceId: data.serviceId,
          serviceName: data.serviceName,
          expectedStartDate: data.serviceRequirement.expectedStartDate?.toISOString(),
          requirementDetails: data.serviceRequirement.requirementDetails,
          expectedBusinessImpact: data.serviceRequirement.expectedBusinessImpact,
          attachment: data.serviceRequirement.attachment,
          selectedOfferings: data.selectedOfferings,
        },
        description: data.serviceRequirement.requirementDetails,
        submission_date: new Date().toISOString(),
      };

      // Insert request into database
      const { error } = await supabase
        .from('requests')
        .insert(requestData);

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to save request to database');
      }

      toast({
        title: "Request Submitted Successfully",
        description: user 
          ? `Request ${data.requestId} has been saved and will be auto-assigned to an Advisory Consultant`
          : `Request ${data.requestId} has been submitted. Please login to view and track your request.`,
      });

      return { success: true };
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit request. Please try again.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitMultipleRequests = async (requests: RequestSubmissionData[]) => {
    setIsSubmitting(true);
    try {
      // Get current user (can be null for anonymous requests)
      const { data: { user } } = await supabase.auth.getUser();

      const requestsData = requests.map(data => ({
        request_id: data.requestId,
        requestor_id: user?.id || null, // Allow null for anonymous requests
        assignee_id: null, // Will be auto-assigned by database trigger
        assigned_consultant_name: null, // Will be set by database trigger
        advisory_services: [data.serviceId],
        selected_tools: data.selectedOfferings,
        original_assignee_id: null, // Will be set by database trigger
        status: 'New',
        project_data: {
          projectId: data.projectData.projectId,
          projectName: data.projectData.projectName,
          accountName: data.projectData.accountName,
          projectOwningUnit: data.projectData.projectOwningUnit,
          deliveryExcellencePOC: data.projectData.deliveryExcellencePOC,
          projectPM: data.projectData.projectPM,
          projectPOCEmail: data.projectData.projectPOCEmail,
          los: data.projectData.los,
          vertical: data.projectData.vertical,
          businessUnit: data.projectData.businessUnit,
          marketUnit: data.projectData.marketUnit,
        },
        service_specific_data: {
          serviceId: data.serviceId,
          serviceName: data.serviceName,
          expectedStartDate: data.serviceRequirement.expectedStartDate?.toISOString(),
          requirementDetails: data.serviceRequirement.requirementDetails,
          expectedBusinessImpact: data.serviceRequirement.expectedBusinessImpact,
          attachment: data.serviceRequirement.attachment,
          selectedOfferings: data.selectedOfferings,
        },
        description: data.serviceRequirement.requirementDetails,
        submission_date: new Date().toISOString(),
      }));

      // Insert all requests into database
      const { error } = await supabase
        .from('requests')
        .insert(requestsData);

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to save requests to database');
      }

      toast({
        title: "Requests Submitted Successfully",
        description: user 
          ? `${requests.length} requests have been saved and will be auto-assigned to Advisory Consultants`
          : `${requests.length} requests have been submitted. Please login to view and track your requests.`,
      });

      return { success: true };
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit requests. Please try again.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitRequest,
    submitMultipleRequests,
    isSubmitting,
  };
};