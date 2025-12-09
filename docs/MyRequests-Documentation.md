# MyRequests Component Documentation

## Overview

The `MyRequests.tsx` component serves as the main dashboard for users to view and manage their submitted requests. It provides a comprehensive interface for tracking request status, viewing estimations, managing feedback, and monitoring project timelines.

## Architecture

### Main Components
- **MyRequests** (default export) - Main dashboard component
- **ActivitiesDetailsSection** - Sub-component for timesheet activity breakdown

### Technology Stack
- **React** - Core framework with hooks (useState, useEffect, useMemo)
- **TypeScript** - Type safety and development experience
- **Supabase** - Database integration and real-time updates
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Styling and responsive design
- **Lucide React** - Icon system
- **date-fns** - Date formatting utilities

## Key Features

### 1. Request List View
- **Filterable Interface**: Users can filter requests by status
- **Search Functionality**: Search across request ID, description, and project name
- **Sortable Columns**: Requests sorted by submission date (newest first)
- **Status Indicators**: Visual status badges with color coding and icons
- **Quick Actions**: View details, create new request

### 2. Request Detail View
- **Comprehensive Information**: All request details in organized sections
- **Collapsible Sections**: Mobile-friendly expandable content areas
- **Real-time Updates**: Live synchronization with database changes
- **Interactive Elements**: Forms, comments, timeline tracking

### 3. Section Management
The detail view is organized into six main sections in this specific order:

#### Section 1: Rate and Estimation
- **Purpose**: Cost calculations and hour estimates
- **Content**: Total hours, person days, assignee role, billing rate, total cost
- **Visibility**: Shows when estimation data exists or status requires it
- **Features**: Frozen state indicators, calculation breakdowns

#### Section 2: Activities Details (Collapsible)
- **Purpose**: Breakdown of completed vs pending work activities
- **Content**: Visual progress indicators, activity groupings, statistics
- **Visibility**: Shows for 'Awaiting Feedback' and 'Closed' statuses
- **Features**: Completed/pending categorization, progress statistics

#### Section 3: Billability Percentage (Collapsible)
- **Purpose**: Resource allocation and billing calculations
- **Content**: Billability percentage, calculated assignment days
- **Visibility**: Shows for 'Review' status and later stages
- **Features**: Auto-calculated metrics, detailed calculation logic

#### Section 4: Feedback Section
- **Purpose**: User feedback forms and responses
- **Content**: Feedback submission forms, response handling
- **Visibility**: Shows for 'Awaiting Feedback' status
- **Features**: Interactive forms, validation, submission handling

#### Section 5: Request Timeline (Collapsible)
- **Purpose**: Status change history and milestones
- **Content**: Chronological status updates, timestamps
- **Visibility**: Always available for all requests
- **Features**: Expandable timeline, detailed history tracking

#### Section 6: Comments Section
- **Purpose**: Communication thread between stakeholders
- **Content**: Comment threads, user interactions
- **Visibility**: Always available for all requests
- **Features**: Real-time comments, user identification

## State Management

### Core Data State
```typescript
// Primary request data
const [requests, setRequests] = useState<Request[]>([]);                    // All user requests
const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);    // Filtered subset
const [selectedRequest, setSelectedRequest] = useState<Request | null>(null); // Current detail view

// Reference data for display
const [advisoryServices, setAdvisoryServices] = useState<Record<string, string>>({});
const [serviceOfferings, setServiceOfferings] = useState<Record<string, string>>({});
```

### UI State Management
```typescript
// Search and filtering
const [searchTerm, setSearchTerm] = useState('');
const [statusFilter, setStatusFilter] = useState('all');
const [loading, setLoading] = useState(true);

// Collapsible sections (keyed by request ID)
const [showTimeline, setShowTimeline] = useState<Record<string, boolean>>({});
const [showActivitiesDetails, setShowActivitiesDetails] = useState<Record<string, boolean>>({});
const [showCalculationLogic, setShowCalculationLogic] = useState<Record<string, boolean>>({});
const [showBillabilityPercentage, setShowBillabilityPercentage] = useState<Record<string, boolean>>({});
```

### Calculated Values
```typescript
// Computed values for selected request
const [calculatedHours, setCalculatedHours] = useState<number>(0);  // Total estimated hours
const [calculatedPD, setCalculatedPD] = useState<number>(0);        // Person days (hours ÷ 8)
const [assigneeInfo, setAssigneeInfo] = useState<any>(null);        // Assignee profile data
const [currentUserId, setCurrentUserId] = useState<string>('');     // Current user ID
```

