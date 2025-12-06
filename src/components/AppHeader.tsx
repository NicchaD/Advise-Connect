import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import { 
  Home, 
  BarChart3, 
  Users, 
  Settings, 
  BookOpen, 
  Shield, 
  LogIn,
  LayoutDashboard
} from 'lucide-react';

export const AppHeader = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConsultant, setIsConsultant] = useState(false);
  const [isSpecialAdminConsultant, setIsSpecialAdminConsultant] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, title')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setProfile(profile);
        
        if (profile && profile.role === 'Admin') {
          setIsAdmin(true);
        }
        
        if (profile && ['Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head'].includes(profile.title)) {
          console.log('Setting isConsultant to true for user with title:', profile.title);
          setIsConsultant(true);
        }
        
        // Check for special admin consultant category
        if (profile && profile.role === 'Admin' && 
            ['Advisory Consultant', 'Advisory Service Head', 'Advisory Service Lead'].includes(profile.title)) {
          setIsSpecialAdminConsultant(true);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setIsConsultant(false);
      setIsSpecialAdminConsultant(false);
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const isActivePage = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Main Header */}
      <header className="border-b bg-gradient-hero shadow-hero sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          {/* Main Title */}
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
              Delivery Excellence Advisory Services
            </h1>
            <p className="text-white/90 text-lg mt-2">Next-Generation Professional Consulting Services</p>
          </div>
          
          {/* Sub Navigation */}
          <nav className="flex flex-wrap justify-center items-center gap-3">
            {user && (
              <Button
                variant={isActivePage('/') ? 'secondary' : 'outline'}
                onClick={() => navigate('/')}
                className={`transition-all duration-300 px-4 ${
                  isActivePage('/')
                    ? 'bg-white text-primary shadow-elegant border-white scale-105 hover:bg-white/95'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105'
                }`}
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
            {user && (
              <>
                <Button
                  variant={isActivePage('/my-requests') ? 'secondary' : 'outline'}
                  onClick={() => navigate('/my-requests')}
                  className={`transition-all duration-300 px-4 ${
                    isActivePage('/my-requests')
                      ? 'bg-white text-primary shadow-elegant border-white scale-105 hover:bg-white/95'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105'
                  }`}
                >
                  <Users className="h-4 w-4 mr-2" />
                  My Requests
                </Button>
                {profile && ['Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head'].includes(profile.title) && (
                  <>
                    <Button
                      variant={isActivePage('/dashboard') ? 'secondary' : 'outline'}
                      onClick={() => navigate('/dashboard')}
                      className={`transition-all duration-300 px-4 ${
                        isActivePage('/dashboard')
                          ? 'bg-white text-primary shadow-elegant border-white scale-105 hover:bg-white/95'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                    <Button
                      variant={isActivePage('/my-items') ? 'secondary' : 'outline'}
                      onClick={() => navigate('/my-items')}
                      className={`transition-all duration-300 px-4 ${
                        isActivePage('/my-items')
                          ? 'bg-white text-primary shadow-elegant border-white scale-105 hover:bg-white/95'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      My Queue
                    </Button>
                  </>
                )}
                {isAdmin && (
                  <Button
                    variant={isActivePage('/admin-dashboard') ? 'secondary' : 'outline'}
                    onClick={() => navigate('/admin-dashboard')}
                    className={`transition-all duration-300 px-4 ${
                      isActivePage('/admin-dashboard')
                        ? 'bg-white text-primary shadow-elegant border-white scale-105 hover:bg-white/95'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                )}
              </>
            )}
            
            <Button
              variant={isActivePage('/information-hub') ? 'secondary' : 'outline'}
              onClick={() => navigate('/information-hub')}
              className={`transition-all duration-300 px-4 ${
                isActivePage('/information-hub')
                  ? 'bg-white text-primary shadow-elegant border-white scale-105 hover:bg-white/95'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105'
              }`}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Information Hub
            </Button>
            
            {user ? (
              <>
                <div className="bg-white/10 border border-white/20 rounded-md p-1">
                  <UserProfileDropdown user={user} />
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-smooth px-4"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-smooth px-4"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
            )}
          </nav>
        </div>
      </header>

    </>
  );
};