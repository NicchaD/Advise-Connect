/**
 * AppLayout.tsx - Main Application Layout Component
 * 
 * OVERVIEW:
 * The AppLayout component provides the consistent layout structure for all main
 * application pages. It wraps page content with the application header and
 * provides the foundational layout structure that ensures consistency across
 * the entire application.
 * 
 * FEATURES:
 * 1. Consistent Header - Persistent navigation and user controls
 * 2. Responsive Layout - Adapts to different screen sizes
 * 3. Tooltip Context - Provides tooltip functionality to child components
 * 4. Semantic Structure - Proper HTML5 semantic elements
 * 5. Theme Integration - Supports light/dark theme switching
 * 
 * LAYOUT STRUCTURE:
 * ```
 * ┌─────────────────────────────────────┐
 * │            AppHeader                │ ← Navigation, user menu, branding
 * ├─────────────────────────────────────┤
 * │                                     │
 * │            Main Content             │ ← Page-specific content (children)
 * │            (children)               │
 * │                                     │
 * └─────────────────────────────────────┘
 * ```
 * 
 * USAGE:
 * This component is used in App.tsx to wrap all main application routes.
 * Authentication pages (login, signup) do not use this layout to provide
 * a focused, distraction-free experience.
 * 
 * ACCESSIBILITY:
 * - Uses semantic HTML5 elements (main)
 * - Provides proper document structure for screen readers
 * - Maintains focus management through tooltip provider
 * - Supports keyboard navigation throughout the layout
 */

import React from 'react';
import { AppHeader } from './AppHeader';           // Main navigation header component
import { TooltipProvider } from '@/components/ui/tooltip';  // Tooltip context provider

/**
 * AppLayoutProps Interface
 * 
 * @param children - React nodes to be rendered in the main content area
 */
interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * AppLayout Component
 * 
 * RESPONSIBILITIES:
 * 1. Provide consistent layout structure across all main app pages
 * 2. Render the application header with navigation and user controls
 * 3. Wrap content in semantic HTML5 main element
 * 4. Ensure minimum full-screen height for proper layout
 * 5. Provide tooltip context for interactive elements
 * 
 * STYLING:
 * - min-h-screen: Ensures full viewport height coverage
 * - bg-background: Uses theme-aware background color
 * - flex-1: Allows main content to expand and fill available space
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
};