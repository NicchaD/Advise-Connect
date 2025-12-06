import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import ServiceOfferingsSelection from './ServiceOfferingsSelection';
import MultiServiceRequestForm from './MultiServiceRequestForm';
import { 
  Code2, 
  Lightbulb, 
  TrendingUp, 
  Search, 
  BookOpen, 
  Settings,
  Github,
  Bot,
  Shield,
  TestTube,
  Bug,
  GitBranch,
  Wrench,
  Sun,
  Moon,
  ArrowRight,
  Users,
  BarChart3,
  Zap,
  Target,
  Star,
  Sparkles,
  Rocket,
  Globe,
  Home
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { SearchModule } from '@/components/SearchModule';
import UserRequestsView from '@/components/UserRequestsView';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import RestoreFormDialog from './RestoreFormDialog';
import { useFormPersistence } from '@/hooks/useFormPersistence';

const ADVISORY_SERVICES = [
  {
    id: 'engineering-excellence',
    title: 'Engineering Excellence',
    description: 'Enhance your development practices with modern tools and methodologies',
    icon: Code2,
    offerings: [
      { id: 'github', name: 'GitHub', icon: Github },
      { id: 'github-copilot', name: 'GitHub Copilot', icon: Bot },
      { id: 'sonarqube', name: 'SonarQube', icon: Shield },
      { id: 'junit', name: 'JUnit', icon: TestTube },
      { id: 'nunit', name: 'NUnit', icon: TestTube },
      { id: 'jira', name: 'JIRA', icon: Bug },
      { id: 'azure-devops', name: 'Azure DevOps', icon: GitBranch },
      { id: 'jenkins', name: 'Jenkins', icon: Wrench }
    ]
  },
  {
    id: 'innovation-management',
    title: 'Innovation Management',
    description: 'Drive innovation through strategic planning and creative solutions',
    icon: Lightbulb,
    offerings: [
      { id: 'innovation-strategy', name: 'Innovation Strategy', icon: Lightbulb },
      { id: 'design-thinking', name: 'Design Thinking', icon: Search },
      { id: 'prototype-development', name: 'Prototype Development', icon: Wrench },
      { id: 'market-research', name: 'Market Research', icon: TrendingUp }
    ]
  },
  {
    id: 'delivery-transformation',
    title: 'Delivery Transformation and Governance Services',
    description: 'Transform your delivery capabilities with governance frameworks',
    icon: TrendingUp,
    offerings: [
      { id: 'agile-transformation', name: 'Agile Transformation', icon: TrendingUp },
      { id: 'governance-framework', name: 'Governance Framework', icon: Settings },
      { id: 'delivery-optimization', name: 'Delivery Optimization', icon: ArrowRight },
      { id: 'performance-metrics', name: 'Performance Metrics', icon: Settings }
    ]
  },
  {
    id: 'deep-dive-assessments',
    title: 'Deep-Dive Assessments',
    description: 'Comprehensive analysis of your current state and improvement opportunities',
    icon: Search,
    offerings: [
      { id: 'technical-assessment', name: 'Technical Assessment', icon: Code2 },
      { id: 'process-assessment', name: 'Process Assessment', icon: Settings },
      { id: 'security-assessment', name: 'Security Assessment', icon: Shield },
      { id: 'performance-assessment', name: 'Performance Assessment', icon: TrendingUp }
    ]
  },
  {
    id: 'knowledge-management',
    title: 'Knowledge Management',
    description: 'Optimize knowledge sharing and documentation across your organization',
    icon: BookOpen,
    offerings: [
      { id: 'documentation-strategy', name: 'Documentation Strategy', icon: BookOpen },
      { id: 'knowledge-sharing', name: 'Knowledge Sharing', icon: Lightbulb },
      { id: 'training-programs', name: 'Training Programs', icon: TestTube },
      { id: 'best-practices', name: 'Best Practices', icon: Settings }
    ]
  },
  {
    id: 'process-consulting',
    title: 'Process Consulting',
    description: 'Streamline and optimize your business processes for maximum efficiency',
    icon: Settings,
    offerings: [
      { id: 'process-optimization', name: 'Process Optimization', icon: TrendingUp },
      { id: 'workflow-automation', name: 'Workflow Automation', icon: Bot },
      { id: 'efficiency-analysis', name: 'Efficiency Analysis', icon: Search },
      { id: 'change-management', name: 'Change Management', icon: ArrowRight }
    ]
  }
];

const LIVE_STATS = [
  { label: 'Active Projects', value: '250+', icon: Rocket, trend: '+12%' },
  { label: 'Consultants', value: '50+', icon: Users, trend: '+8%' },
  { label: 'Success Rate', value: '98%', icon: Target, trend: '+2%' },
  { label: 'Client Satisfaction', value: '4.9/5', icon: Star, trend: '+0.3' }
];

const FEATURE_HIGHLIGHTS = [
  {
    title: 'AI-Powered Matching',
    description: 'Smart consultant assignment based on expertise and workload',
    icon: Bot,
    color: 'bg-gradient-primary'
  },
  {
    title: 'Real-time Analytics',
    description: 'Live project tracking and performance metrics',
    icon: BarChart3,
    color: 'bg-gradient-secondary'
  },
  {
    title: 'Instant Deployment',
    description: 'Rapid service deployment with automated workflows',
    icon: Zap,
    color: 'bg-gradient-accent'
  },
  {
    title: 'Global Expertise',
    description: 'Access to worldwide network of specialized consultants',
    icon: Globe,
    color: 'bg-gradient-stats'
  }
];

export default function AdvisoryServicesApp() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'landing' | 'offerings' | 'form'>('landing');
  const [selectedOfferings, setSelectedOfferings] = useState<Record<string, string[]>>({});
  const [showSearchModule, setShowSearchModule] = useState(false);
  const [showUserRequests, setShowUserRequests] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConsultant, setIsConsultant] = useState(false);
  const [advisoryServices, setAdvisoryServices] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [liveStats, setLiveStats] = useState(LIVE_STATS);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [savedFormData, setSavedFormData] = useState<any>(null);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form persistence hook for multi-service requests
  const { checkForRestoredData, clearFormData } = useFormPersistence({ 
    formType: 'multi_service',
    expiryDuration: 10 
  });

  useEffect(() => {
    checkAuthStatus();
    loadAdvisoryServices();
    loadLiveStatistics();
    
    // Check for restored form data on initial load
    checkForFormData();
  }, []);
  
  const checkForFormData = async () => {
    try {
      const restoredData = await checkForRestoredData();
      if (restoredData) {
        setSavedFormData(restoredData);
        setShowRestoreDialog(true);
      }
    } catch (error) {
      console.error('Error checking for restored form data:', error);
    }
  };

  useEffect(() => {
    // Scroll to services section if coming from "Create New Request"
    if (location.state?.scrollToServices) {
      setTimeout(() => {
        document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    // Check if user should restore form after login
    if (location.state?.restoreForm) {
      checkForFormData();
    }
  }, [location.state]);

  const handlePlaceRequest = async () => {
    if (savedFormData) {
      // Restore the form state and open the form with saved data for immediate submission
      setSelectedServices(savedFormData.selectedServices || []);
      setSelectedOfferings(savedFormData.selectedOfferings || {});
      setCurrentView('form');
      setShowRestoreDialog(false);
      
      // Pass the saved data to the form for immediate submission
      // The form component will handle the immediate submission
    }
  };

  const handleCancelRestore = async () => {
    // Clear saved data and go back to landing page
    await clearFormData();
    setSavedFormData(null);
    setShowRestoreDialog(false);
    setCurrentView('landing');
  };

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
          setIsConsultant(true);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const loadLiveStatistics = async () => {
    try {
      // Fetch total requests count
      const { count: totalRequests, error: requestsError } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true });

      if (requestsError) {
        console.error('Error fetching requests count:', requestsError);
        return;
      }

      // Fetch total consultants count
      const { count: totalConsultants, error: consultantsError } = await supabase
        .from('advisory_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (consultantsError) {
        console.error('Error fetching consultants count:', consultantsError);
        return;
      }

      // Fetch rejected requests count for success rate calculation
      const { count: rejectedRequests, error: rejectedError } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Reject');

      if (rejectedError) {
        console.error('Error fetching rejected requests count:', rejectedError);
        return;
      }

      // Fetch average satisfaction rating from feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('request_feedback')
        .select('satisfaction_rating');

      if (feedbackError) {
        console.error('Error fetching feedback data:', feedbackError);
        return;
      }

      // Calculate statistics
      const activeProjects = totalRequests || 0;
      const consultants = totalConsultants || 0;
      const successfulRequests = (totalRequests || 0) - (rejectedRequests || 0);
      const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0;
      
      const avgSatisfaction = feedbackData && feedbackData.length > 0
        ? (feedbackData.reduce((sum, feedback) => sum + (feedback.satisfaction_rating || 0), 0) / feedbackData.length).toFixed(1)
        : '4.9';

      // Update live stats with real data
      setLiveStats([
        { 
          label: 'Active Projects', 
          value: activeProjects.toString(), 
          icon: Rocket, 
          trend: activeProjects > 250 ? '+12%' : `${activeProjects}` 
        },
        { 
          label: 'Consultants', 
          value: consultants.toString(), 
          icon: Users, 
          trend: consultants > 50 ? '+8%' : `${consultants}` 
        },
        { 
          label: 'Success Rate', 
          value: `${successRate}%`, 
          icon: Target, 
          trend: successRate > 90 ? '+2%' : `${successRate}%` 
        },
        { 
          label: 'Client Satisfaction', 
          value: `${avgSatisfaction}/5`, 
          icon: Star, 
          trend: parseFloat(avgSatisfaction) > 4.5 ? '+0.3' : avgSatisfaction 
        }
      ]);

    } catch (error) {
      console.error('Error loading live statistics:', error);
      // Keep default hardcoded stats on error
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setIsConsultant(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const loadAdvisoryServices = async () => {
    // Always set static data as fallback first
    setAdvisoryServices(ADVISORY_SERVICES);
    
    try {
      const { data: services, error: servicesError } = await supabase
        .from('advisory_services')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (servicesError) {
        console.error('Error loading advisory services:', servicesError);
        // Already have static data as fallback
        return;
      }

      const { data: offerings, error: offeringsError } = await supabase
        .from('service_offerings')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (offeringsError) {
        console.error('Error loading service offerings:', offeringsError);
        // Already have static data as fallback
        return;
      }

      // Only replace with database data if we successfully fetched both services and offerings
      if (services && services.length > 0 && offerings) {
        try {
          // Map database data to component format
          const serviceMap = services.map(service => {
            const serviceOfferings = offerings
              .filter(offering => offering.advisory_service_id === service.id)
              .map(offering => ({
                id: offering.id.toString(), // Convert to string for consistency
                name: offering.name,
                icon: getIconComponent(offering.icon)
              }));

            return {
              id: service.id.toString(), // Convert to string for consistency
              title: service.name,
              description: service.description || '',
              icon: getIconComponent(service.icon),
              offerings: serviceOfferings
            };
          });

          // Only update if we have valid services mapped
          if (serviceMap.length > 0) {
            console.log('Successfully mapped database services:', serviceMap.length);
            setAdvisoryServices(serviceMap);
          } else {
            console.log('No valid services mapped, keeping static data');
          }
        } catch (mappingError) {
          console.error('Error mapping database services:', mappingError);
          // Keep static data as fallback
        }
      } else {
        console.log('Insufficient database data, keeping static fallback');
      }
    } catch (error) {
      console.error('Error loading advisory services:', error);
      // Already have static data as fallback
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      Code: Code2, 
      Code2, 
      Lightbulb, 
      TrendingUp, 
      Truck: TrendingUp, // Map Truck to TrendingUp as fallback
      Search, 
      BookOpen, 
      Settings,
      Github,
      Bot,
      Shield,
      TestTube,
      Bug,
      GitBranch,
      Wrench,
      Money: Settings, // Map Money to Settings as fallback
      Target,
      Zap,
      Map: Search, // Map Map to Search as fallback
      Database: BookOpen, // Map Database to BookOpen as fallback
      CheckCircle: Search, // Map CheckCircle to Search as fallback
      Award: Target, // Map Award to Target as fallback
      RefreshCw: Settings, // Map RefreshCw to Settings as fallback
      FileText: BookOpen, // Map FileText to BookOpen as fallback
      Users,
      AlertCircle: Settings, // Map AlertCircle to Settings as fallback
      BarChart: BarChart3, // Map BarChart to BarChart3
      GraduationCap: BookOpen, // Map GraduationCap to BookOpen as fallback
      Share2: Settings, // Map Share2 to Settings as fallback
      GitCompare: Search, // Map GitCompare to Search as fallback
      'Artificial Intelligence': Bot, // Map AI to Bot
      resource: Users // Map resource to Users
    };
    return iconMap[iconName] || Code2;
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleProceedToOfferings = () => {
    setCurrentView('offerings');
  };

  const handleProceedWithRequest = (offerings: Record<string, string[]>) => {
    setSelectedOfferings(offerings);
    setCurrentView('form');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  const resetForm = () => {
    setSelectedServices([]);
    setSelectedOfferings({});
    setCurrentView('landing');
  };

  const handleFormSuccess = () => {
    resetForm();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {currentView === 'landing' && (
          <>
            {/* Hero Section with Enhanced Ribbon */}
            <Card className="bg-gradient-to-r from-primary via-primary-glow to-secondary text-white border-0 shadow-2xl mb-8 animate-fade-in overflow-hidden relative">
              {/* Decorative Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')]"></div>
              </div>
              <CardContent className="p-12 relative z-10">
                {/* Sub-header */}
                <div className="text-center relative">
                  <div className="inline-block mb-4">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-6 py-2 shadow-lg">
                      <h2 className="text-2xl font-semibold mb-0 text-white drop-shadow-lg">
                        Welcome to Advisory Services
                      </h2>
                    </div>
                  </div>
                  <p className="text-2xl text-white/95 mb-8 leading-relaxed font-light">
                    Accelerate your business transformation with our expert consulting services
                  </p>
                  <div className="flex flex-wrap justify-center gap-6">
                    <Button
                      onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-white text-primary hover:bg-white/90 font-semibold px-10 py-4 text-xl shadow-2xl hover:scale-105 transition-all duration-300"
                    >
                      Explore Services
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </Button>
                    {user && (
                      <Button
                        onClick={() => setShowUserRequests(true)}
                        className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary font-semibold px-10 py-4 text-xl shadow-2xl hover:scale-105 transition-all duration-300"
                      >
                        View My Requests
                        <Search className="ml-3 h-6 w-6" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Statistics */}
            <Card className="mb-12 bg-gradient-stats shadow-hero border-0 text-white animate-fade-in">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Live Platform Statistics
                </CardTitle>
                <CardDescription className="text-white/90">
                  Real-time data from our Cognizant advisory platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {liveStats.map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                      <div key={index} className="text-center">
                        <div className="bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                          <IconComponent className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{stat.value}</div>
                        <div className="text-sm text-white/90 mb-1">{stat.label}</div>
                        <div className="text-xs text-orange-200 font-medium">{stat.trend}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Feature Highlights */}
            <Card className="mb-12 bg-gradient-card border-0 shadow-colored animate-slide-up">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <Zap className="h-6 w-6 text-primary" />
                  Platform Features
                </CardTitle>
                <CardDescription>
                  Cutting-edge technology powering your advisory experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {FEATURE_HIGHLIGHTS.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <Card key={index} className="border-0 shadow-soft hover:shadow-glow transition-all duration-300 hover:scale-105">
                        <CardContent className="p-6 text-center">
                          <div className={`${feature.color} rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-colored`}>
                            <IconComponent className="h-8 w-8 text-white" />
                          </div>
                          <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Service Selection */}
            <Card className="mb-8 bg-gradient-card border-0 shadow-medium animate-fade-in" id="services">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" />
                  Select Advisory Services
                </CardTitle>
                <CardDescription className="text-lg text-left">
                  Choose one or more services that best suits your business needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {advisoryServices.map((service) => {
                    const IconComponent = service.icon;
                    const isSelected = selectedServices.includes(service.id);
                    return (
                      <div key={service.id} className="relative">
                        <Label
                          htmlFor={service.id}
                          className="cursor-pointer block"
                        >
                          <Card className={`
                            transition-all duration-300 hover:shadow-glow hover:scale-105 
                            ${isSelected ? 'ring-2 ring-primary bg-gradient-hover shadow-colored' : 'hover:bg-gradient-hover shadow-soft'}
                          `}>
                            <CardHeader className="pb-4">
                              <div className="flex items-center gap-4">
                                <div className={`
                                  p-3 rounded-xl shadow-soft
                                  ${isSelected ? 'bg-gradient-primary text-white shadow-colored' : 'bg-muted'}
                                `}>
                                  <IconComponent className="h-6 w-6" />
                                </div>
                                <Checkbox
                                  id={service.id}
                                  checked={isSelected}
                                  onCheckedChange={() => handleServiceToggle(service.id)}
                                  className="border-2"
                                />
                              </div>
                              <CardTitle className="text-lg font-semibold mb-2">
                                {service.title}
                              </CardTitle>
                              <CardDescription className="text-sm leading-relaxed">
                                {service.description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="text-xs text-muted-foreground">
                                {service.offerings.length} offerings available
                              </div>
                            </CardContent>
                          </Card>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Proceed Button */}
            {selectedServices.length > 0 && (
              <Card className="bg-gradient-stats text-white border-0 shadow-hero animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Services Selected</h3>
                      <p className="text-white/90">
                        {selectedServices.length} advisory service{selectedServices.length > 1 ? 's' : ''} selected
                      </p>
                       <div className="flex flex-wrap gap-2 mt-2">
                         {selectedServices.map(serviceId => {
                           const service = advisoryServices.find(s => s.id === serviceId);
                           return (
                             <Badge key={serviceId} variant="outline" className="bg-white/10 text-white border-white/20">
                               {service?.title}
                             </Badge>
                           );
                         })}
                       </div>
                    </div>
                    <Button
                      onClick={handleProceedToOfferings}
                      className="bg-white text-primary hover:bg-white/90 font-semibold px-6 py-3 text-lg"
                    >
                      Proceed
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {currentView === 'offerings' && (
          <ServiceOfferingsSelection
            selectedServices={selectedServices}
            advisoryServices={advisoryServices}
            onProceedWithRequest={handleProceedWithRequest}
            onBack={handleBackToLanding}
          />
        )}
      </div>

      {/* Multi-Service Request Form */}
      {currentView === 'form' && (
        <MultiServiceRequestForm
          selectedServices={selectedServices}
          selectedOfferings={selectedOfferings}
          advisoryServices={advisoryServices}
          onClose={() => setCurrentView('offerings')}
          onSuccess={handleFormSuccess}
          isOpen={true}
          onViewRequest={(requestId) => {
            setShowSearchModule(true);
          }}
          restoredFormData={savedFormData}
        />
      )}

      {/* Search Module Modal */}
      {showSearchModule && (
        <SearchModule 
          isOpen={showSearchModule} 
          onClose={() => setShowSearchModule(false)} 
        />
      )}

      {/* User Requests Modal */}
      {showUserRequests && (
        <UserRequestsView 
          onClose={() => setShowUserRequests(false)} 
        />
      )}

      <RestoreFormDialog
        isOpen={showRestoreDialog}
        onPlaceRequest={handlePlaceRequest}
        onCancel={handleCancelRestore}
      />

      {/* About Us Footer Section */}
      {currentView === 'landing' && (
        <footer className="bg-gradient-hero text-white py-16 mt-16" id="about-us">
          <div className="container mx-auto px-4">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
                  <Globe className="h-8 w-8" />
                  About Cognizant Advisory Services
                </CardTitle>
                <CardDescription className="text-white/90 text-lg">
                  Leading the future of business transformation through expert consultation
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-center">
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">Expert Team</h3>
                  <p className="text-white/80 leading-relaxed">
                    Our global network of 50+ certified consultants brings decades of industry expertise to every project.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">Proven Results</h3>
                  <p className="text-white/80 leading-relaxed">
                    With a 98% success rate and 4.9/5 client satisfaction, we deliver measurable business outcomes.
                  </p>
                </div>
                <div className="space-y-4 md:col-span-2 lg:col-span-1">
                  <div className="bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                    <Rocket className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">Innovation Focus</h3>
                  <p className="text-white/80 leading-relaxed">
                    We leverage cutting-edge technologies and methodologies to accelerate your digital transformation journey.
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="text-center mt-8 text-white/70">
              <p>&copy; 2024 Cognizant Technology Solutions. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}