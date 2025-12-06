-- Database Security Hardening: Add search_path to all functions for security

-- Update all database functions to include SET search_path = 'public' for security
-- This prevents potential security issues with search_path manipulation

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_assignee_names()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Update current assignee name when assignee_id changes
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    IF NEW.assignee_id IS NOT NULL THEN
      SELECT username INTO NEW.current_assignee_name
      FROM profiles 
      WHERE user_id = NEW.assignee_id;
    ELSE
      NEW.current_assignee_name := NULL;
    END IF;
  END IF;
  
  -- Update original assignee name when original_assignee_id changes
  IF NEW.original_assignee_id IS DISTINCT FROM OLD.original_assignee_id THEN
    IF NEW.original_assignee_id IS NOT NULL THEN
      SELECT username INTO NEW.original_assignee_name
      FROM profiles 
      WHERE user_id = NEW.original_assignee_id;
    ELSE
      NEW.original_assignee_name := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_assignee_rate(assignee_user_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  assignee_rate NUMERIC;
  current_user_role TEXT;
  current_user_title TEXT;
BEGIN
  -- Get current user's role and title
  SELECT role, title INTO current_user_role, current_user_title
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only allow access if user is:
  -- 1. Admin
  -- 2. The assignee themselves
  -- 3. Advisory Service Head or Lead (for estimation purposes)
  IF current_user_role = 'Admin' 
     OR auth.uid() = assignee_user_id 
     OR current_user_title IN ('Advisory Service Head', 'Advisory Service Lead') THEN
    
    SELECT rate_per_hour INTO assignee_rate
    FROM advisory_team_members 
    WHERE user_id = assignee_user_id AND is_active = true;
    
    RETURN COALESCE(assignee_rate, 0);
  ELSE
    -- Return null for unauthorized access
    RETURN NULL;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_team_member_rate(member_user_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  member_rate NUMERIC;
  current_user_role TEXT;
  current_user_title TEXT;
BEGIN
  -- Get current user's role and title
  SELECT role, title INTO current_user_role, current_user_title
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only allow access if user is:
  -- 1. Admin
  -- 2. The team member themselves
  -- 3. Advisory Service Head or Lead (for budget/estimation purposes)
  IF current_user_role = 'Admin' 
     OR auth.uid() = member_user_id 
     OR current_user_title IN ('Advisory Service Head', 'Advisory Service Lead') THEN
    
    SELECT rate_per_hour INTO member_rate
    FROM advisory_team_members 
    WHERE user_id = member_user_id AND is_active = true;
    
    RETURN COALESCE(member_rate, 0);
  ELSE
    -- Return null for unauthorized access
    RETURN NULL;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_new_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  assigned_consultant_id UUID;
  assigned_consultant_name TEXT;
  service_name TEXT;
  service_offerings_array TEXT[];
BEGIN
  -- Only auto-assign for new requests with status 'New' and no existing assignee
  IF NEW.status = 'New' AND NEW.assignee_id IS NULL THEN
    -- Get service offerings from service_specific_data or selected_tools
    IF NEW.service_specific_data IS NOT NULL AND NEW.service_specific_data ? 'selectedOfferings' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.service_specific_data->'selectedOfferings')) INTO service_offerings_array;
    ELSE
      service_offerings_array := NEW.selected_tools;
    END IF;
    
    -- Get the advisory service name
    IF array_length(NEW.advisory_services, 1) > 0 THEN
      SELECT NEW.advisory_services[1] INTO service_name;
      
      -- First priority: Find Advisory Consultant with matching advisory service and expertise
      SELECT atm.user_id INTO assigned_consultant_id
      FROM advisory_team_members atm
      LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject', 'Cancelled')
      WHERE atm.title = 'Advisory Consultant'
        AND atm.is_active = true
        AND service_name = ANY(atm.advisory_services)
        AND (array_length(service_offerings_array, 1) > 0 AND service_offerings_array && atm.expertise)
      GROUP BY atm.user_id
      ORDER BY COUNT(r.id) ASC
      LIMIT 1;
      
      -- Second priority: If no expertise match found, get any Advisory Consultant in the same advisory service
      IF assigned_consultant_id IS NULL THEN
        SELECT atm.user_id INTO assigned_consultant_id
        FROM advisory_team_members atm
        LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject', 'Cancelled')
        WHERE atm.title = 'Advisory Consultant'
          AND atm.is_active = true
          AND service_name = ANY(atm.advisory_services)
        GROUP BY atm.user_id
        ORDER BY COUNT(r.id) ASC
        LIMIT 1;
      END IF;
      
      -- Third priority: If no Advisory Consultant found, assign to Advisory Service Head for the same advisory service
      IF assigned_consultant_id IS NULL THEN
        SELECT atm.user_id INTO assigned_consultant_id
        FROM advisory_team_members atm
        LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject', 'Cancelled')
        WHERE atm.title = 'Advisory Service Head'
          AND atm.is_active = true
          AND service_name = ANY(atm.advisory_services)
        GROUP BY atm.user_id
        ORDER BY COUNT(r.id) ASC
        LIMIT 1;
      END IF;
    END IF;
    
    -- If we found a consultant, assign them and set all name fields
    IF assigned_consultant_id IS NOT NULL THEN
      -- Get the consultant's name
      SELECT name INTO assigned_consultant_name
      FROM advisory_team_members
      WHERE user_id = assigned_consultant_id;
      
      -- Set all the assignee fields
      NEW.assignee_id := assigned_consultant_id;
      NEW.original_assignee_id := assigned_consultant_id;
      NEW.current_assignee_name := assigned_consultant_name;
      NEW.original_assignee_name := assigned_consultant_name;
      NEW.assigned_consultant_name := assigned_consultant_name;
      
      -- Update service_specific_data with assigned consultant name if it exists
      IF NEW.service_specific_data IS NOT NULL THEN
        NEW.service_specific_data := jsonb_set(
          NEW.service_specific_data,
          '{assignedConsultant}',
          to_jsonb(assigned_consultant_name)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_request_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.request_history (request_id, action, old_value, new_value, performed_by)
    VALUES (NEW.id, 'Status changed', OLD.status, NEW.status, auth.uid());
  END IF;
  
  -- Log assignee changes
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO public.request_history (request_id, action, old_value, new_value, performed_by)
    VALUES (NEW.id, 'Reassigned', OLD.assignee_id::text, NEW.assignee_id::text, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE 
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE user_id = auth.uid();
  RETURN user_role;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_new_request_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Set status to 'New' for new requests if not specified
  IF NEW.status IS NULL OR NEW.status = '' OR NEW.status = 'Submitted' THEN
    NEW.status = 'New';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_original_assignee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- If this is an INSERT and assignee_id is set, store it as original assignee
  IF TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL THEN
    NEW.original_assignee_id := NEW.assignee_id;
  END IF;
  
  -- If this is an UPDATE and original_assignee_id is null but assignee_id is being set for first time
  IF TG_OP = 'UPDATE' AND OLD.original_assignee_id IS NULL AND NEW.assignee_id IS NOT NULL AND OLD.assignee_id IS NULL THEN
    NEW.original_assignee_id := NEW.assignee_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_advisory_team_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Check if the user has an advisory title (not role)
  IF NEW.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head') THEN
    
    -- Check if advisory team member already exists
    IF EXISTS (SELECT 1 FROM public.advisory_team_members WHERE user_id = NEW.user_id) THEN
      -- Update existing record
      UPDATE public.advisory_team_members 
      SET 
        name = NEW.username,
        title = NEW.title,
        email = NEW.email,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      -- Insert new record
      INSERT INTO public.advisory_team_members (
        user_id,
        name,
        title,
        email,
        advisory_services,
        expertise,
        is_active
      )
      VALUES (
        NEW.user_id,
        NEW.username,
        NEW.title,
        NEW.email,
        '{}',
        '{}',
        true
      );
    END IF;
      
  ELSE
    -- If the user no longer has an advisory title, remove them from advisory team
    DELETE FROM public.advisory_team_members WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.track_request_assignee_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- If this is an INSERT with an assignee, create initial history record
  IF TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL THEN
    INSERT INTO public.request_assignee_history (
      request_id, 
      assignee_id, 
      status_at_assignment
    ) VALUES (
      NEW.id, 
      NEW.assignee_id, 
      NEW.status
    );
    RETURN NEW;
  END IF;
  
  -- If this is an UPDATE and assignee changed
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    -- Close previous assignee record if exists
    IF OLD.assignee_id IS NOT NULL THEN
      UPDATE public.request_assignee_history 
      SET 
        unassigned_at = now(),
        status_at_unassignment = NEW.status,
        updated_at = now()
      WHERE request_id = NEW.id 
        AND assignee_id = OLD.assignee_id 
        AND unassigned_at IS NULL;
    END IF;
    
    -- Create new assignee record if new assignee exists
    IF NEW.assignee_id IS NOT NULL THEN
      INSERT INTO public.request_assignee_history (
        request_id, 
        assignee_id, 
        status_at_assignment
      ) VALUES (
        NEW.id, 
        NEW.assignee_id, 
        NEW.status
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Improve RLS policies for advisory team members

-- Add proper RLS policy for advisory team members basic view
DROP POLICY IF EXISTS "advisory_team_members_basic_select_policy" ON public.advisory_team_members_basic;
CREATE POLICY "advisory_team_members_basic_select_policy" 
ON public.advisory_team_members_basic 
FOR SELECT 
TO authenticated
USING (true);

-- Strengthen profiles table policies - consolidate conflicting policies
DROP POLICY IF EXISTS "own_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "own_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "user_own_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "user_own_profile_read" ON public.profiles;

-- Create unified policies for profiles table
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_policy" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add update policy for profiles
CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Restrict advisory team members access - only show basic info unless admin/lead
DROP POLICY IF EXISTS "own_team_record_access" ON public.advisory_team_members;

CREATE POLICY "advisory_team_members_select_policy" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  -- Users can see their own full record
  user_id = auth.uid() 
  OR
  -- Admins can see all records
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
  OR
  -- Advisory leads can see team records (for assignment purposes)
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND title IN ('Advisory Service Head', 'Advisory Service Lead'))
);