
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "attendance_logs": {
                  Row: {
                    "created_at": string,"id": string,"session_id": string,"status": string,"student_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"session_id": string,"status": string,"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"session_id"?: string,"status"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_logs_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "class_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_logs_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"class_sessions": {
                  Row: {
                    "created_at": string,"id": string,"schedule_id": string,"session_date": string,"state": Database["public"]['Enums']["session_status"],"total_jp": number
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"schedule_id": string,"session_date": string,"state"?: Database["public"]['Enums']["session_status"],"total_jp"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"schedule_id"?: string,"session_date"?: string,"state"?: Database["public"]['Enums']["session_status"],"total_jp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_sessions_schedule_id_fkey"
      columns: ["schedule_id"]
isOneToOne: false
      referencedRelation: "schedules"
      referencedColumns: ["id"]
    }
                  ]
                },"classes": {
                  Row: {
                    "id": string,"name": string
                  }
                  Insert: {
                    "id"?: string,"name": string
                  }
                  Update: {
                    "id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"is_read": boolean,"message": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_read"?: boolean,"message": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_read"?: boolean,"message"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "user_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "id": string,"key": string
                  }
                  Insert: {
                    "id"?: string,"key": string
                  }
                  Update: {
                    "id"?: string,"key"?: string
                  }
                  Relationships: [
                    
                  ]
                },"schedules": {
                  Row: {
                    "class_id": string,"day_of_week": number,"end_time": string,"guru_id": string,"id": string,"start_time": string,"subject_id": string,"total_jp": number
                  }
                  Insert: {
                    "class_id": string,"day_of_week": number,"end_time": string,"guru_id": string,"id"?: string,"start_time": string,"subject_id": string,"total_jp"?: number
                  }
                  Update: {
                    "class_id"?: string,"day_of_week"?: number,"end_time"?: string,"guru_id"?: string,"id"?: string,"start_time"?: string,"subject_id"?: string,"total_jp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "schedules_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "schedules_guru_id_fkey"
      columns: ["guru_id"]
isOneToOne: false
      referencedRelation: "user_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "schedules_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"student_grades": {
                  Row: {
                    "created_at": string,"grade_type": string,"id": string,"score": number,"student_id": string,"subject_id": string,"task_name": string
                  }
                  Insert: {
                    "created_at"?: string,"grade_type": string,"id"?: string,"score": number,"student_id": string,"subject_id": string,"task_name": string
                  }
                  Update: {
                    "created_at"?: string,"grade_type"?: string,"id"?: string,"score"?: number,"student_id"?: string,"subject_id"?: string,"task_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_grades_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_grades_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "class_id": string,"id": string,"status_siswa": string | null
                  }
                  Insert: {
                    "class_id": string,"id"?: string,"status_siswa"?: string | null
                  }
                  Update: {
                    "class_id"?: string,"id"?: string,"status_siswa"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    }
                  ]
                },"subjects": {
                  Row: {
                    "id": string,"name": string
                  }
                  Insert: {
                    "id"?: string,"name": string
                  }
                  Update: {
                    "id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"teaching_journals": {
                  Row: {
                    "created_at": string,"duration_minutes": number,"id": string,"notes": string,"session_id": string,"topic": string
                  }
                  Insert: {
                    "created_at"?: string,"duration_minutes": number,"id"?: string,"notes": string,"session_id": string,"topic": string
                  }
                  Update: {
                    "created_at"?: string,"duration_minutes"?: number,"id"?: string,"notes"?: string,"session_id"?: string,"topic"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teaching_journals_session_id_fkey"
      columns: ["session_id"]
isOneToOne: true
      referencedRelation: "class_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"user_profiles": {
                  Row: {
                    "full_name": string | null,"id": string,"role": string
                  }
                  Insert: {
                    "full_name"?: string | null,"id": string,"role": string
                  }
                  Update: {
                    "full_name"?: string | null,"id"?: string,"role"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_roles": {
                  Row: {
                    "class_id": string | null,"id": string,"role_id": string,"user_id": string
                  }
                  Insert: {
                    "class_id"?: string | null,"id"?: string,"role_id": string,"user_id": string
                  }
                  Update: {
                    "class_id"?: string | null,"id"?: string,"role_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "user_profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "get_daily_student_rankings":
{ Args: { "p_class_id"?: string,"p_from": string,"p_subject_id"?: string,"p_to": string }; Returns: {
              "activity_date_utc": string,"class_id": string,"daily_points": number,"rank_in_class_subject": number,"scored_items": number,"student_id": string,"subject_id": string
            }[]
                           },
"get_teacher_daily_attendance":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "activity_date_utc": string,"cancelled_jp": number,"cancelled_sessions": number,"completed_jp": number,"completed_sessions": number,"first_scheduled_start_utc": string,"guru_id": string,"in_progress_jp": number,"in_progress_sessions": number,"last_scheduled_end_utc": string,"planned_jp": number,"planned_sessions": number,"scheduled_jp": number,"total_jp": number
            }[]
                           }
          }
          Enums: {
            "session_status": "planned"|"in_progress"|"completed"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "session_status": ["planned", "in_progress", "completed", "cancelled"]
          }
        }
} as const
