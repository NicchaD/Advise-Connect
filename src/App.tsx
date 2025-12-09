/**
 * App.tsx - Main Application Component
 * 
 * OVERVIEW:
 * This is the root component of the Advise-Connect application. It sets up the entire
 * application architecture including routing, global providers, theme management, and
 * notification systems. The component orchestrates all major application concerns.
 * 
 * ARCHITECTURE:
 * - Provider Hierarchy: QueryClient → Theme → Tooltip → Router
 * - Route Organization: Layout-wrapped routes vs standalone auth routes
 * - Global Services: Notifications, tooltips, query caching, theming
 * 
 * KEY RESPONSIBILITIES:
 * 1. Application Bootstrap - Initialize all global providers and services
 * 2. Routing Configuration - Define all application routes and navigation
 * 3. Layout Management - Apply consistent layout to main application routes
 * 4. Global State Setup - Configure query client and theme management
 * 5. Notification System - Setup toast notifications and sonner alerts
 * 
 * ROUTE STRUCTURE:
 * - Main Routes: Include AppLayout wrapper for consistent header/navigation
 * - Auth Routes: Standalone pages without persistent layout elements
 * - Admin Routes: Protected administrative interfaces
 * - Catch-all: 404 handling with layout consistency
 */

// UI Components - Toast notifications and tooltips for user feedback
import { Toaster } from "@/components/ui/toaster";           // shadcn/ui toast system
import { Toaster as Sonner } from "@/components/ui/sonner";  // Alternative sonner toast system
import { TooltipProvider } from "@/components/ui/tooltip";   // Global tooltip context

// Data Management - React Query for server state management
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Routing - React Router for client-side navigation
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layout & Theme - Global layout and theming providers
import { ThemeProvider } from "@/components/ThemeProvider";  // Custom theme management
import { AppLayout } from "@/components/AppLayout";          // Consistent app layout wrapper

// Page Components - All route-level components
import Index from "./pages/Index";                          // Landing/home page
import { Dashboard } from "./pages/Dashboard";               // Main user dashboard
import AdminLogin from "./pages/AdminLogin";                // Admin authentication
import AdminDashboard from "./pages/AdminDashboard";        // Administrative interface
import NotFound from "./pages/NotFound";                    // 404 error page
import Login from "./pages/Login";                          // User authentication
import SignUp from "./pages/SignUp";                        // User registration
import ForgotPassword from "./pages/ForgotPassword";        // Password recovery
import MyRequests from "./pages/MyRequests";                // User's submitted requests
import MyItems from "./pages/MyItems";                      // Service provider's assigned items
import InformationHub from "./pages/InformationHub";        // Knowledge base and announcements

// Global Styles - Application-wide CSS
import './App.css';

/**
 * Global Query Client Configuration
 * 
 * Configures React Query for server state management across the entire application.
 * Handles caching, background updates, and error handling for all API calls.
 */
const queryClient = new QueryClient();

/**
 * App Component - Application Root
 * 
 * PROVIDER HIERARCHY:
 * 1. QueryClientProvider - Enables React Query throughout the app
 * 2. ThemeProvider - Manages light/dark theme with localStorage persistence
 * 3. TooltipProvider - Provides tooltip context for all components
 * 4. BrowserRouter - Enables client-side routing
 * 
 * ROUTE ORGANIZATION:
 * - Layout Routes: Main app pages with persistent header and navigation
 * - Auth Routes: Standalone authentication pages without layout wrapper
 * - Admin Routes: Administrative interfaces with layout
 * - Fallback: 404 page with layout for consistency
 * 
 * NOTIFICATION SYSTEMS:
 * - Toaster: Primary toast notification system from shadcn/ui
 * - Sonner: Alternative toast system for enhanced notifications
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="advisory-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Routes with persistent header */}
            <Route path="/" element={<AppLayout><Index /></AppLayout>} />
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/my-requests" element={<AppLayout><MyRequests /></AppLayout>} />
            <Route path="/my-items" element={<AppLayout><MyItems /></AppLayout>} />
            <Route path="/admin-dashboard" element={<AppLayout><AdminDashboard /></AppLayout>} />
            <Route path="/information-hub" element={<AppLayout><InformationHub /></AppLayout>} />
            
            {/* Auth routes without persistent header */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