## Data Flow

### 1. Component Initialization
```
Component Mounts → Fetch User Requests → Fetch Reference Data → Update State
```

### 2. User Interactions
```
User Input → Update Filters/Search → Re-filter Requests → Update Display
```

### 3. Request Selection
```
User Selects Request → Fetch Detailed Data → Calculate Values → Show Detail View
```

### 4. Section Interactions
```
User Toggles Section → Update UI State → Show/Hide Content → Animate Transition
```

## Key Functions

### Data Fetching Functions

#### `fetchUserRequests()`
- **Purpose**: Retrieves all requests for the current user
- **Process**: Authenticates user, queries requests table, sorts by date
- **Error Handling**: Toast notifications for auth/fetch errors

#### `fetchAdvisoryServices()` & `fetchServiceOfferings()`
- **Purpose**: Loads reference data for display name mappings
- **Process**: Queries respective tables, creates ID-to-name mappings
- **Usage**: Converts technical IDs to user-friendly names

### Utility Functions

#### `calculateTotalHours()` & `calculateTotalHoursAsync()`
- **Purpose**: Computes total estimated hours from activity selections
- **Process**: Processes activity data, fetches missing hours from database
- **Return**: Total hours for cost calculations

#### `getToolDisplayName()` & `getAdvisoryServiceDisplayName()`
- **Purpose**: Converts IDs to display names
- **Process**: Checks dynamic data first, falls back to static mappings
- **Fallback**: Shows original ID if no mapping found

#### `filterRequests()`
- **Purpose**: Applies search and status filters to request list
- **Process**: Filters by search term (ID, description, project) and status
- **Update**: Sets filtered results for display

## Constants and Mappings

### Status Management
```typescript
// Visual styling for status badges
const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800',
  'Review': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-purple-100 text-purple-800',
  // ... more statuses
};

// Icons for status representation
const STATUS_ICONS = {
  'New': AlertCircle,
  'Review': Eye,
  'Approved': CheckCircle2,
  // ... more statuses
};
```

### Tool and Service Mappings
```typescript
// Maps technical IDs to user-friendly names
const TOOL_ID_TO_NAME_MAP: Record<string, string> = {
  'github': 'GitHub',
  'jenkins': 'Jenkins',
  // ... more tools
};

const ADVISORY_SERVICE_ID_TO_NAME_MAP: Record<string, string> = {
  'engineering-excellence': 'Engineering Excellence',
  // ... more services
};
```

## ActivitiesDetailsSection Component

### Purpose
Displays a detailed breakdown of completed vs pending work activities from timesheet data. Processes raw timesheet data and presents it in an organized, visual format.

### Functionality
- **Data Processing**: Extracts activity IDs from timesheet structure
- **Database Integration**: Fetches human-readable activity names
- **Categorization**: Groups activities by completion status
- **Visualization**: Provides progress indicators and statistics
- **Empty States**: Handles cases with no data gracefully

### Data Structure
```typescript
// Input: Raw timesheet data
{
  "day1": {
    "subActivityId1-day0-part1": true,   // Completed
    "subActivityId2-day0-part2": false,  // Pending
  },
  "day2": { ... }
}

// Output: Processed activity groups
{
  completed: { [activityName]: { name, id, activities[] } },
  pending: { [activityName]: { name, id, activities[] } },
  statistics: { total, completed, pending }
}
```

### Visual Components
- **Completed Activities**: Green-themed cards with checkmark icons
- **Pending Activities**: Orange-themed cards with clock icons
- **Statistics Summary**: Three-column grid with totals
- **Empty States**: Friendly messages when no data available

## Responsive Design

### Mobile-First Approach
- **Breakpoints**: Uses Tailwind's responsive prefixes (md:, lg:)
- **Grid Layouts**: Adaptive columns based on screen size
- **Collapsible Sections**: Essential for mobile navigation
- **Touch Targets**: Appropriately sized interactive elements

### Layout Patterns
```css
/* Desktop: Multi-column layouts */
.grid.md:grid-cols-2  /* Two columns on medium+ screens */
.grid.md:grid-cols-4  /* Four columns for detailed data */

/* Mobile: Single column, stacked layout */
.space-y-4           /* Vertical spacing between elements */
.flex-col           /* Column direction for mobile */
```

## Accessibility Features

