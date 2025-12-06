export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          advisory_service_id: string | null
          created_at: string
          display_order: number | null
          estimated_hours: number
          id: string
          is_active: boolean | null
          name: string
          service_offering_id: string | null
          updated_at: string
        }
        Insert: {
          advisory_service_id?: string | null
          created_at?: string
          display_order?: number | null
          estimated_hours?: number
          id?: string
          is_active?: boolean | null
          name: string
          service_offering_id?: string | null
          updated_at?: string
        }
        Update: {
          advisory_service_id?: string | null
          created_at?: string
          display_order?: number | null
          estimated_hours?: number
          id?: string
          is_active?: boolean | null
          name?: string
          service_offering_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_advisory_service_id_fkey"
            columns: ["advisory_service_id"]
            isOneToOne: false
            referencedRelation: "advisory_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_service_offering_id_fkey"
            columns: ["service_offering_id"]
            isOneToOne: false
            referencedRelation: "service_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      advisory_services: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      advisory_team_members: {
        Row: {
          advisory_services: string[] | null
          created_at: string
          designation: string | null
          email: string | null
          expertise: string[] | null
          id: string
          is_active: boolean | null
          name: string
          rate_per_hour: number | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          advisory_services?: string[] | null
          created_at?: string
          designation?: string | null
          email?: string | null
          expertise?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          rate_per_hour?: number | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          advisory_services?: string[] | null
          created_at?: string
          designation?: string | null
          email?: string | null
          expertise?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          rate_per_hour?: number | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          advisory_services: string[] | null
          advisory_speakers: string[] | null
          created_at: string
          created_by: string
          date: string | null
          description: string | null
          guest_speaker: string | null
          id: string
          invitation: string | null
          meeting_invite_link: string | null
          time: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          advisory_services?: string[] | null
          advisory_speakers?: string[] | null
          created_at?: string
          created_by: string
          date?: string | null
          description?: string | null
          guest_speaker?: string | null
          id?: string
          invitation?: string | null
          meeting_invite_link?: string | null
          time?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          advisory_services?: string[] | null
          advisory_speakers?: string[] | null
          created_at?: string
          created_by?: string
          date?: string | null
          description?: string | null
          guest_speaker?: string | null
          id?: string
          invitation?: string | null
          meeting_invite_link?: string | null
          time?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          announcement_id: string | null
          created_at: string
          created_by: string
          event_date: string
          event_title: string
          id: string
          updated_at: string
        }
        Insert: {
          announcement_id?: string | null
          created_at?: string
          created_by: string
          event_date: string
          event_title: string
          id?: string
          updated_at?: string
        }
        Update: {
          announcement_id?: string | null
          created_at?: string
          created_by?: string
          event_date?: string
          event_title?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dropdown_values: {
        Row: {
          category: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          updated_at: string
          value: string
        }
        Insert: {
          category: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      info_hub_comments: {
        Row: {
          comment: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      info_hub_feedback: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          feedback_type: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          feedback_type: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          feedback_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          advisory_service_id: string | null
          created_at: string
          created_by: string
          description: string
          file_name: string | null
          file_url: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          advisory_service_id?: string | null
          created_at?: string
          created_by: string
          description: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          advisory_service_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          id: string
          last_login: string | null
          profile_picture_url: string | null
          role: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          profile_picture_url?: string | null
          role?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          profile_picture_url?: string | null
          role?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      request_assignee_history: {
        Row: {
          assigned_at: string
          assignee_id: string
          created_at: string
          id: string
          request_id: string
          status_at_assignment: string
          status_at_unassignment: string | null
          unassigned_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assignee_id: string
          created_at?: string
          id?: string
          request_id: string
          status_at_assignment: string
          status_at_unassignment?: string | null
          unassigned_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assignee_id?: string
          created_at?: string
          id?: string
          request_id?: string
          status_at_assignment?: string
          status_at_unassignment?: string | null
          unassigned_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      request_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_feedback: {
        Row: {
          benefits_achieved: string | null
          communication_rating: number
          created_at: string
          feedback_text: string | null
          id: string
          overall_rating: number
          quality_rating: number
          request_id: string
          response_time_rating: number
          satisfaction_rating: number
          suggestions_for_improvement: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          benefits_achieved?: string | null
          communication_rating: number
          created_at?: string
          feedback_text?: string | null
          id?: string
          overall_rating: number
          quality_rating: number
          request_id: string
          response_time_rating: number
          satisfaction_rating: number
          suggestions_for_improvement?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          benefits_achieved?: string | null
          communication_rating?: number
          created_at?: string
          feedback_text?: string | null
          id?: string
          overall_rating?: number
          quality_rating?: number
          request_id?: string
          response_time_rating?: number
          satisfaction_rating?: number
          suggestions_for_improvement?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_request_feedback_request_id"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_history: {
        Row: {
          action: string
          id: string
          new_value: string | null
          old_value: string | null
          performed_at: string
          performed_by: string
          request_id: string
        }
        Insert: {
          action: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by: string
          request_id: string
        }
        Update: {
          action?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          advisory_services: string[]
          allocation_percentage: string | null
          assigned_consultant_name: string | null
          assignee_id: string | null
          billability_percentage: number | null
          created_at: string
          current_assignee_name: string | null
          description: string | null
          estimation_saved_at: string | null
          id: string
          implementation_start_date: string | null
          original_assignee_id: string | null
          original_assignee_name: string | null
          project_data: Json
          request_id: string
          requestor_id: string | null
          saved_assignee_rate: number | null
          saved_assignee_role: string | null
          saved_total_cost: number | null
          saved_total_hours: number | null
          saved_total_pd_estimate: number | null
          selected_activities: Json | null
          selected_tools: string[]
          service_offering_activities: Json | null
          service_specific_data: Json | null
          status: string
          submission_date: string
          timesheet_data: Json | null
          updated_at: string
        }
        Insert: {
          advisory_services: string[]
          allocation_percentage?: string | null
          assigned_consultant_name?: string | null
          assignee_id?: string | null
          billability_percentage?: number | null
          created_at?: string
          current_assignee_name?: string | null
          description?: string | null
          estimation_saved_at?: string | null
          id?: string
          implementation_start_date?: string | null
          original_assignee_id?: string | null
          original_assignee_name?: string | null
          project_data: Json
          request_id: string
          requestor_id?: string | null
          saved_assignee_rate?: number | null
          saved_assignee_role?: string | null
          saved_total_cost?: number | null
          saved_total_hours?: number | null
          saved_total_pd_estimate?: number | null
          selected_activities?: Json | null
          selected_tools: string[]
          service_offering_activities?: Json | null
          service_specific_data?: Json | null
          status?: string
          submission_date?: string
          timesheet_data?: Json | null
          updated_at?: string
        }
        Update: {
          advisory_services?: string[]
          allocation_percentage?: string | null
          assigned_consultant_name?: string | null
          assignee_id?: string | null
          billability_percentage?: number | null
          created_at?: string
          current_assignee_name?: string | null
          description?: string | null
          estimation_saved_at?: string | null
          id?: string
          implementation_start_date?: string | null
          original_assignee_id?: string | null
          original_assignee_name?: string | null
          project_data?: Json
          request_id?: string
          requestor_id?: string | null
          saved_assignee_rate?: number | null
          saved_assignee_role?: string | null
          saved_total_cost?: number | null
          saved_total_hours?: number | null
          saved_total_pd_estimate?: number | null
          selected_activities?: Json | null
          selected_tools?: string[]
          service_offering_activities?: Json | null
          service_specific_data?: Json | null
          status?: string
          submission_date?: string
          timesheet_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      service_offerings: {
        Row: {
          advisory_service_id: string
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          advisory_service_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          advisory_service_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_offerings_advisory_service_id_fkey"
            columns: ["advisory_service_id"]
            isOneToOne: false
            referencedRelation: "advisory_services"
            referencedColumns: ["id"]
          },
        ]
      }
      status_transitions: {
        Row: {
          created_at: string
          from_status: string
          id: string
          role_required: string
          to_status: string
        }
        Insert: {
          created_at?: string
          from_status: string
          id?: string
          role_required: string
          to_status: string
        }
        Update: {
          created_at?: string
          from_status?: string
          id?: string
          role_required?: string
          to_status?: string
        }
        Relationships: []
      }
      sub_activities: {
        Row: {
          activity_id: string
          advisory_service_id: string | null
          associated_tool: string | null
          created_at: string
          display_order: number | null
          estimated_hours: number
          id: string
          is_active: boolean | null
          name: string
          service_offering_id: string | null
          updated_at: string
        }
        Insert: {
          activity_id: string
          advisory_service_id?: string | null
          associated_tool?: string | null
          created_at?: string
          display_order?: number | null
          estimated_hours?: number
          id?: string
          is_active?: boolean | null
          name: string
          service_offering_id?: string | null
          updated_at?: string
        }
        Update: {
          activity_id?: string
          advisory_service_id?: string | null
          associated_tool?: string | null
          created_at?: string
          display_order?: number | null
          estimated_hours?: number
          id?: string
          is_active?: boolean | null
          name?: string
          service_offering_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_activities_advisory_service_id_fkey"
            columns: ["advisory_service_id"]
            isOneToOne: false
            referencedRelation: "advisory_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_activities_service_offering_id_fkey"
            columns: ["service_offering_id"]
            isOneToOne: false
            referencedRelation: "service_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      temporary_form_data: {
        Row: {
          created_at: string
          expires_at: string
          form_data: Json
          form_type: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          form_data: Json
          form_type: string
          id?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          form_data?: Json
          form_type?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      request_feedback_with_user: {
        Row: {
          benefits_achieved: string | null
          communication_rating: number | null
          created_at: string | null
          feedback_text: string | null
          id: string | null
          overall_rating: number | null
          quality_rating: number | null
          request_id: string | null
          response_time_rating: number | null
          satisfaction_rating: number | null
          suggestions_for_improvement: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_request_feedback_request_id"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_get_advisory_team_members: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          name: string
          title: string
          designation: string
          email: string
          advisory_services: string[]
          expertise: string[]
          rate_per_hour: number
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      admin_get_all_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          username: string
          email: string
          role: string
          title: string
          status: string
          created_at: string
          updated_at: string
        }[]
      }
      admin_get_all_team_members: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          name: string
          title: string
          designation: string
          email: string
          advisory_services: string[]
          expertise: string[]
          rate_per_hour: number
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      admin_update_advisory_team_member: {
        Args: { member_id: string; update_data: Json }
        Returns: undefined
      }
      cleanup_expired_form_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      extract_username_from_email: {
        Args: { email_address: string }
        Returns: string
      }
      get_all_feedback_for_insights: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          request_id: string
          user_id: string
          overall_rating: number
          quality_rating: number
          communication_rating: number
          response_time_rating: number
          satisfaction_rating: number
          feedback_text: string
          benefits_achieved: string
          suggestions_for_improvement: string
          created_at: string
          updated_at: string
          username: string
        }[]
      }
      get_assignable_consultants: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          name: string
          title: string
          advisory_services: string[]
          expertise: string[]
          is_active: boolean
        }[]
      }
      get_assignee_rate: {
        Args: { assignee_user_id: string }
        Returns: number
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_assignee: {
        Args: {
          request_advisory_services: string[]
          target_title: string
          original_assignee?: string
        }
        Returns: string
      }
      get_safe_team_member_info: {
        Args: { member_id?: string }
        Returns: {
          id: string
          user_id: string
          name: string
          title: string
          designation: string
          advisory_services: string[]
          expertise: string[]
          is_active: boolean
          created_at: string
          updated_at: string
          email: string
          rate_per_hour: number
        }[]
      }
      get_secure_feedback_data: {
        Args: { feedback_request_id?: string }
        Returns: {
          id: string
          request_id: string
          user_id: string
          overall_rating: number
          quality_rating: number
          communication_rating: number
          response_time_rating: number
          satisfaction_rating: number
          feedback_text: string
          benefits_achieved: string
          suggestions_for_improvement: string
          created_at: string
          updated_at: string
          username: string
        }[]
      }
      get_team_member_by_user_id: {
        Args: { target_user_id: string }
        Returns: {
          id: string
          user_id: string
          name: string
          title: string
          designation: string
          advisory_services: string[]
          expertise: string[]
          is_active: boolean
        }[]
      }
      get_team_member_rate: {
        Args: { member_user_id: string }
        Returns: number
      }
      get_team_members_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          name: string
          title: string
          designation: string
          email: string
          advisory_services: string[]
          expertise: string[]
          rate_per_hour: number
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_team_members_basic_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          title: string
          designation: string
          advisory_services: string[]
          expertise: string[]
          is_active: boolean
        }[]
      }
      get_team_members_for_app: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          name: string
          title: string
          designation: string
          advisory_services: string[]
          expertise: string[]
          is_active: boolean
          email: string
          rate_per_hour: number
        }[]
      }
      is_user_service_lead: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_request_status_and_assignee: {
        Args: { p_request_id: string; new_status: string; performed_by: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
