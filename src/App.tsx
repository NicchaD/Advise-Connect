import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import { Dashboard } from "./pages/Dashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import './App.css';
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import MyRequests from "./pages/MyRequests";
import MyItems from "./pages/MyItems";
import InformationHub from "./pages/InformationHub";

const queryClient = new QueryClient();

// Clear cache and fix toaster import
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
