/**
 * BillabilityPercentageSection.tsx - Reusable Billability Percentage Component
 * 
 * OVERVIEW:
 * A reusable component that displays billability percentage information and calculations.
 * This component consolidates the billability logic and UI that was previously
 * duplicated across MyRequests, MyItems, and other components.
 * 
 * FEATURES:
 * 1. Collapsible Interface - Can be expanded/collapsed for better UX
 * 2. Billability Calculations - Shows percentage and calculated assignment days
 * 3. Multiple Variants - Supports different display styles
 * 4. Responsive Design - Adapts to different screen sizes
 * 5. Interactive Elements - Toggle functionality and visual feedback
 * 
 * USAGE:
 * ```tsx
 * <BillabilityPercentageSection
 *   request={selectedRequest}
 *   assigneeInfo={assigneeInfo}
 *   calculatedHours={calculatedHours}
 *   isCollapsible={true}
 *   isExpanded={isExpanded}
 *   onToggle={() => setIsExpanded(!isExpanded)}
 * />
 * ```
 * 
 * CALCULATIONS:
 * - Effective Hours per Day = 8 × (Billability Percentage ÷ 100)
 * - Billable Assignment Days = Math.ceil(Total Hours ÷ Effective Hours per Day)
 * - Uses frozen values when available, otherwise calculates from current data
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BillabilityPercentageSectionProps } from '@/types/shared';

/**
 * BillabilityPercentageSection Component
 * 
 * RESPONSIBILITIES:
 * 1. Display billability percentage with visual indicators
 * 2. Calculate and show billable assignment days
 * 3. Provide collapsible interface for better space management
 * 4. Handle different variants for various use cases
 * 5. Show calculation logic and explanations
 * 
 * CALCULATION DETAILS:
 * - Effective Hours per Day = 8 × (Billability % ÷ 100)
 * - Billable Days = Math.ceil(Total Hours ÷ Effective Hours per Day)
 * - Uses saved values when estimation is frozen
 * - Falls back to calculated values when no saved data exists
 */
export const BillabilityPercentageSection: React.FC<BillabilityPercentageSectionProps> = ({
  request,
  assigneeInfo,
  calculatedHours,
  isCollapsible = true,
  isExpanded = false,
  onToggle,
  showCalculationLogic = false,
  onCalculationLogicToggle,
  className,
  variant = 'default'
}) => {
  // Get billability percentage from request or assignee info
  const billabilityPercentage = request.billability_percentage ?? assigneeInfo?.billability_percentage ?? 0;
  
  // Calculate total hours (use saved if available, otherwise calculated)
  const totalHours = request.saved_total_hours && request.saved_total_hours > 0 
    ? request.saved_total_hours 
    : calculatedHours;
  
  // Calculate billable assignment days - CORRECTED LOGIC
  const calculateBillableAssignmentDays = (): number => {
    if (billabilityPercentage === 0 || totalHours === 0) return 0;
    
    // Assuming 8 hours per working day
    const hoursPerDay = 8;
    // Calculate effective hours per day based on billability percentage
    const effectiveHoursPerDay = (hoursPerDay * billabilityPercentage) / 100;
    // Calculate number of days needed (rounded up)
    return Math.ceil(totalHours / effectiveHoursPerDay);
  };

  const billableAssignmentDays = calculateBillableAssignmentDays();

  // Variant-specific styling
  const getContainerClasses = () => {
    const baseClasses = "rounded-lg shadow-lg";
    
    switch (variant) {
      case 'compact':
        return cn(baseClasses, "bg-gradient-to-r from-green-50 to-blue-50 border border-green-300 p-4");
      default:
        return cn(baseClasses, "bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 p-6");
    }
  };

  const HeaderContent = () => (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 text-left hover:bg-green-100 rounded-lg p-2 transition-colors"
    >
      <svg 
        className={`h-5 w-5 text-green-500 transition-transform duration-200 ${
          isExpanded ? 'rotate-90' : ''
        }`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <Calculator className="h-5 w-5 text-green-600" />
      <h3 className="text-lg font-semibold text-green-700">Billability Percentage</h3>
      <Badge variant="outline" className="text-xs bg-green-100 text-green-600 border-green-300">
        {isExpanded ? 'Expanded' : 'Collapsed'}
      </Badge>
      <span className="text-sm text-green-500 ml-auto">
        {isExpanded ? 'Click to collapse' : 'Click to expand billability details'}
      </span>
    </button>
  );

  const ContentSection = () => (
    <div className="space-y-6">
      {/* Billability Percentage Display */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Billability Percentage
          </div>
          <div className="text-3xl font-bold text-green-700 bg-white p-4 rounded-lg border-2 border-green-200">
            {billabilityPercentage !== null && billabilityPercentage !== undefined 
              ? `${billabilityPercentage}%` 
              : 'Not Set'
            }
          </div>
          <div className="text-xs text-muted-foreground">
            {billabilityPercentage > 0 
              ? 'Percentage of time billable to client'
              : 'Billability percentage not configured'
            }
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calculator className="h-4 w-4" />
            Calculated Billable Assignment Days
          </div>
          <div className="text-3xl font-bold text-blue-700 bg-white p-4 rounded-lg border-2 border-blue-200">
            {billableAssignmentDays.toFixed(1)} days
          </div>
          <div className="text-xs text-muted-foreground">
            Based on {totalHours} hours at {billabilityPercentage}% billability
          </div>
        </div>
      </div>

      {/* Collapsible Calculation Logic Display */}
      {variant !== 'compact' && (
        <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 mt-0.5">ℹ️</div>
            <div className="w-full">
              <button 
                onClick={onCalculationLogicToggle}
                className="font-medium text-blue-800 hover:text-blue-900 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <span>Calculation Logic</span>
                <span className="text-xs">
                  {showCalculationLogic ? '▼' : '▶'}
                </span>
              </button>
              {showCalculationLogic && (
                <div className="space-y-1 text-xs mt-2 animate-in slide-in-from-top-1 duration-200">
                  <div>• Total hours needed: <span className="font-mono">{totalHours} hours</span></div>
                  <div>• Billability allocation: <span className="font-mono">{billabilityPercentage}%</span></div>
                  <div>• Effective hours per day: <span className="font-mono">{((8 * billabilityPercentage) / 100).toFixed(1)} hours/day</span></div>
                  <div>• Working days needed: <span className="font-mono">⌈{totalHours} ÷ {((8 * billabilityPercentage) / 100).toFixed(1)}⌉ = {billableAssignmentDays} days</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Information */}
      {billabilityPercentage === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <Calculator className="h-4 w-4" />
            <span className="text-sm font-medium">Billability Not Configured</span>
          </div>
          <div className="text-sm text-amber-700 mt-1">
            The billability percentage has not been set for this request or assignee. 
            Please configure the billability percentage to see accurate calculations.
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className={cn(getContainerClasses(), className)}>
        {isCollapsible ? (
          <>
            <HeaderContent />
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-green-200 animate-in slide-in-from-top-2 duration-300">
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
