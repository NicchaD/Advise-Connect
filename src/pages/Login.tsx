import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, User, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    checkExistingSession();
    checkLockStatus();
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        handleSuccessfulLogin(user.id);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const checkLockStatus = () => {
    const lockData = localStorage.getItem('login_lock');
    if (lockData) {
      const { until, attempts } = JSON.parse(lockData);
      const lockTime = new Date(until);
      if (lockTime > new Date()) {
        setLockedUntil(lockTime);
        setFailedAttempts(attempts);
      } else {
        localStorage.removeItem('login_lock');
      }
    }
  };

  const handleFailedAttempt = () => {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);

    if (newAttempts >= 10) {
      const lockUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      setLockedUntil(lockUntil);
      localStorage.setItem('login_lock', JSON.stringify({
        until: lockUntil.toISOString(),
        attempts: newAttempts
      }));
      toast({
        title: "Account Temporarily Locked",
        description: "Too many failed attempts. Please try again in 1 hour.",
        variant: "destructive"
      });
    } else if (newAttempts >= 5) {
      toast({
        title: "Warning",
        description: `${10 - newAttempts} attempts remaining before account lockout.`,
        variant: "destructive"
      });
    }
  };

  const handleSuccessfulLogin = async (userId: string) => {
    try {
      // Clear failed attempts
      localStorage.removeItem('login_lock');
      setFailedAttempts(0);
      setLockedUntil(null);

      // Check for saved form data (anonymous form submission)
      const FORM_DATA_KEY = 'multiServiceFormData';
      const FORM_DATA_EXPIRY_KEY = 'multiServiceFormDataExpiry';
      
      const savedFormData = localStorage.getItem(FORM_DATA_KEY);
      const savedExpiry = localStorage.getItem(FORM_DATA_EXPIRY_KEY);
      
      if (savedFormData && savedExpiry) {
        const expiryTime = parseInt(savedExpiry);
        if (Date.now() < expiryTime) {
          // User has unexpired form data, redirect to home page which will restore the form
          toast({
            title: "Login Successful",
            description: "Redirecting to your unsubmitted form...",
          });
          navigate('/', { state: { restoreForm: true } });
          return;
        } else {
          // Form data expired, clean it up
          localStorage.removeItem(FORM_DATA_KEY);
          localStorage.removeItem(FORM_DATA_EXPIRY_KEY);
        }
      }

      // Get user profile for role-based redirection
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, title')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        navigate('/');
        return;
      }

      // Role-based redirection
      if (profile?.role === 'Admin' && ['Advisory Consultant', 'Advisory Service Head', 'Advisory Service Lead'].includes(profile?.title || '')) {
        // Special admin consultants go to My Items
        navigate('/my-items');
      } else if (profile?.role === 'Admin') {
        navigate('/admin-dashboard');
      } else if (profile?.title === 'Stakeholder') {
        // For Stakeholders, check if they have created requests before
        const { data: requests, error: requestsError } = await supabase
          .from('requests')
          .select('id')
          .eq('requestor_id', userId)
          .limit(1);

        if (requestsError) {
          console.error('Error fetching user requests:', requestsError);
          navigate('/');
          return;
        }

        // If user has created requests before, go to My Requests, otherwise go to landing page
        if (requests && requests.length > 0) {
          navigate('/my-requests');
        } else {
          navigate('/', { state: { scrollToServices: true } });
        }
      } else if (['Advisory Consultant', 'Advisory Consultants', 'Advisory Service Lead', 'Advisory Service Head'].includes(profile?.title || '')) {
        navigate('/my-items');
      } else {
        navigate('/my-requests');
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
    } catch (error) {
      console.error('Login redirect error:', error);
      navigate('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lockedUntil && lockedUntil > new Date()) {
      toast({
        title: "Account Locked",
        description: "Please wait before trying again.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      let loginEmail = email;

      // Check if the input is a username (not an email)
      if (!email.includes('@')) {
        // Look up user by username in profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', email)
          .maybeSingle();

        if (profileError) {
          console.error('Profile lookup error:', profileError);
          // Continue with direct auth attempt using original input
          loginEmail = email;
        } else if (profile) {
          loginEmail = profile.email;
        } else {
          // No profile found, but try direct auth anyway in case it's a valid auth user
          loginEmail = email;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        handleFailedAttempt();
        
        // More specific error handling
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Invalid credentials",
            description: "Please check your username/email and password.",
            variant: "destructive"
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            title: "Email not verified",
            description: "Please check your email and click the verification link.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login failed",
            description: error.message || "Please check your credentials and try again.",
            variant: "destructive"
          });
        }
        return;
      }

      if (data.user) {
        // Set session persistence based on remember me
        if (rememberMe) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
        }
        
        await handleSuccessfulLogin(data.user.id);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during login.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim() !== '' && password.trim() !== '';
  const isLocked = lockedUntil && lockedUntil > new Date();

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-elegant border-white/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Sign In
            </CardTitle>
            <CardDescription>
              Access your advisory services account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLocked && (
              <Alert className="mb-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Account temporarily locked until {lockedUntil?.toLocaleTimeString()}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Username/Email</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your username or email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLocked}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLocked}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={isLocked}
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me (2 days)
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !isFormValid || isLocked}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Log In'
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-4 text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot Password?
              </Link>
              
              <div className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </Link>
              </div>

              <div className="text-sm text-muted-foreground">
                <Link
                  to="/"
                  state={{ scrollToServices: true }}
                  className="text-primary hover:underline font-medium"
                >
                  Proceed without Login
                </Link>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/', { state: { scrollToServices: true } })}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}