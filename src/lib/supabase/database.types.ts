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
      manifestations: {
        Row: {
          color_hex: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_published: boolean
          logo_url: string | null
          name: string
          shift_signup_mode: Database["public"]["Enums"]["shift_signup_mode"]
          slug: string
          start_date: string | null
        }
        Insert: {
          color_hex?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name: string
          shift_signup_mode?: Database["public"]["Enums"]["shift_signup_mode"]
          slug: string
          start_date?: string | null
        }
        Update: {
          color_hex?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name?: string
          shift_signup_mode?: Database["public"]["Enums"]["shift_signup_mode"]
          slug?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifestations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          newsletter_consent: boolean
          newsletter_consent_at: string | null
          phone: string | null
          platform_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          newsletter_consent?: boolean
          newsletter_consent_at?: string | null
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          newsletter_consent?: boolean
          newsletter_consent_at?: string | null
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
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
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manifestation_id: string
          name: string
          order?: number
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manifestation_id?: string
          name?: string
          order?: number
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
          end_at: string
          id: string
          manifestation_id: string
          name: string
          secteur_id: string
          start_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at: string
          id?: string
          manifestation_id: string
          name: string
          secteur_id: string
          start_at: string
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string
          id?: string
          manifestation_id?: string
          name?: string
          secteur_id?: string
          start_at?: string
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
    }
    Enums: {
      app_role: "super_admin" | "user"
      engagement_status: "interested" | "active" | "withdrawn"
      manifestation_admin_role: "owner" | "admin"
      newsletter_audience_scope: "all_platform" | "manifestation_engaged"
      points_event_type: "signup" | "shift_completed" | "manual_adjustment"
      shift_signup_mode: "auto_confirm" | "admin_approval"
      shift_signup_status:
        | "applied"
        | "confirmed"
        | "declined"
        | "completed"
        | "no_show"
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
    Enums: {
      app_role: ["super_admin", "user"],
      engagement_status: ["interested", "active", "withdrawn"],
      manifestation_admin_role: ["owner", "admin"],
      newsletter_audience_scope: ["all_platform", "manifestation_engaged"],
      points_event_type: ["signup", "shift_completed", "manual_adjustment"],
      shift_signup_mode: ["auto_confirm", "admin_approval"],
      shift_signup_status: [
        "applied",
        "confirmed",
        "declined",
        "completed",
        "no_show",
      ],
    },
  },
} as const
