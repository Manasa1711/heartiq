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
      alert_thresholds: {
        Row: {
          alerts_enabled: boolean
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          max_heart_rate: number
          min_heart_rate: number
          min_spo2: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts_enabled?: boolean
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          max_heart_rate?: number
          min_heart_rate?: number
          min_spo2?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts_enabled?: boolean
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          max_heart_rate?: number
          min_heart_rate?: number
          min_spo2?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          created_at: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: []
      }
      call_sessions: {
        Row: {
          conversation_id: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiator_id: string
          receiver_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiator_id: string
          receiver_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiator_id?: string
          receiver_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      consultations: {
        Row: {
          created_at: string
          doctor_name: string
          id: string
          scheduled_at: string
          specialty: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doctor_name: string
          id?: string
          scheduled_at: string
          specialty?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doctor_name?: string
          id?: string
          scheduled_at?: string
          specialty?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          doctor_id: string
          doctor_unread: number
          id: string
          last_message: string
          last_message_at: string
          patient_id: string
          patient_unread: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          doctor_unread?: number
          id?: string
          last_message?: string
          last_message_at?: string
          patient_id: string
          patient_unread?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          doctor_unread?: number
          id?: string
          last_message?: string
          last_message_at?: string
          patient_id?: string
          patient_unread?: number
          updated_at?: string
        }
        Relationships: []
      }
      ecg_uploads: {
        Row: {
          confidence: number | null
          created_at: string
          diagnosis: string | null
          doctor_diagnosis_override: string | null
          doctor_notes: string | null
          doctor_reviewed: boolean
          explanation: string | null
          file_name: string | null
          findings: Json | null
          id: string
          image_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          diagnosis?: string | null
          doctor_diagnosis_override?: string | null
          doctor_notes?: string | null
          doctor_reviewed?: boolean
          explanation?: string | null
          file_name?: string | null
          findings?: Json | null
          id?: string
          image_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          diagnosis?: string | null
          doctor_diagnosis_override?: string | null
          doctor_notes?: string | null
          doctor_reviewed?: boolean
          explanation?: string | null
          file_name?: string | null
          findings?: Json | null
          id?: string
          image_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_read: boolean
          sender_id: string
          type: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          sender_id: string
          type?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_doctors: {
        Row: {
          available: boolean
          avatar_url: string | null
          bio: string | null
          consultation_fee: number | null
          created_at: string
          display_name: string
          id: string
          license_number: string | null
          rating: number | null
          specialty: string
          years_experience: number | null
        }
        Insert: {
          available?: boolean
          avatar_url?: string | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          display_name: string
          id?: string
          license_number?: string | null
          rating?: number | null
          specialty: string
          years_experience?: number | null
        }
        Update: {
          available?: boolean
          avatar_url?: string | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          display_name?: string
          id?: string
          license_number?: string | null
          rating?: number | null
          specialty?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_notes: {
        Row: {
          content: string
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
        }
        Insert: {
          content: string
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
        }
        Update: {
          content?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          content: string
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
        }
        Insert: {
          content: string
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
        }
        Update: {
          content?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          available: boolean
          avatar_url: string | null
          bio: string | null
          consultation_fee: number | null
          created_at: string
          display_name: string | null
          dob: string | null
          gender: string | null
          height_cm: number | null
          id: string
          is_verified: boolean
          license_number: string | null
          onboarding_completed: boolean
          role: string
          specialty: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
          years_experience: number | null
        }
        Insert: {
          available?: boolean
          avatar_url?: string | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          display_name?: string | null
          dob?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          is_verified?: boolean
          license_number?: string | null
          onboarding_completed?: boolean
          role?: string
          specialty?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
          years_experience?: number | null
        }
        Update: {
          available?: boolean
          avatar_url?: string | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          display_name?: string | null
          dob?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          is_verified?: boolean
          license_number?: string | null
          onboarding_completed?: boolean
          role?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
          years_experience?: number | null
        }
        Relationships: []
      }
      vitals_readings: {
        Row: {
          anomaly_type: string | null
          heart_rate: number | null
          hrv: number | null
          id: string
          is_anomaly: boolean
          recorded_at: string
          source: string
          spo2: number | null
          steps: number | null
          user_id: string
        }
        Insert: {
          anomaly_type?: string | null
          heart_rate?: number | null
          hrv?: number | null
          id?: string
          is_anomaly?: boolean
          recorded_at?: string
          source: string
          spo2?: number | null
          steps?: number | null
          user_id: string
        }
        Update: {
          anomaly_type?: string | null
          heart_rate?: number | null
          hrv?: number | null
          id?: string
          is_anomaly?: boolean
          recorded_at?: string
          source?: string
          spo2?: number | null
          steps?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
