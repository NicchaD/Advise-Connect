import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { User, UserCircle2, Sun, Moon, Mail, Upload, Camera } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface UserProfile {
  username: string;
  email: string;
  title: string;
  profile_picture_url: string | null;
}

interface UserProfileDropdownProps {
  user: any;
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchAdminEmail();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, email, title, profile_picture_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchAdminEmail = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_contact_email')
        .maybeSingle();

      if (error) throw error;
      setAdminEmail(data.setting_value);
    } catch (error) {
      console.error('Error fetching admin email:', error);
      setAdminEmail('admin@company.com'); // fallback
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      // Update profile with new picture URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, profile_picture_url: publicUrl } : null);
      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleContactAdmin = () => {
    const subject = encodeURIComponent('Support Request');
    const body = encodeURIComponent(`Hello Admin,\n\nI need assistance with:\n\n\nBest regards,\n${profile?.username || 'User'}`);
    const mailtoUrl = `mailto:${adminEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!profile) {
    // Show a basic profile view even if profile data is not loaded yet
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full text-white hover:bg-white/20 transition-all duration-300">
            <Avatar className="h-10 w-10 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-white">
                <UserCircle2 className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80 p-4" align="end">
          <div className="flex flex-col items-center space-y-4 mb-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-lg">
                <UserCircle2 className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-medium">{user?.email || 'User'}</p>
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Contact Admin */}
          <DropdownMenuItem onClick={handleContactAdmin} className="cursor-pointer">
            <Mail className="h-4 w-4 mr-2" />
            Contact Admin
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-2 py-1">
            <Label htmlFor="theme-toggle" className="flex items-center space-x-2 cursor-pointer">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <span>Dark Mode</span>
            </Label>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full text-white hover:bg-white/20 transition-all duration-300">
          <Avatar className="h-10 w-10 border-2 border-white/30">
            <AvatarImage src={profile.profile_picture_url || ''} alt={profile.username} />
            <AvatarFallback className="bg-white/20 text-white">
              {profile.username ? getInitials(profile.username) : <UserCircle2 className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 p-4" align="end">
        {/* Profile Section */}
        <div className="flex flex-col items-center space-y-4 mb-4">
          <div className="relative group">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.profile_picture_url || ''} alt={profile.username} />
              <AvatarFallback className="text-lg">
                {profile.username ? getInitials(profile.username) : <UserCircle2 className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
              <label htmlFor="profile-upload" className="cursor-pointer">
                <Camera className="h-6 w-6 text-white" />
                <input
                  id="profile-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full"
            disabled={uploading}
          >
            <label htmlFor="profile-upload-btn" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Add/Edit Profile Photo'}
              <input
                id="profile-upload-btn"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </Button>
          
          <div className="text-center">
            <p className="font-medium">{profile.username}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            {profile.title && (
              <p className="text-sm text-primary mt-1">
                Logged in as {profile.title}
              </p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Contact Admin */}
        <DropdownMenuItem onClick={handleContactAdmin} className="cursor-pointer">
          <Mail className="h-4 w-4 mr-2" />
          Contact Admin
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-2 py-1">
          <Label htmlFor="theme-toggle" className="flex items-center space-x-2 cursor-pointer">
            {theme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span>Dark Mode</span>
          </Label>
          <Switch
            id="theme-toggle"
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}