### Semantic HTML
- **Proper Headings**: Hierarchical h1-h6 structure
- **Form Labels**: Associated labels for all inputs
- **Button Elements**: Semantic button tags for interactions
- **List Structures**: Proper ul/li for grouped content

### ARIA Support
- **Labels**: Descriptive aria-labels for complex elements
- **Roles**: Appropriate ARIA roles for custom components
- **States**: aria-expanded for collapsible sections
- **Descriptions**: Additional context via aria-describedby

### Keyboard Navigation
- **Tab Order**: Logical tab sequence through interface
- **Focus Indicators**: Visible focus states for all interactive elements
- **Keyboard Shortcuts**: Standard navigation patterns
- **Skip Links**: Quick navigation for screen readers

## Performance Considerations

### Optimization Techniques
- **useMemo**: Expensive calculations cached and memoized
- **useCallback**: Event handlers optimized to prevent re-renders
- **Conditional Rendering**: Components only render when needed
- **Lazy Loading**: Data fetched on-demand for detail views

### Memory Management
- **State Cleanup**: Proper cleanup in useEffect hooks
- **Event Listeners**: Removed when components unmount
- **Large Lists**: Virtualization for extensive request lists
- **Image Optimization**: Proper sizing and lazy loading

## Error Handling

### User-Friendly Messages
- **Toast Notifications**: Non-intrusive error communication
- **Inline Validation**: Real-time form validation feedback
- **Fallback UI**: Graceful degradation when data unavailable
- **Retry Mechanisms**: Options to retry failed operations

### Development Support
- **Console Logging**: Detailed logs for debugging
- **Error Boundaries**: Catch and handle React errors
- **Type Safety**: TypeScript prevents common errors
- **Validation**: Runtime validation for critical data

## Testing Considerations

### Unit Testing
- **Component Rendering**: Verify components render correctly
- **State Management**: Test state updates and side effects
- **User Interactions**: Simulate clicks, form submissions
- **Data Processing**: Validate calculation functions

### Integration Testing
- **Database Operations**: Test Supabase integration
- **Authentication**: Verify user authentication flows
- **Navigation**: Test routing and navigation
- **Real-time Updates**: Validate live data synchronization

### Accessibility Testing
- **Screen Readers**: Test with assistive technologies
- **Keyboard Navigation**: Verify keyboard-only usage
- **Color Contrast**: Ensure sufficient contrast ratios
- **Focus Management**: Test focus behavior

## Maintenance Guidelines

### Code Organization
- **Single Responsibility**: Each function has one clear purpose
- **Consistent Naming**: Descriptive, consistent naming conventions
- **Type Safety**: Comprehensive TypeScript coverage
- **Documentation**: Inline comments for complex logic

### Future Enhancements
- **Performance Monitoring**: Add metrics and monitoring
- **Internationalization**: Support for multiple languages
- **Advanced Filtering**: More sophisticated filter options
- **Bulk Operations**: Multi-select and batch actions
- **Offline Support**: Progressive Web App capabilities

### Dependencies
- **Regular Updates**: Keep dependencies current and secure
- **Security Audits**: Regular security vulnerability scans
- **Performance Audits**: Monitor and optimize performance
- **Accessibility Audits**: Regular accessibility compliance checks

## Troubleshooting

### Common Issues

#### Data Not Loading
- **Check Authentication**: Verify user is properly authenticated
- **Database Permissions**: Ensure proper RLS policies
- **Network Connectivity**: Verify internet connection
- **Console Errors**: Check browser console for error messages

#### UI Not Updating
- **State Dependencies**: Verify useEffect dependencies
- **Re-render Triggers**: Check if state changes trigger updates
- **Memoization Issues**: Ensure useMemo dependencies are correct
- **Component Keys**: Verify unique keys for list items

#### Performance Issues
- **Large Data Sets**: Implement pagination or virtualization
- **Unnecessary Re-renders**: Use React DevTools to identify
- **Memory Leaks**: Check for proper cleanup in effects
- **Bundle Size**: Analyze and optimize bundle size

### Debug Tools
- **React DevTools**: Component inspection and profiling
- **Supabase Dashboard**: Database query monitoring
- **Browser DevTools**: Network, console, and performance tabs
- **Lighthouse**: Performance and accessibility auditing

This comprehensive documentation provides a complete understanding of the MyRequests component, its architecture, functionality, and maintenance requirements. It serves as a reference for developers working with or extending this component.
