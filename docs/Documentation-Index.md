# Advise-Connect Documentation Index

## Overview

This document provides a comprehensive index of all documentation available for the Advise-Connect project. The documentation is organized by component type and includes both inline code documentation and external documentation files.

## Documentation Status

### ✅ Completed Documentation

#### Project Overview
- **[Project-Overview.md](./Project-Overview.md)** - Complete project architecture and overview
- **[README-Documentation.md](./README-Documentation.md)** - Development guidelines and project structure

#### Core Application Files
- **[App.tsx](../src/App.tsx)** - Main application component with routing and providers
- **[main.tsx](../src/main.tsx)** - Application entry point and React 18 initialization

#### Page Components
- **[MyRequests.tsx](../src/pages/MyRequests.tsx)** - Request management dashboard (fully documented)
  - **[MyRequests-Documentation.md](./MyRequests-Documentation.md)** - Comprehensive component documentation
- **[Dashboard.tsx](../src/pages/Dashboard.tsx)** - Main user dashboard (header documentation added)

#### Core Components
- **[AppLayout.tsx](../src/components/AppLayout.tsx)** - Main application layout wrapper

#### Custom Hooks
- **[useFormPersistence.ts](../src/hooks/useFormPersistence.ts)** - Form data persistence across sessions

### 🔄 In Progress Documentation

#### Main App Files
- **App.css** - Global styles and CSS custom properties
- **index.css** - Tailwind CSS base styles and global overrides

### 📋 Pending Documentation

#### Page Components
- **Index.tsx** - Landing/home page component
- **Login.tsx** - User authentication page
- **SignUp.tsx** - User registration page
- **ForgotPassword.tsx** - Password recovery page
- **AdminLogin.tsx** - Administrator authentication
- **AdminDashboard.tsx** - Administrative interface
- **MyItems.tsx** - Service provider's assigned items dashboard
- **InformationHub.tsx** - Knowledge base and announcements
- **NotFound.tsx** - 404 error page

#### Core Components
- **AppHeader.tsx** - Main navigation header
- **ThemeProvider.tsx** - Theme management and switching
- **UserProfileDropdown.tsx** - User menu and profile options

#### Feature Components
- **RequestSubmissionForm.tsx** - Multi-step request submission
- **RequestOversight.tsx** - Request management interface
- **MultiServiceRequestForm.tsx** - Multi-service request handling
- **UserManagement.tsx** - User administration interface
- **SystemSettings.tsx** - System configuration
- **SearchModule.tsx** - Global search functionality

#### Information Hub Components
- **KeyAnnouncements.tsx** - System announcements
- **KnowledgeArticles.tsx** - Knowledge base articles
- **TrainingCalendar.tsx** - Training and events calendar
- **AddAnnouncementDialog.tsx** - Announcement creation
- **AddKnowledgeArticleDialog.tsx** - Article creation
- **ContentViewDialog.tsx** - Content viewing modal
- **InfoHubFilters.tsx** - Content filtering interface

#### Request Management Components
- **RequestFeedbackForm.tsx** - Legacy feedback form
- **RequestFeedbackSection.tsx** - Modern feedback interface
- **RequestTimeline.tsx** - Request status timeline
- **RequestComments.tsx** - Comment system
- **TimesheetSection.tsx** - Time tracking interface
- **StatusTransitionDropdown.tsx** - Status change controls

#### Activity Management Components
- **ActivitiesManagement.tsx** - Activity configuration
- **ActivitiesSection.tsx** - Activity selection interface
- **MultiServiceActivitiesSection.tsx** - Multi-service activities
- **ServiceOfferingsSelection.tsx** - Service selection interface

#### UI and Utility Components
- **EditableProjectDetails.tsx** - Project information editing
- **LoginPromptDialog.tsx** - Authentication prompts
- **RestoreFormDialog.tsx** - Form data recovery
- **AIAssistant.tsx** - AI-powered assistance
- **AISummarizeButton.tsx** - AI content summarization
- **InsightsSection.tsx** - Analytics and insights

#### Custom Hooks
- **useRequestSubmission.ts** - Request submission logic
- **use-toast.ts** - Toast notification system
- **use-mobile.tsx** - Mobile device detection

#### Utility Libraries
- **userUtils.ts** - User management utilities
- **utils.ts** - Common utility functions

