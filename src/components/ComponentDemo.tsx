/**
 * ComponentDemo.tsx - Demonstration of Reusable Components
 * 
 * This file demonstrates how to use the new reusable components:
 * - RateEstimationSection
 * - BillabilityPercentageSection  
 * - ActivitiesDetailsSection
 * 
 * This shows the before/after comparison and benefits of component reusability.
 */

import React, { useState } from 'react';
import { RateEstimationSection } from './RateEstimationSection';
import { BillabilityPercentageSection } from './BillabilityPercentageSection';
import { ActivitiesDetailsSection } from './ActivitiesDetailsSection';
import type { Request, AssigneeInfo } from '@/types/shared';

// Sample data for demonstration
const sampleRequest: Request = {
  id: 'demo-request-1',
  request_id: 'REQ-2025-001',
  status: 'Approved',
  description: 'Sample request for component demonstration',
  submission_date: '2025-01-01',
  project_data: {
    projectName: 'Demo Project',
    accountName: 'Demo Account'
  },
  service_specific_data: {},
  advisory_services: ['engineering-excellence'],
  selected_tools: ['github', 'jenkins'],
  saved_total_hours: 40,
  saved_total_pd_estimate: 5,
  saved_total_cost: 4000,
  saved_assignee_rate: 100,
  saved_assignee_role: 'Senior Consultant',
  estimation_saved_at: '2025-01-01T10:00:00Z',
  billability_percentage: 80,
  timesheet_data: {
    day1: {
      'activity1-day0-part1': true,
      'activity2-day0-part2': false,
    },
    day2: {
      'activity1-day1-part1': true,
      'activity3-day1-part2': true,
    }
  }
};

const sampleAssigneeInfo: AssigneeInfo = {
  id: 'assignee-1',
  full_name: 'John Doe',
  designation: 'Senior Consultant',
  title: 'Senior Consultant',
  rate_per_hour: 100,
  billability_percentage: 80
};

export const ComponentDemo: React.FC = () => {
  const [showBillability, setShowBillability] = useState(false);
  const [showActivities, setShowActivities] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Reusable Components Demo</h1>
        <p className="text-muted-foreground">
          Demonstration of the new reusable components that eliminate code duplication
          across MyRequests, MyItems, and RequestOversight modules.
        </p>
      </div>

      <div className="space-y-8">
        {/* Rate Estimation Section Demo */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">1. Rate Estimation Section</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Displays rate calculations, frozen states, and cost breakdowns. 
            Supports multiple variants: default, compact, detailed.
          </p>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Default Variant</h3>
            <RateEstimationSection
              request={sampleRequest}
              assigneeInfo={sampleAssigneeInfo}
              calculatedHours={40}
              calculatedPD={5}
              variant="default"
            />

            <h3 className="text-lg font-medium">Compact Variant</h3>
            <RateEstimationSection
              request={sampleRequest}
              assigneeInfo={sampleAssigneeInfo}
              calculatedHours={40}
              calculatedPD={5}
              variant="compact"
            />
          </div>
        </div>

        {/* Billability Percentage Section Demo */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">2. Billability Percentage Section</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Shows billability calculations with collapsible interface. 
            Calculates billable assignment days automatically.
          </p>
          
          <BillabilityPercentageSection
            request={sampleRequest}
            assigneeInfo={sampleAssigneeInfo}
            calculatedHours={40}
            isCollapsible={true}
            isExpanded={showBillability}
            onToggle={() => setShowBillability(!showBillability)}
          />
        </div>

        {/* Activities Details Section Demo */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">3. Activities Details Section</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Displays activity progress with completed vs pending work breakdown.
            Fetches human-readable names from database.
          </p>
          
          <ActivitiesDetailsSection
            timesheetData={sampleRequest.timesheet_data}
            requestId={sampleRequest.id}
            isCollapsible={true}
            isExpanded={showActivities}
            onToggle={() => setShowActivities(!showActivities)}
          />
        </div>

        {/* Benefits Summary */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Benefits of Reusable Components</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Before (Duplicated Code)</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• ~500 lines duplicated across 3+ files</li>
                <li>• Inconsistent styling and behavior</li>
                <li>• Bug fixes needed in multiple places</li>
                <li>• Difficult to maintain and update</li>
                <li>• No type safety between implementations</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">After (Reusable Components)</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• ~50 lines per implementation</li>
                <li>• Consistent styling and behavior</li>
                <li>• Single source of truth for updates</li>
                <li>• Easy to maintain and extend</li>
                <li>• Full TypeScript type safety</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg border">
            <h4 className="font-medium mb-2">Usage Example:</h4>
            <pre className="text-xs text-muted-foreground overflow-x-auto">
{`// Simple implementation in any component:
<RateEstimationSection
  request={selectedRequest}
  assigneeInfo={assigneeInfo}
  calculatedHours={calculatedHours}
  calculatedPD={calculatedPD}
  variant="default"
/>

<BillabilityPercentageSection
  request={selectedRequest}
  assigneeInfo={assigneeInfo}
  calculatedHours={calculatedHours}
  isCollapsible={true}
  isExpanded={showBillability}
  onToggle={() => setShowBillability(!showBillability)}
/>`}
            </pre>
          </div>
        </div>

        {/* Implementation Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Implementation Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">Reusable Components Created</span>
              <span className="text-sm text-muted-foreground">(RateEstimationSection, BillabilityPercentageSection, ActivitiesDetailsSection)</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">Shared Types & Interfaces</span>
              <span className="text-sm text-muted-foreground">(src/types/shared.ts)</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="font-medium">MyRequests.tsx Refactoring</span>
              <span className="text-sm text-muted-foreground">(In Progress)</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="font-medium">MyItems.tsx Refactoring</span>
              <span className="text-sm text-muted-foreground">(Pending)</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="font-medium">RequestOversight.tsx Refactoring</span>
              <span className="text-sm text-muted-foreground">(Pending)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
