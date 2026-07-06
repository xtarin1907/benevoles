export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      manifestation_admins: {
        Row: {
          invited_at: string
          manifestation_id: string
          role: Database["public"]["Enums"]["manifestation_admin_role"]
          user_id: string
        }
        Insert: {
          invited_at?: string
          manifestation_id: string
          role?: Database["public"]["Enums"]["manifestation_admin_role"]
          user_id: string
        }
        Update: {
          invited_at?: string
          manifestation_id?: string
          role?: Database["public"]["Enums"]["manifestation_admin_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manifestation_admins_manifestation_id_fkey"
            columns: ["manifestation_id"]
            isOneToOne: false
            referencedRelation: "manifestations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifestation_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manifestation_engagements: {
        Row: {
          created_at: string
          id: string
          manifestation_id: string
          status: Database["public"]["Enums"]["engagement_status"]
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manifestation_id: string
          status?: Database["public"]["Enums"]["engagement_status"]
          volunteer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manifestation_id?: string
          status?: Database["public"]["Enums"]["engagement_status"]
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manifestation_engagements_manifestation_id_fkey"
            columns: ["manifestation_id"]
            isOneToOne: false
            referencedRelation: "manifestations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifestation_engagements_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manifestation_reminder_settings: {
        Row: {
          created_at: string
          manifestation_id: string
          send_mode: Database["public"]["Enums"]["reminder_send_mode"]
          sms_enabled: boolean
        }
        Insert: {
          created_at?: string
          manifestation_id: string
          send_mode?: Database["public"]["Enums"]["reminder_send_mode"]
          sms_enabled?: boolean
        }
        Update: {
          created_at?: string
          manifestation_id?: string
          send_mode?: Database["public"]["Enums"]["reminder_send_mode"]
          sms_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "manifestation_reminder_settings_manifestation_id_fkey"
            columns: ["manifestation_id"]
            isOneToOne: true
            referencedRelation: "manifestations"
            referencedColumns: ["id"]
          },
        ]
      }
      manifestation_series: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      manifestations: {
        Row: {
          approval_status: Database["public"]["Enums"]["manifestation_approval_status"]
          color_hex: string
          contact_email: string | null
          coordinator_email: string | null
          coordinator_name: string | null
          coordinator_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          edition_year: number | null
          end_date: string | null
          id: string
          is_published: boolean
          logo_url: string | null
          name: string
          series_id: string | null
          shift_signup_mode: Database["public"]["Enums"]["shift_signup_mode"]
          slug: string
          staffing_mode: Database["public"]["Enums"]["staffing_mode"]
          start_date: string | null
          website_url: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["manifestation_approval_status"]
          color_hex?: string
          contact_email?: string | null
          coordinator_email?: string | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          edition_year?: number | null
          end_date?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name: string
          series_id?: string | null
          shift_signup_mode?: Database["public"]["Enums"]["shift_signup_mode"]
          slug: string
          staffing_mode?: Database["public"]["Enums"]["staffing_mode"]
          start_date?: string | null
          website_url?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["manifestation_approval_status"]
          color_hex?: string
          contact_email?: string | null
          coordinator_email?: string | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          edition_year?: number | null
          end_date?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name?: string
          series_id?: string | null
          shift_signup_mode?: Database["public"]["Enums"]["shift_signup_mode"]
          slug?: string
          staffing_mode?: Database["public"]["Enums"]["staffing_mode"]
          start_date?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifestations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifestations_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "manifestation_series"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_sends: {
        Row: {
          audience_scope: Database["public"]["Enums"]["newsletter_audience_scope"]
          id: string
          manifestation_id: string | null
          recipient_count: number | null
          resend_broadcast_id: string | null
          sent_at: string
          sent_by: string
          subject: string
        }
        Insert: {
          audience_scope: Database["public"]["Enums"]["newsletter_audience_scope"]
          id?: string
          manifestation_id?: string | null
          recipient_count?: number | null
          resend_broadcast_id?: string | null
          sent_at?: string
          sent_by: string
          subject: string
        }
        Update: {
          audience_scope?: Database["public"]["Enums"]["newsletter_audience_scope"]
          id?: string
          manifestation_id?: string | null
          recipient_count?: number | null
          resend_broadcast_id?: string | null
          sent_at?: string
          sent_by?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_sends_manifestation_id_fkey"
            columns: ["manifestation_id"]
            isOneToOne: false
            referencedRelation: "manifestations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_sends_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          logo_url: string | null
          name: string
          order: number
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          logo_url?: string | null
          name: string
          order?: number
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          logo_url?: string | null
          name?: string
          order?: number
          website_url?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          points_per_shift_completed: number
          points_per_signup: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          points_per_shift_completed?: number
          points_per_signup?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          points_per_shift_completed?: number
          points_per_signup?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: Database["public"]["Enums"]["points_event_type"]
          id: string
          manifestation_id: string | null
          points: number
          shift_id: string | null
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: Database["public"]["Enums"]["points_event_type"]
          id?: string
          manifestation_id?: string | null
          points: number
          shift_id?: string | null
          volunteer_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: Database["public"]["Enums"]["points_event_type"]
          id?: string
          manifestation_id?: string | null
          points?: number
          shift_id?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_manifestation_id_fkey"
            columns: ["manifestation_id"]
            isOneToOne: false
            referencedRelation: "manifestations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string | null
          id: string
          newsletter_consent: boolean
          newsletter_consent_at: string | null
          phone: string | null
          platform_role: Database["public"]["Enums"]["app_role"]
          tshirt_size: Database["public"]["Enums"]["tshirt_size"] | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name?: string | null
          id: string
          newsletter_consent?: boolean
          newsletter_consent_at?: string | null
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["app_role"]
          tshirt_size?: Database["public"]["Enums"]["tshirt_size"] | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string | null
          id?: string
          newsletter_consent?: boolean
          newsletter_consent_at?: string | null
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["app_role"]
          tshirt_size?: Database["public"]["Enums"]["tshirt_size"] | null
        }
        Relationships: []
      }
      reminder_rules: {
        Row: {
          created_at: string
          id: string
          manifestation_id: string
          message_template: string
          offset_minutes: number
        }
        Insert: {
          created_at?: string
          id?: string
          manifestation_id: string
          message_template: string
          offset_minutes: number
        }
        Update: {
          created_at?: string
          id?: string
          manifestation_id?: string
          message_template?: string
          offset_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "reminder_rules_manifestation_id_fkey"
            columns: ["manifestation_id"]
            isOneToOne: false
            referencedRelation: "manifestations"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_sends: {
        Row: {
          id: string
          manifestation_id: string
          reminder_rule_id: string
          sent_at: string
          shift_signup_id: string
        }
        Insert: {
          id?: string
          manifestation_id: string
          reminder_rule_id: string
          sent_at?: string
          shift_signup_id: string
        }
        Update: {
          id?: string
          manifestation_id?: string
          reminder_rule_id?: string
          sent_at?: string
          shift_signup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_sends_manifestation_id_fkey"
            columns: ["manifestation_id"]
            isOneToOne: false
            referencedRelation: "manifestations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_sends_reminder_rule_id_fkey"
            columns: ["reminder_rule_id"]
            isOneToOne: false
            referencedRelation: "reminder_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_sends_shift_signup_id_fkey"
            columns: ["shift_signup_id"]
            isOneToOne: false
            referencedRelation: "shift_signups"
            referencedColumns: ["id"]
          },
        ]
      }
      secteurs: {
        Row: {
          color_hex: string | null
          created_at: string
          description: string | null
          id: string
          manifestation_id: string
          name: string
          order: number
          staffing_mode: Database["public"]["Enums"]["staffing_mode"] | null
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manifestation_id: string
          name: string
          order?: number
          staffing_mode?: Database["public"]["Enums"]["staffing_mode"] | null
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manifestation_id?: string
          name?: string
          order?: number
          staffing_mode?: Database["public"]["Enums"]["staffing_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "secteurs_manifestation_id_fkey"
            columns: ["manifestation_id"]
            isOneToOne: false
            referencedRelation: "manifestations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_signups: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          shift_id: string
          status: Database["public"]["Enums"]["shift_signup_status"]
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          shift_id: string
          status?: Database["public"]["Enums"]["shift_signup_status"]
          volunteer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          shift_id?: string
          status?: Database["public"]["Enums"]["shift_signup_status"]
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_signups_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_signups_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          capacity: number
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          id: string
          location_maps_url: string | null
          location_name: string | null
          manifestation_id: string
          name: string
          secteur_id: string
          start_at: string | null
        }
        Insert: {
          capacity: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          location_maps_url?: string | null
          location_name?: string | null
          manifestation_id: string
          name: string
          secteur_id: string
          start_at?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          location_maps_url?: string | null
          location_name?: string | null
          manifestation_id?: string
          name?: string
          secteur_id?: string
          start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_manifestation_id_fkey"
            columns: ["manifestation_id"]
            isOneToOne: false
            referencedRelation: "manifestations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_secteur_id_fkey"
            columns: ["secteur_id"]
            isOneToOne: false
            referencedRelation: "secteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_blacklist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          manifestation_id: string
          reason: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          manifestation_id: string
          reason: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          manifestation_id?: string
          reason?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_blacklist_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_blacklist_manifestation_id_fkey"
            columns: ["manifestation_id"]
            isOneToOne: false
            referencedRelation: "manifestations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_blacklist_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_shift_signup: {
        Args: { _shift_id: string }
        Returns: {
          created_at: string
          id: string
          notes: string | null
          shift_id: string
          status: Database["public"]["Enums"]["shift_signup_status"]
          volunteer_id: string
        }
        SetofOptions: {
          from: "*"
          to: "shift_signups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      manifestations_seeking_volunteers: {
        Args: never
        Returns: {
          manifestation_id: string
          name: string
        }[]
      }
      platform_impact_stats: {
        Args: never
        Returns: {
          manifestations_count: number
          volunteer_hours: number
          volunteers_count: number
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "user"
      engagement_status: "interested" | "active" | "withdrawn"
      manifestation_admin_role: "owner" | "admin"
      manifestation_approval_status: "pending" | "approved" | "rejected"
      newsletter_audience_scope: "all_platform" | "manifestation_engaged"
      points_event_type: "signup" | "shift_completed" | "manual_adjustment"
      reminder_send_mode: "automatic" | "manual"
      shift_signup_mode: "auto_confirm" | "admin_approval"
      shift_signup_status:
        | "applied"
        | "confirmed"
        | "declined"
        | "completed"
        | "no_show"
        | "waitlisted"
      staffing_mode: "shifts" | "postes"
      tshirt_size: "XS" | "S" | "M" | "L" | "XL" | "XXL"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["super_admin", "user"],
      engagement_status: ["interested", "active", "withdrawn"],
      manifestation_admin_role: ["owner", "admin"],
      manifestation_approval_status: ["pending", "approved", "rejected"],
      newsletter_audience_scope: ["all_platform", "manifestation_engaged"],
      points_event_type: ["signup", "shift_completed", "manual_adjustment"],
      reminder_send_mode: ["automatic", "manual"],
      shift_signup_mode: ["auto_confirm", "admin_approval"],
      shift_signup_status: [
        "applied",
        "confirmed",
        "declined",
        "completed",
        "no_show",
        "waitlisted",
      ],
      staffing_mode: ["shifts", "postes"],
      tshirt_size: ["XS", "S", "M", "L", "XL", "XXL"],
    },
  },
} as const
