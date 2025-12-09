# Advise-Connect Application Documentation

## Table of Contents
1. [Application Overview](#application-overview)
2. [Technical Architecture](#technical-architecture)
3. [Core Modules](#core-modules)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Features by Module](#features-by-module)
6. [Reusable Components](#reusable-components)
7. [Database Integration](#database-integration)
8. [Development & Deployment](#development--deployment)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## Application Overview

**Advise-Connect** is a comprehensive advisory services management platform built with modern web technologies. The application facilitates the entire lifecycle of advisory service requests, from initial submission to completion and feedback collection.

### Key Capabilities
- **Request Management**: Complete lifecycle management of advisory service requests
- **User Role Management**: Multi-tier user roles with specific permissions and workflows
- **Project Estimation**: Automated calculation of hours, costs, and resource requirements
- **Activity Tracking**: Detailed tracking of project activities and progress
- **Timesheet Management**: Time tracking and billability calculations
- **Feedback System**: Comprehensive feedback collection and management
- **Administrative Controls**: Full administrative oversight and system management

### Business Value
- Streamlines advisory service delivery processes
- Provides accurate project estimation and cost calculation
- Enables efficient resource allocation and tracking
- Facilitates transparent communication between stakeholders
- Offers comprehensive reporting and analytics capabilities

---

## Technical Architecture

### Technology Stack
- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.1 for fast development and optimized builds
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS 3.4.11 with custom design system
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: React Router DOM 6.26.2 for client-side navigation
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **Authentication**: Supabase Auth with role-based access control
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns for date manipulation and formatting
- **Icons**: Lucide React for consistent iconography
- **Charts**: Recharts for data visualization

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── InformationHub/ # Information hub specific components
│   └── *.tsx           # Feature-specific components
├── pages/              # Route-level page components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
├── integrations/       # External service integrations
└── data/               # Static data and configurations
```

### Architecture Patterns
- **Component-Based Architecture**: Modular, reusable components
- **Container/Presentation Pattern**: Separation of logic and UI
- **Custom Hooks**: Reusable stateful logic
- **Type-Safe Development**: Comprehensive TypeScript coverage
- **Responsive Design**: Mobile-first approach with Tailwind CSS

---

## Core Modules

### 1. Authentication & User Management
**Location**: `src/pages/Login.tsx`, `src/pages/SignUp.tsx`, `src/components/UserManagement.tsx`

**Features**:
- User registration and login
- Password reset functionality
- Role-based access control
- User profile management
- Session management

**User Roles**:
- **Admin**: Full system access and management
- **Advisory Service Head**: Department-level oversight
- **Advisory Service Lead**: Team-level management
- **Advisory Consultant**: Service delivery
- **Requestor**: Service request submission

### 2. Dashboard Module
**Location**: `src/pages/Dashboard.tsx`

**Features**:
- Personalized dashboard based on user role
- Quick access to relevant functions
- Summary statistics and metrics
- Recent activity overview
- Navigation hub to all modules

**Role-Specific Views**:
- **Admin Dashboard**: System-wide metrics and management tools
- **Consultant Dashboard**: Assigned requests and workload
- **Requestor Dashboard**: Submitted requests and status tracking

### 3. Request Management System
**Location**: `src/pages/MyRequests.tsx`, `src/pages/MyItems.tsx`

#### MyRequests Module
**Purpose**: Manage requests submitted by the current user

**Key Features**:
- **Request Submission**: Multi-step form for creating new requests
- **Status Tracking**: Real-time status updates and progress monitoring
- **Request Details**: Comprehensive view of request information
- **Rate Estimation**: Automated calculation of project costs and timelines
- **Billability Management**: Percentage-based billability calculations
- **Activity Progress**: Detailed tracking of completed and pending activities
- **Comments System**: Threaded comments for communication
- **Document Management**: File attachments and document sharing

**Workflow States**:
1. **New**: Initial request submission
2. **Estimation**: Cost and time estimation phase
3. **Review**: Request review and approval process
4. **Approved**: Request approved for implementation
5. **Implementing**: Active project execution
6. **Implemented**: Project completion
7. **Awaiting Feedback**: Feedback collection phase
8. **Closed**: Request fully completed

#### MyItems Module
**Purpose**: Manage requests assigned to the current user

**Key Features**:
- **Assignment Management**: View and manage assigned requests
- **Workload Overview**: Visual representation of current workload
- **Time Tracking**: Detailed timesheet management
- **Progress Updates**: Update request status and progress
- **Estimation Tools**: Calculate project requirements and costs
- **Billability Tracking**: Monitor billable hours and percentages
- **Activity Management**: Track individual activity completion

### 4. Administrative Module
**Location**: `src/pages/AdminDashboard.tsx`, `src/components/AdminModule.tsx`

**Features**:
- **User Management**: Create, edit, and manage user accounts
- **System Settings**: Configure application-wide settings
- **Role Management**: Assign and modify user roles
- **Service Configuration**: Manage advisory services and offerings
- **Activity Management**: Configure available activities and sub-activities
- **Reporting**: Generate system-wide reports and analytics
- **Data Management**: Import/export functionality

### 5. Request Oversight
**Location**: `src/components/RequestOversight.tsx`

**Features**:
- **Request Monitoring**: Overview of all requests in the system
- **Status Management**: Bulk status updates and management
- **Assignment Control**: Assign and reassign requests
- **Performance Metrics**: Track team and individual performance
- **Quality Assurance**: Review and approve request outcomes
- **Resource Planning**: Allocate resources based on demand

### 6. Information Hub
**Location**: `src/pages/InformationHub.tsx`, `src/components/InformationHub/`

**Features**:
- **Knowledge Base**: Centralized information repository
- **Documentation**: Access to guides and procedures
- **FAQ System**: Frequently asked questions and answers
- **Resource Library**: Downloadable resources and templates
- **Search Functionality**: Advanced search across all content

---

## User Roles & Permissions

### Admin
**Permissions**:
- Full system access
- User management (create, edit, delete users)
- System configuration and settings
- Access to all requests and data
- Generate system-wide reports
- Manage service offerings and activities

**Key Workflows**:
- System administration and maintenance
- User onboarding and role assignment
- System configuration and customization
- Data management and reporting

### Advisory Service Head
**Permissions**:
- Department-level oversight
- Approve high-value requests
- Access to department metrics
- Manage team assignments
- Review and approve consultant work

**Key Workflows**:
- Strategic oversight of advisory services
- Resource allocation and planning
- Quality assurance and approval
- Performance monitoring

### Advisory Service Lead
**Permissions**:
- Team-level management
- Assign requests to consultants
- Monitor team performance
- Approve consultant estimates
- Access to team metrics

**Key Workflows**:
- Team management and coordination
- Request assignment and monitoring
- Performance tracking and feedback
- Resource planning

### Advisory Consultant
**Permissions**:
- Manage assigned requests
- Submit estimates and timesheets
- Update request status and progress
- Access to relevant documentation
- Communicate with requestors

**Key Workflows**:
- Request estimation and planning
- Project execution and delivery
- Time tracking and reporting
- Client communication

### Requestor
**Permissions**:
- Submit new requests
- View own request status
- Provide feedback on completed work
- Access to relevant documentation
- Communicate with assigned consultants

**Key Workflows**:
- Request submission and specification
- Progress monitoring and communication
- Feedback provision and evaluation
- Service consumption

---

## Features by Module

### Request Submission & Management

#### Multi-Service Request Form
**Location**: `src/components/MultiServiceRequestForm.tsx`

**Features**:
- **Service Selection**: Choose from available advisory services
- **Project Details**: Comprehensive project information capture
- **Requirements Specification**: Detailed requirement documentation
- **Priority Setting**: Request priority and urgency indicators
- **Attachment Support**: File upload and document attachment
- **Draft Saving**: Save incomplete requests as drafts
- **Validation**: Comprehensive form validation and error handling

#### Request Timeline
**Location**: `src/components/RequestTimeline.tsx`

**Features**:
- **Visual Timeline**: Chronological view of request progress
- **Status Milestones**: Key milestone tracking and visualization
- **Activity Log**: Detailed log of all request activities
- **Time Tracking**: Duration tracking for each phase
- **Stakeholder Actions**: Track actions by different stakeholders

### Estimation & Costing

#### Rate Estimation Section
**Location**: `src/components/RateEstimationSection.tsx`

**Features**:
- **Automated Calculations**: Calculate total hours and person-days
- **Rate Management**: Hourly rate configuration and application
- **Cost Estimation**: Total project cost calculation
- **Frozen Estimates**: Lock estimates during review process
- **Role-Based Rates**: Different rates for different consultant roles
- **Historical Tracking**: Track estimation accuracy over time

#### Billability Percentage Section
**Location**: `src/components/BillabilityPercentageSection.tsx`

**Features**:
- **Percentage Configuration**: Set billability percentage per request
- **Assignment Day Calculation**: Calculate billable assignment days
- **Collapsible Logic Display**: Show/hide calculation methodology
- **Real-Time Updates**: Dynamic recalculation based on changes
- **Validation**: Ensure percentage values are within valid ranges

### Activity & Progress Tracking

#### Activities Management
**Location**: `src/components/ActivitiesSection.tsx`, `src/components/MultiServiceActivitiesSection.tsx`

**Features**:
- **Activity Selection**: Choose relevant activities for requests
- **Sub-Activity Management**: Detailed sub-activity breakdown
- **Progress Tracking**: Track completion status of activities
- **Time Estimation**: Estimate time required for each activity
- **Dependency Management**: Handle activity dependencies
- **Bulk Operations**: Bulk select/deselect activities

#### Activities Details Section
**Location**: `src/components/ActivitiesDetailsSection.tsx`

**Features**:
- **Completion Overview**: Visual summary of completed vs pending work
- **Activity Grouping**: Group activities by type or category
- **Progress Statistics**: Detailed progress metrics and statistics
- **Collapsible Interface**: Expandable/collapsible activity details
- **Real-Time Updates**: Live updates as activities are completed

### Time Tracking & Timesheets

#### Timesheet Management
**Location**: `src/components/TimesheetSection.tsx`

**Features**:
- **Daily Time Entry**: Day-by-day time tracking
- **Activity-Based Tracking**: Track time per activity/sub-activity
- **Validation**: Ensure accurate and complete time entries
- **Approval Workflow**: Timesheet review and approval process
- **Reporting**: Generate timesheet reports and summaries
- **Integration**: Integrate with billing and payroll systems

### Communication & Feedback

#### Request Comments
**Location**: `src/components/RequestComments.tsx`

**Features**:
- **Threaded Comments**: Hierarchical comment structure
- **Real-Time Updates**: Live comment updates and notifications
- **Rich Text Support**: Formatted text and basic markup
- **Attachment Support**: Attach files to comments
- **Mention System**: @mention other users in comments
- **Comment History**: Full comment history and audit trail

#### Feedback System
**Location**: `src/components/RequestFeedbackSection.tsx`, `src/components/RequestFeedbackForm.tsx`

**Features**:
- **Structured Feedback**: Standardized feedback forms
- **Rating System**: Numerical and qualitative ratings
- **Feedback Categories**: Categorized feedback for analysis
- **Anonymous Options**: Option for anonymous feedback
- **Feedback Analytics**: Analyze feedback trends and patterns
- **Action Items**: Generate action items from feedback

### Search & Discovery

#### Search Module
**Location**: `src/components/SearchModule.tsx`

**Features**:
- **Global Search**: Search across all requests and content
- **Advanced Filters**: Filter by status, date, assignee, etc.
- **Saved Searches**: Save frequently used search queries
- **Search History**: Track and revisit previous searches
- **Export Results**: Export search results to various formats
- **Real-Time Search**: Live search results as you type

### System Administration

#### User Management
**Location**: `src/components/UserManagement.tsx`

**Features**:
- **User Creation**: Create new user accounts
- **Role Assignment**: Assign and modify user roles
- **Profile Management**: Manage user profiles and information
- **Access Control**: Configure user permissions and access levels
- **Bulk Operations**: Bulk user operations and management
- **User Analytics**: Track user activity and engagement

#### System Settings
**Location**: `src/components/SystemSettings.tsx`

**Features**:
- **Application Configuration**: Configure application-wide settings
- **Service Management**: Manage available advisory services
- **Activity Configuration**: Configure activities and sub-activities
- **Rate Management**: Manage consultant rates and billing
- **Notification Settings**: Configure system notifications
- **Integration Settings**: Configure external system integrations

---

## Reusable Components

The application features a comprehensive set of reusable components designed to eliminate code duplication and ensure consistency across modules.

### Core Reusable Components

#### RateEstimationSection
**Purpose**: Standardized rate and cost estimation display
**Usage**: MyRequests, MyItems, RequestOversight
**Features**:
- Consistent calculation logic across all modules
- Frozen estimate handling
- Role-based rate display
- Cost breakdown and summaries

#### BillabilityPercentageSection
**Purpose**: Billability percentage management and calculation
**Usage**: MyRequests, MyItems, RequestOversight
**Features**:
- Percentage input and validation
- Billable assignment day calculation
- Collapsible calculation logic display
- Real-time updates and recalculation

#### ActivitiesDetailsSection
**Purpose**: Activity progress tracking and display
**Usage**: MyRequests, MyItems, RequestOversight
**Features**:
- Completed vs pending activity visualization
- Activity grouping and categorization
- Progress statistics and metrics
- Collapsible interface with smooth animations

### UI Component Library

The application uses a comprehensive UI component library based on shadcn/ui and Radix UI:

#### Form Components
- **Input**: Text input with validation
- **Select**: Dropdown selection with search
- **Checkbox**: Multi-select options
- **Radio Group**: Single-select options
- **Switch**: Toggle controls
- **Slider**: Range selection
- **Date Picker**: Date and time selection

#### Layout Components
- **Card**: Content containers with consistent styling
- **Dialog**: Modal dialogs and overlays
- **Tabs**: Tabbed content organization
- **Accordion**: Collapsible content sections
- **Separator**: Visual content separation
- **Scroll Area**: Scrollable content containers

#### Navigation Components
- **Button**: Various button styles and states
- **Dropdown Menu**: Contextual menus
- **Navigation Menu**: Main navigation structure
- **Breadcrumb**: Hierarchical navigation
- **Pagination**: Content pagination controls

#### Feedback Components
- **Toast**: Notification messages
- **Alert**: Important messages and warnings
- **Progress**: Progress indicators
- **Badge**: Status and category indicators
- **Tooltip**: Contextual help and information

---

## Database Integration

### Supabase Integration
**Location**: `src/integrations/supabase/`

The application uses Supabase as its backend-as-a-service platform, providing:

#### Database Features
- **PostgreSQL Database**: Robust relational database
- **Real-Time Subscriptions**: Live data updates
- **Row Level Security**: Fine-grained access control
- **Database Functions**: Server-side business logic
- **Triggers**: Automated database operations

#### Authentication
- **User Management**: Built-in user authentication
- **Role-Based Access**: Custom role implementation
- **Session Management**: Secure session handling
- **Password Reset**: Automated password reset flows
- **Social Login**: Integration with social providers

#### Storage
- **File Upload**: Secure file storage and retrieval
- **Image Processing**: Automatic image optimization
- **Access Control**: File-level permissions
- **CDN Integration**: Global content delivery

### Data Models

#### Core Entities
- **Users**: User accounts and profiles
- **Requests**: Advisory service requests
- **Activities**: Available activities and sub-activities
- **Timesheets**: Time tracking data
- **Comments**: Request comments and communication
- **Feedback**: Feedback and ratings
- **Settings**: System configuration

#### Relationships
- Users can have multiple Requests (as requestor or assignee)
- Requests can have multiple Activities
- Activities can have multiple Timesheets entries
- Requests can have multiple Comments
- Users can provide Feedback on Requests

---

## Development & Deployment

### Development Setup

#### Prerequisites
- Node.js 18+ (recommended: Node.js 25.2.1)
- npm or yarn package manager
- Git for version control

#### Installation
```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd advise-connect

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Development Scripts
```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Development build
npm run build:dev

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Configuration

#### Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Configuration
VITE_APP_TITLE=Advise-Connect
VITE_APP_DESCRIPTION=Advisory Services Management Platform
```

### Build & Deployment

#### Production Build
The application builds to a static site that can be deployed to any static hosting service:

```bash
npm run build
```

Output directory: `dist/`

#### Deployment Options
- **Netlify**: Automatic deployment from Git
- **Vercel**: Zero-configuration deployment
- **AWS S3 + CloudFront**: Scalable static hosting
- **GitHub Pages**: Free hosting for public repositories

### Performance Optimization

#### Build Optimizations
- **Code Splitting**: Automatic route-based code splitting
- **Tree Shaking**: Remove unused code
- **Asset Optimization**: Minification and compression
- **Bundle Analysis**: Analyze bundle size and dependencies

#### Runtime Optimizations
- **React Query**: Efficient server state management
- **Lazy Loading**: Component and route lazy loading
- **Memoization**: Prevent unnecessary re-renders
- **Virtual Scrolling**: Handle large data sets efficiently

---

## API Reference

### Supabase Client
**Location**: `src/integrations/supabase/client.ts`

#### Authentication Methods
```typescript
// Sign up new user
supabase.auth.signUp({ email, password })

// Sign in user
supabase.auth.signInWithPassword({ email, password })

// Sign out user
supabase.auth.signOut()

// Get current user
supabase.auth.getUser()
```

#### Database Operations
```typescript
// Select data
supabase.from('table_name').select('*')

// Insert data
supabase.from('table_name').insert(data)

// Update data
supabase.from('table_name').update(data).eq('id', id)

// Delete data
supabase.from('table_name').delete().eq('id', id)
```

#### Real-Time Subscriptions
```typescript
// Subscribe to changes
supabase
  .channel('table_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'table_name' },
    (payload) => console.log('Change received!', payload)
  )
  .subscribe()
```

### Utility Functions
**Location**: `src/lib/`

#### User Utilities
```typescript
// Get user display name
getUserDisplayName(user)

// Get requestor display name
getRequestorDisplayName(request)

// Fetch user profiles
fetchUserProfiles(userIds)
```

#### Date Utilities
```typescript
// Format date for display
formatDate(dateString)

// Calculate date differences
calculateDateDifference(startDate, endDate)
```

---

## Troubleshooting

### Common Issues

#### Build Issues
**Problem**: Build fails with TypeScript errors
**Solution**: 
- Check TypeScript configuration
- Ensure all imports have proper types
- Update dependencies to compatible versions

**Problem**: Vite build optimization warnings
**Solution**:
- Implement code splitting for large components
- Use dynamic imports for heavy dependencies
- Configure manual chunks in Vite config

#### Runtime Issues
**Problem**: Supabase connection errors
**Solution**:
- Verify environment variables are set correctly
- Check Supabase project status and configuration
- Ensure network connectivity

**Problem**: Authentication issues
**Solution**:
- Clear browser storage and cookies
- Check Supabase auth configuration
- Verify user roles and permissions

#### Performance Issues
**Problem**: Slow page load times
**Solution**:
- Implement lazy loading for components
- Optimize images and assets
- Use React Query for efficient data fetching

**Problem**: Memory leaks
**Solution**:
- Clean up subscriptions and event listeners
- Use proper dependency arrays in useEffect
- Implement proper component unmounting

### Debugging Tools

#### Development Tools
- **React Developer Tools**: Component inspection and profiling
- **React Query DevTools**: Query state inspection
- **Supabase Dashboard**: Database and auth monitoring
- **Browser DevTools**: Network, performance, and console debugging

#### Logging
```typescript
// Development logging
console.log('Debug info:', data)

// Error logging
console.error('Error occurred:', error)

// Performance monitoring
console.time('Operation')
// ... operation
console.timeEnd('Operation')
```

### Support & Maintenance

#### Regular Maintenance Tasks
- Update dependencies regularly
- Monitor performance metrics
- Review and optimize database queries
- Clean up unused code and assets
- Update documentation

#### Monitoring
- Set up error tracking (e.g., Sentry)
- Monitor application performance
- Track user engagement metrics
- Monitor database performance

---

## Conclusion

The Advise-Connect application is a comprehensive, modern web application built with best practices and scalable architecture. Its modular design, reusable components, and robust feature set make it an effective platform for managing advisory services from request to completion.

The application's architecture supports future growth and feature additions while maintaining code quality and performance. Regular maintenance and updates ensure the platform remains secure, performant, and user-friendly.

For additional support or questions, please refer to the development team or consult the inline code documentation throughout the application.
