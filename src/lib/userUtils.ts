import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  user_id: string;
  username: string;
  email: string;
}

export interface AssigneeProfile {
  user_id: string;
  name: string;
  title: string;
  designation: string;
  rate_per_hour: number;
  email?: string;
}

export interface UnifiedUserProfile {
  user_id: string;
  username: string;
  email: string;
  role: string;
  profile_title: string;
  // Advisory team fields (nullable for non-advisory members)
  advisory_name?: string;
  advisory_title?: string;
  designation?: string;
  rate_per_hour?: number;
  advisory_services?: string[];
  expertise?: string[];
  is_advisory_member: boolean;
}

export const fetchUserProfiles = async (userIds: string[]): Promise<UserProfile[]> => {
  if (userIds.length === 0) return [];

  try {
    // First try to get profiles from the profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, username, email')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    const profilesData = profiles || [];
    
    const foundUserIds = profilesData.map(p => p.user_id);
    const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));

    // For missing profiles, add placeholder profiles
    if (missingUserIds.length > 0) {
      console.warn(`Missing profiles for users: ${missingUserIds.join(', ')}`);
      
      // Add placeholder profiles for missing users
      const missingProfiles = missingUserIds.map(userId => ({
        user_id: userId,
        username: 'Unknown User',
        email: ''
      }));

      return [...profilesData, ...missingProfiles];
    }

    return profilesData;
  } catch (error) {
    console.error('Error in fetchUserProfiles:', error);
    return [];
  }
};

export const getUserDisplayName = (profile: any): string => {
  // Debug logging for development - remove this in production
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('getUserDisplayName called with profile:', profile);
  }
  
  if (!profile) {
    return 'Unknown User';
  }
  
  // Prefer username if it exists and is not empty
  if (profile.username && profile.username.trim() !== '') {
    return profile.username.trim();
  }
  
  // Fallback to email if username is not available
  if (profile.email && profile.email.trim() !== '') {
    // Extract username from email (part before @)
    const emailUsername = profile.email.split('@')[0];
    return emailUsername;
  }
  
  // If we have a user_id, show a portion of it as identifier
  if (profile.user_id) {
    return `User-${profile.user_id.slice(0, 8)}`;
  }
  
  // Last resort - return a generic name
  return 'Unknown User';
};

export const getRequestorDisplayName = (profile: any, requestorId: string): string => {
  // If we have a valid profile, use the standard display name
  if (profile && (profile.username || profile.email)) {
    return getUserDisplayName(profile);
  }
  
  // If no profile or invalid profile data, show the requestor ID
  if (requestorId) {
    return `User-${requestorId.slice(0, 8)}`;
  }
  
  return 'Unknown User';
};

export const fetchAssigneeProfiles = async (userIds: string[]): Promise<AssigneeProfile[]> => {
  if (userIds.length === 0) return [];

  try {
    const { data: profiles, error } = await supabase
      .from('advisory_team_members')
      .select('user_id, name, title, designation, rate_per_hour, email')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching assignee profiles:', error);
      return [];
    }

    return profiles || [];
  } catch (error) {
    console.error('Error in fetchAssigneeProfiles:', error);
    return [];
  }
};

export const createProfileLookupMap = (profiles: UserProfile[]): Record<string, UserProfile> => {
  return profiles.reduce((acc, profile) => {
    acc[profile.user_id] = profile;
    return acc;
  }, {} as Record<string, UserProfile>);
};

export const fetchUnifiedUserProfiles = async (userIds: string[]): Promise<UnifiedUserProfile[]> => {
  if (userIds.length === 0) return [];

  try {
    console.log('Fetching unified profiles for users:', userIds.length);
    
    // Fetch profiles and advisory members separately, then join in memory
    // This approach is more reliable than Supabase foreign key joins
    const [profilesResult, advisoryResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, username, email, role, title')
        .in('user_id', userIds),
      supabase
        .from('advisory_team_members')
        .select('user_id, name, title, designation, rate_per_hour, advisory_services, expertise')
        .in('user_id', userIds)
        .eq('is_active', true)
    ]);

    if (profilesResult.error) {
      console.error('Error fetching basic profiles:', profilesResult.error);
      return [];
    }

    if (advisoryResult.error) {
      console.error('Error fetching advisory members:', advisoryResult.error);
      // Continue without advisory data
    }

    const basicProfiles = profilesResult.data || [];
    const advisoryMembers = advisoryResult.data || [];

    console.log(`Fetched ${basicProfiles.length} profiles and ${advisoryMembers.length} advisory members`);

    // Create lookup map for advisory members
    const advisoryMap = advisoryMembers.reduce((acc, member) => {
      acc[member.user_id] = member;
      return acc;
    }, {} as Record<string, any>);

    // Combine the data
    return basicProfiles.map(profile => {
      const advisoryInfo = advisoryMap[profile.user_id];
      return {
        user_id: profile.user_id,
        username: profile.username,
        email: profile.email,
        role: profile.role,
        profile_title: profile.title,
        advisory_name: advisoryInfo?.name,
        advisory_title: advisoryInfo?.title,
        designation: advisoryInfo?.designation,
        rate_per_hour: advisoryInfo?.rate_per_hour,
        advisory_services: advisoryInfo?.advisory_services,
        expertise: advisoryInfo?.expertise,
        is_advisory_member: !!advisoryInfo
      };
    });

  } catch (error) {
    console.error('Error in fetchUnifiedUserProfiles:', error);
    return [];
  }
};

export const createAssigneeProfileLookupMap = (profiles: AssigneeProfile[]): Record<string, AssigneeProfile> => {
  return profiles.reduce((acc, profile) => {
    acc[profile.user_id] = profile;
    return acc;
  }, {} as Record<string, AssigneeProfile>);
};

export const createUnifiedProfileLookupMap = (profiles: UnifiedUserProfile[]): Record<string, UnifiedUserProfile> => {
  return profiles.reduce((acc, profile) => {
    acc[profile.user_id] = profile;
    return acc;
  }, {} as Record<string, UnifiedUserProfile>);
};