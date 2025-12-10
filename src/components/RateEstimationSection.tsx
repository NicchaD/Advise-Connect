/**
 * RateEstimationSection.tsx - Reusable Rate and Estimation Component
 * 
 * OVERVIEW:
 * A reusable component that displays rate and estimation information for requests.
 * This component consolidates the rate calculation logic and UI that was previously
 * duplicated across MyRequests, MyItems, and RequestOversight components.
 * 
 * FEATURES:
 * 1. Unified Rate Display - Consistent rate and estimation presentation
 * 2. Frozen State Handling - Shows frozen vs editable estimation states
 * 3. Multiple Variants - Supports different display styles (default, compact, detailed)
 * 4. Responsive Design - Adapts to different screen sizes
 * 5. Type Safety - Full TypeScript support with shared interfaces
 * 
 * USAGE:
 * ```tsx
 * <RateEstimationSection
 *   request={selectedRequest}
 *   assigneeInfo={assigneeInfo}
 *   calculatedHours={calculatedHours}
 *   calculatedPD={calculatedPD}
 *   variant="default"
 * />
 * ```
 * 
 * VARIANTS:
 * - default: Full display with all information and styling
 * - compact: Condensed view with essential information only
 * - detailed: Extended view with additional context and explanations
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calculator, Clock, DollarSign, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { RateEstimationSectionProps } from '@/types/shared';

/**
 * RateEstimationSection Component
 * 
 * RESPONSIBILITIES:
 * 1. Display total hours (calculated or frozen)
 * 2. Show person days (PD) estimation
 * 3. Present assignee billability role information
 * 4. Display hourly rate and total cost calculations
 * 5. Handle frozen vs editable state indicators
 * 6. Provide responsive layout for different screen sizes
 * 
 * CALCULATION LOGIC:
 * - Frozen estimates: Use saved values with fallback to calculated values
 * - Live estimates: Always use calculated values
 * - Total cost: Hours × Rate per hour
 * - Person Days: Total hours ÷ 8
 */
export const RateEstimationSection: React.FC<RateEstimationSectionProps> = ({
  request,
  assigneeInfo,
  calculatedHours,
  calculatedPD,
  className,
  showTitle = true,
  variant = 'default',
  showEditableBadge = true
}) => {
  // Determine if estimation is frozen (saved during estimation phase)
  const isFrozen = !!request.estimation_saved_at;
  
  // Calculate display values based on frozen state
  const displayHours = isFrozen 
    ? (request.saved_total_hours && request.saved_total_hours > 0 ? request.saved_total_hours : calculatedHours)
    : calculatedHours;
    
  const displayPD = isFrozen 
    ? (request.saved_total_pd_estimate && request.saved_total_pd_estimate > 0 ? request.saved_total_pd_estimate : calculatedPD)
    : calculatedPD;
    
  // Using designation and rate_per_hour from advisory_team_members table
  
  const displayRole = (request.status === 'Estimation' && !isFrozen)
    ? (assigneeInfo?.designation || 'Not assigned')
    : (request.saved_assignee_role || assigneeInfo?.designation || 'Not assigned');
    
  const displayRate = (request.status === 'Estimation' && !isFrozen)
    ? (assigneeInfo?.rate_per_hour || 0)
    : (request.saved_assignee_rate || assigneeInfo?.rate_per_hour || 0);

  // Calculate total cost
  const calculateTotalCost = (): number => {
    // First try to use saved cost if available
    if (request.saved_total_cost && request.saved_total_cost > 0) {
      return request.saved_total_cost;
    }
    
    // Otherwise calculate: hours × rate
    return displayHours * displayRate;
  };

  const totalCost = calculateTotalCost();

  // Determine if we should show the cost section
  const showCostSection = !!(
    request.status === 'Estimation' || 
    request.saved_total_cost || 
    request.saved_total_hours ||
    calculatedHours > 0 ||
    ['Review', 'Approved', 'Approval', 'Implementing', 'Implemented', 'Awaiting Feedback', 'Closed'].includes(request.status)
  );

  // Variant-specific styling
  const getContainerClasses = () => {
    const baseClasses = "rounded-lg p-6";
    
    switch (variant) {
      case 'compact':
        return cn(baseClasses, "bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10 p-4");
      case 'detailed':
        return cn(baseClasses, "bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20 shadow-lg");
      default:
        return cn(baseClasses, "bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20");
    }
  };

  const getGridClasses = () => {
    switch (variant) {
      case 'compact':
        return "grid grid-cols-2 md:grid-cols-4 gap-4";
      case 'detailed':
        return "grid md:grid-cols-4 gap-8";
      default:
        return "grid md:grid-cols-4 gap-6";
    }
  };

  return (
    <div className={cn(getContainerClasses(), className)}>
      {showTitle && (
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-primary">
          <Calculator className="h-6 w-6" />
          Rate and Estimation
          {isFrozen && (
            <Badge variant="outline" className="ml-2 text-xs">
              {request.status === 'Estimation' 
                ? 'Frozen' 
                : `Frozen on ${format(new Date(request.estimation_saved_at!), 'MMM dd, yyyy')}`
              }
            </Badge>
          )}
          {!isFrozen && request.status === 'Estimation' && showEditableBadge && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Editable - Click "Save Activities" to freeze values
            </Badge>
          )}
        </h3>
      )}
      
      <div className={getGridClasses()}>
        {/* Total Hours */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Total Hours
            {isFrozen && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Frozen
              </Badge>
            )}
          </div>
          <div className="text-2xl font-bold text-secondary">
            {displayHours}
          </div>
          <div className="text-xs text-muted-foreground">
            {isFrozen ? 'Frozen during estimation' : 'Total estimated hours'}
          </div>
        </div>

        {/* Total PD Estimate */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Total PD Estimate
            {isFrozen && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Frozen
              </Badge>
            )}
          </div>
          <div className="text-2xl font-bold text-primary">
            {displayPD} PD
          </div>
          <div className="text-xs text-muted-foreground">
            {isFrozen ? 'Frozen during estimation' : 'Total hours ÷ 8 (Person Days)'}
          </div>
        </div>
        
        {/* Assignee Billability Role */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <UserIcon className="h-4 w-4" />
            Assignee Billability Role
            {isFrozen && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Frozen
              </Badge>
            )}
          </div>
          <div className="text-lg font-semibold text-foreground">
            {displayRole}
          </div>
          <div className="text-xs text-muted-foreground">
            {(request.status === 'Estimation' && !isFrozen)
              ? 'Current billability role designation'
              : 'Frozen billability role (saved during estimation)'
            }
          </div>
        </div>
        
        {/* Rate for the Assignee */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Rate for the Assignee
            {isFrozen && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Frozen
              </Badge>
            )}
          </div>
          <div className="text-lg font-semibold text-green-600">
            ${displayRate}/hour
          </div>
          <div className="text-xs text-muted-foreground">
            {isFrozen ? 'Frozen during estimation' : 'Hourly billing rate'}
          </div>
        </div>
      </div>
      
      {/* Total Cost Section */}
      {showCostSection && (
        <div className="mt-4 pt-4 border-t border-primary/20">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Estimated Total Cost:</span>
            <span className="text-xl font-bold text-green-600">
              ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {variant === 'detailed' && (
            <div className="mt-2 text-xs text-muted-foreground">
              Calculation: {displayHours} hours × ${displayRate}/hour = ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
