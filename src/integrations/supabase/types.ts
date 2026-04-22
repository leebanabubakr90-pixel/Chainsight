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
      bottlenecks: {
        Row: {
          category: string | null
          description: string | null
          detected_at: string
          id: string
          organization_id: string
          resolved: boolean
          severity: string
          shipment_id: string | null
          suggested_action: string | null
          title: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          detected_at?: string
          id?: string
          organization_id: string
          resolved?: boolean
          severity?: string
          shipment_id?: string | null
          suggested_action?: string | null
          title: string
        }
        Update: {
          category?: string | null
          description?: string | null
          detected_at?: string
          id?: string
          organization_id?: string
          resolved?: boolean
          severity?: string
          shipment_id?: string | null
          suggested_action?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bottlenecks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottlenecks_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_events: {
        Row: {
          day: string
          event_type: string
          id: string
          occurred_at: string
          organization_id: string
          path: string | null
          user_id: string
        }
        Insert: {
          day?: string
          event_type: string
          id?: string
          occurred_at?: string
          organization_id: string
          path?: string | null
          user_id: string
        }
        Update: {
          day?: string
          event_type?: string
          id?: string
          occurred_at?: string
          organization_id?: string
          path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      forecasts: {
        Row: {
          confidence: number | null
          created_at: string
          horizon_weeks: number
          id: string
          insights: string | null
          organization_id: string
          predictions: Json
          product: string
          region: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          horizon_weeks?: number
          id?: string
          insights?: string | null
          organization_id: string
          predictions?: Json
          product: string
          region: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          horizon_weeks?: number
          id?: string
          insights?: string | null
          organization_id?: string
          predictions?: Json
          product?: string
          region?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json | null
          id: string
          organization_id: string
          report_type: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json | null
          id?: string
          organization_id: string
          report_type: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json | null
          id?: string
          organization_id?: string
          report_type?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          destination: string
          estimated_cost: number | null
          estimated_days: number | null
          id: string
          organization_id: string
          origin: string
          reasoning: string | null
          recommended_path: Json
          shipment_id: string | null
        }
        Insert: {
          created_at?: string
          destination: string
          estimated_cost?: number | null
          estimated_days?: number | null
          id?: string
          organization_id: string
          origin: string
          reasoning?: string | null
          recommended_path?: Json
          shipment_id?: string | null
        }
        Update: {
          created_at?: string
          destination?: string
          estimated_cost?: number | null
          estimated_days?: number | null
          id?: string
          organization_id?: string
          origin?: string
          reasoning?: string | null
          recommended_path?: Json
          shipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          departed_at: string | null
          destination: string
          eta: string | null
          id: string
          mode: string | null
          organization_id: string
          origin: string
          product: string
          risk_score: number | null
          status: string
          tracking_code: string
          units: number
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          departed_at?: string | null
          destination: string
          eta?: string | null
          id?: string
          mode?: string | null
          organization_id: string
          origin: string
          product: string
          risk_score?: number | null
          status?: string
          tracking_code: string
          units?: number
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          departed_at?: string | null
          destination?: string
          eta?: string | null
          id?: string
          mode?: string | null
          organization_id?: string
          origin?: string
          product?: string
          risk_score?: number | null
          status?: string
          tracking_code?: string
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_app_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role_global"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role_global"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role_global"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      org_dashboard_analytics: {
        Args: never
        Returns: {
          active_30d: number
          active_7d: number
          is_demo: boolean
          last_activity: string
          organization_id: string
          organization_name: string
          total_views: number
          unique_users: number
        }[]
      }
      user_org_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "member"
      app_role_global: "super_admin" | "user"
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
      app_role: ["admin", "member"],
      app_role_global: ["super_admin", "user"],
    },
  },
} as const
