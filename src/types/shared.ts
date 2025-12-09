/**
 * shared.ts - Shared TypeScript Interfaces and Types
 * 
 * OVERVIEW:
 * This file contains shared TypeScript interfaces and types used across multiple
 * components in the Advise-Connect application. It promotes type safety and
 * consistency across the codebase.
 */

/**
 * Request Interface
 * 
 * Represents a request object with all its properties used across different components.
 * This interface ensures consistency when passing request data between components.
 */
export interface Request {
  id: string;
  request_id: string;
  status: string;
  description: string;
  submission_date: string;
  project_data: any;
  service_specific_data: any;
  advisory_services: string[];
  selected_tools: string[];
  current_assignee_name?: string;
  original_assignee_name?: string;
  selected_activities?: any;
  service_offering_activities?: any;
  saved_total_hours?: number;
  saved_total_pd_estimate?: number;
  saved_total_cost?: number;
  saved_assignee_rate?: number;
  saved_assignee_role?: string;
  estimation_saved_at?: string;
  assignee_profile?: any;
  timesheet_data?: any;
  billability_percentage?: number;
  requestor_id?: string;
  assignee_id?: string;
  original_assignee_id?: string;
}

/**
 * Assignee Information Interface
 * 
 * Represents assignee profile information used in rate calculations and display.
 */
export interface AssigneeInfo {
  id?: string;
  full_name?: string;
  designation?: string;
  title?: string;
  rate_per_hour?: number;
  billability_percentage?: number;
  [key: string]: any;
}

/**
 * Rate Estimation Section Props
 * 
 * Props interface for the reusable RateEstimationSection component.
 */
export interface RateEstimationSectionProps {
  request: Request;
  assigneeInfo?: AssigneeInfo | null;
  calculatedHours: number;
  calculatedPD: number;
  className?: string;
  showTitle?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Billability Percentage Section Props
 * 
 * Props interface for the reusable BillabilityPercentageSection component.
 */
export interface BillabilityPercentageSectionProps {
  request: Request;
  assigneeInfo?: AssigneeInfo | null;
  calculatedHours: number;
  isCollapsible?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  showCalculationLogic?: boolean;
  onCalculationLogicToggle?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

/**
 * Activities Details Section Props
 * 
 * Props interface for the reusable ActivitiesDetailsSection component.
 */
export interface ActivitiesDetailsSectionProps {
  timesheetData: any;
  requestId: string;
  isCollapsible?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

/**
 * Section Visibility Configuration
 * 
 * Configuration object for determining which sections should be visible
 * based on request status and data availability.
 */
export interface SectionVisibilityConfig {
  showRateEstimation: boolean;
  showBillabilityPercentage: boolean;
  showActivitiesDetails: boolean;
  showFeedback: boolean;
  showTimeline: boolean;
  showComments: boolean;
}

/**
 * Collapsible State Management
 * 
 * State management interface for collapsible sections across components.
 */
export interface CollapsibleState {
  [requestId: string]: boolean;
}

/**
 * Component Variant Types
 * 
 * Standard variant types used across reusable components for consistent styling.
 */
export type ComponentVariant = 'default' | 'compact' | 'detailed';

/**
 * Status Colors and Icons Mapping
 * 
 * Shared mappings for request status colors and icons used across components.
 */
export const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800',
  'Pending Review': 'bg-orange-100 text-orange-800',
  'Review': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-purple-100 text-purple-800',
  'Approval': 'bg-emerald-600 text-white',
  'Estimation': 'bg-indigo-100 text-indigo-800',
  'Implementing': 'bg-emerald-100 text-emerald-800',
  'Awaiting Feedback': 'bg-amber-100 text-amber-800',
  'Feedback Received': 'bg-violet-600 text-white',
  'Implemented': 'bg-green-100 text-green-800',
  'Under Discussion': 'bg-pink-100 text-pink-800',
  'Cancelled': 'bg-red-100 text-red-800',
  'Closed': 'bg-slate-600 text-white',
  'Reject': 'bg-red-600 text-white'
} as const;

/**
 * Utility function to determine section visibility based on request status and data
 */
export function getSectionVisibility(request: Request): SectionVisibilityConfig {
  return {
    showRateEstimation: !!(
      request.status === 'Estimation' || 
      request.saved_total_hours || 
      request.estimation_saved_at ||
      ['Review', 'Approved', 'Approval', 'Implementing', 'Implemented', 'Awaiting Feedback', 'Closed'].includes(request.status)
    ),
    showBillabilityPercentage: !!(
      request.status === 'Review' || 
      ['Approved', 'Implementing', 'Implemented', 'Awaiting Feedback', 'Closed'].includes(request.status) ||
      (request.billability_percentage !== null && request.billability_percentage !== undefined)
    ),
    showActivitiesDetails: !!(
      ['Awaiting Feedback', 'Closed'].includes(request.status) && request.timesheet_data
    ),
    showFeedback: request.status === 'Awaiting Feedback',
    showTimeline: true, // Always show timeline
    showComments: true  // Always show comments
  };
}
