import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserManagement } from '@/components/UserManagement';
import { RequestOversight } from '@/components/RequestOversight';
import { SystemSettings } from '@/components/SystemSettings';
import { Users, FileText, Settings, Shield, LogOut, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');
  const [advisoryTeamPrefillData, setAdvisoryTeamPrefillData] = useState<{
    name: string;
    title: string;
    email: string;
  } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setIsAdmin(false);
        toast({
          title: "Access Denied",
          description: "Please log in to access admin features",
          variant: "destructive"
        });
        navigate('/admin-login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setIsAdmin(false);
        toast({
          title: "Access Denied",
          description: "Unable to verify user permissions",
          variant: "destructive"
        });
        navigate('/admin-login');
        return;
      }

      if (profile.role === 'Admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        toast({
          title: "Access Denied",
          description: "You don't have administrator privileges",
          variant: "destructive"
        });
        navigate('/admin-login');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
      toast({
        title: "Error",
        description: "Failed to verify admin access",
        variant: "destructive"
      });
      navigate('/admin-login');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToAdvisoryTeam = (userData: { name: string; title: string; email: string; }) => {
    setAdvisoryTeamPrefillData(userData);
    setActiveTab('settings');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "Successfully logged out of admin dashboard",
      });
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-8 w-8 mx-auto mb-4 text-primary animate-pulse" />
          <p>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Request Oversight
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement onAddToAdvisoryTeam={handleAddToAdvisoryTeam} />
          </TabsContent>

          <TabsContent value="requests">
            <RequestOversight />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettings 
              advisoryTeamPrefillData={advisoryTeamPrefillData}
              onClearPrefillData={() => setAdvisoryTeamPrefillData(null)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}