#### Integration Files
- **supabase/client.ts** - Database client configuration
- **supabase/types.ts** - Database type definitions

## Documentation Standards

### File Header Documentation
Each component file should include:
```typescript
/**
 * ComponentName.tsx - Brief Description
 * 
 * OVERVIEW:
 * Detailed description of the component's purpose and functionality
 * 
 * FEATURES:
 * 1. Feature 1 - Description
 * 2. Feature 2 - Description
 * 
 * USAGE:
 * How the component is used within the application
 * 
 * PROPS/PARAMETERS:
 * Description of props or parameters
 */
```

### Function Documentation
```typescript
/**
 * Function Description
 * 
 * @param param1 - Description of parameter
 * @param param2 - Description of parameter
 * @returns Description of return value
 * 
 * EXAMPLE:
 * ```typescript
 * const result = functionName(param1, param2);
 * ```
 */
```

### Inline Comments
- **Purpose Comments**: Explain why code exists
- **Process Comments**: Explain complex logic or algorithms
- **Context Comments**: Provide business context or requirements
- **TODO Comments**: Mark areas for future improvement

## Documentation Priorities

### High Priority (Core Functionality)
1. **Page Components** - Main user-facing interfaces
2. **Core Components** - Essential layout and navigation
3. **Custom Hooks** - Reusable business logic
4. **Utility Functions** - Common helper functions

### Medium Priority (Feature Components)
1. **Request Management** - Request lifecycle components
2. **User Management** - User administration and profiles
3. **Information Hub** - Knowledge sharing components
4. **Activity Management** - Service and activity configuration

### Low Priority (UI Components)
1. **Dialog Components** - Modal and popup interfaces
2. **Form Components** - Specialized form elements
3. **Display Components** - Data presentation components

## External Documentation Files

### Component-Specific Documentation
- **MyRequests-Documentation.md** - Comprehensive MyRequests component guide
- **Dashboard-Documentation.md** - Dashboard component guide (planned)
- **RequestSubmission-Documentation.md** - Request submission flow guide (planned)

### System Documentation
- **API-Documentation.md** - Supabase API and database schema (planned)
- **Deployment-Guide.md** - Production deployment instructions (planned)
- **Testing-Guide.md** - Testing strategies and examples (planned)
- **Security-Guide.md** - Security considerations and best practices (planned)

### User Documentation
- **User-Guide.md** - End-user documentation (planned)
- **Admin-Guide.md** - Administrator documentation (planned)
- **Troubleshooting-Guide.md** - Common issues and solutions (planned)

## Contributing to Documentation

### Adding New Documentation
1. **Follow Standards**: Use established documentation templates
2. **Be Comprehensive**: Cover purpose, usage, and examples
3. **Update Index**: Add new documentation to this index
4. **Cross-Reference**: Link related components and concepts

### Updating Existing Documentation
1. **Keep Current**: Update documentation when code changes
2. **Maintain Accuracy**: Ensure examples and descriptions are correct
3. **Improve Clarity**: Enhance explanations based on user feedback
4. **Version Control**: Commit documentation changes with code changes

### Documentation Review Process
1. **Technical Accuracy**: Verify code examples and descriptions
2. **Clarity**: Ensure documentation is clear and understandable
3. **Completeness**: Check that all important aspects are covered
4. **Consistency**: Maintain consistent style and format

## Tools and Resources

### Documentation Tools
- **Markdown**: Primary documentation format
- **JSDoc**: Inline code documentation
- **TypeScript**: Type definitions serve as documentation
- **Comments**: Inline explanations and context

### External Resources
- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **shadcn/ui**: https://ui.shadcn.com/

## Next Steps

### Immediate Actions
1. **Complete Page Documentation** - Document all remaining page components
2. **Core Component Documentation** - Document AppHeader, ThemeProvider
3. **Hook Documentation** - Complete all custom hooks
4. **Utility Documentation** - Document utility functions

### Future Enhancements
1. **Interactive Documentation** - Consider tools like Storybook
2. **Video Tutorials** - Create video guides for complex features
3. **API Documentation** - Generate API docs from code
4. **User Guides** - Create end-user documentation

This documentation index will be updated as new documentation is added to the project. The goal is to have comprehensive documentation that makes the codebase accessible to any developer, regardless of their familiarity with the project.
