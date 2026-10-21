
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
            "absences": {
                  Row: {
                    "barber_id": string,"ends_at": string,"id": string,"reason": string | null,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "barber_id": string,"ends_at": string,"id"?: string,"reason"?: string | null,"starts_at": string
                  }
                  Update: {
                    "barber_id"?: string,"ends_at"?: string,"id"?: string,"reason"?: string | null,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "absences_barber_id_fkey"
      columns: ["barber_id"]
isOneToOne: false
      referencedRelation: "barbers"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor": string | null,"at": string,"data": Json | null,"entity": string,"entity_id": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor"?: string | null,"at"?: string,"data"?: Json | null,"entity": string,"entity_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor"?: string | null,"at"?: string,"data"?: Json | null,"entity"?: string,"entity_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"barber_services": {
                  Row: {
                    "barber_id": string,"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "barber_id": string,"service_id": string
                  }
                  Update: {
                    "barber_id"?: string,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "barber_services_barber_id_fkey"
      columns: ["barber_id"]
isOneToOne: false
      referencedRelation: "barbers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "barber_services_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"barbers": {
                  Row: {
                    "active": boolean,"bio": string | null,"created_at": string,"display_name": string,"id": string,"photo_path": string | null,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"bio"?: string | null,"created_at"?: string,"display_name": string,"id"?: string,"photo_path"?: string | null,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"bio"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"photo_path"?: string | null,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"bookings": {
                  Row: {
                    "access_token_hash": string,"barber_id": string,"created_at": string,"customer_email": string,"customer_name": string,"customer_phone": string,"ends_at": string,"hold_expires_at": string | null,"id": string,"idempotency_key": string | null,"price_cop": number,"service_id": string,"source": string,"starts_at": string,"status": Database["public"]['Enums']["booking_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token_hash": string,"barber_id": string,"created_at"?: string,"customer_email": string,"customer_name": string,"customer_phone": string,"ends_at": string,"hold_expires_at"?: string | null,"id"?: string,"idempotency_key"?: string | null,"price_cop": number,"service_id": string,"source"?: string,"starts_at": string,"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string
                  }
                  Update: {
                    "access_token_hash"?: string,"barber_id"?: string,"created_at"?: string,"customer_email"?: string,"customer_name"?: string,"customer_phone"?: string,"ends_at"?: string,"hold_expires_at"?: string | null,"id"?: string,"idempotency_key"?: string | null,"price_cop"?: number,"service_id"?: string,"source"?: string,"starts_at"?: string,"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_barber_id_fkey"
      columns: ["barber_id"]
isOneToOne: false
      referencedRelation: "barbers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"breaks": {
                  Row: {
                    "barber_id": string,"ends": string,"id": string,"label": string,"starts": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "barber_id": string,"ends": string,"id"?: string,"label"?: string,"starts": string,"weekday": number
                  }
                  Update: {
                    "barber_id"?: string,"ends"?: string,"id"?: string,"label"?: string,"starts"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "breaks_barber_id_fkey"
      columns: ["barber_id"]
isOneToOne: false
      referencedRelation: "barbers"
      referencedColumns: ["id"]
    }
                  ]
                },"media": {
                  Row: {
                    "alt": string,"barber_id": string | null,"created_at": string,"created_by": string | null,"height": number | null,"id": string,"kind": Database["public"]['Enums']["media_kind"],"poster_path": string | null,"published": boolean,"section": Database["public"]['Enums']["media_section"],"sort_order": number,"storage_path": string,"title": string | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt": string,"barber_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"height"?: number | null,"id"?: string,"kind": Database["public"]['Enums']["media_kind"],"poster_path"?: string | null,"published"?: boolean,"section": Database["public"]['Enums']["media_section"],"sort_order"?: number,"storage_path": string,"title"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "alt"?: string,"barber_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"height"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["media_kind"],"poster_path"?: string | null,"published"?: boolean,"section"?: Database["public"]['Enums']["media_section"],"sort_order"?: number,"storage_path"?: string,"title"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_barber_id_fkey"
      columns: ["barber_id"]
isOneToOne: false
      referencedRelation: "barbers"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "attempts": number,"booking_id": string | null,"channel": string,"id": string,"last_error": string | null,"scheduled_for": string,"sent_at": string | null,"template": string,"ticket_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"booking_id"?: string | null,"channel": string,"id"?: string,"last_error"?: string | null,"scheduled_for"?: string,"sent_at"?: string | null,"template": string,"ticket_id"?: string | null
                  }
                  Update: {
                    "attempts"?: number,"booking_id"?: string | null,"channel"?: string,"id"?: string,"last_error"?: string | null,"scheduled_for"?: string,"sent_at"?: string | null,"template"?: string,"ticket_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_ticket_id_fkey"
      columns: ["ticket_id"]
isOneToOne: false
      referencedRelation: "queue_tickets"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_events": {
                  Row: {
                    "event_type": string,"id": number,"payload": NonNullable<Json>,"payment_id": string | null,"processed_at": string | null,"provider_event_id": string,"received_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "event_type": string,"id"?: never,"payload": NonNullable<Json>,"payment_id"?: string | null,"processed_at"?: string | null,"provider_event_id": string,"received_at"?: string
                  }
                  Update: {
                    "event_type"?: string,"id"?: never,"payload"?: NonNullable<Json>,"payment_id"?: string | null,"processed_at"?: string | null,"provider_event_id"?: string,"received_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_events_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_cop": number,"booking_id": string,"created_at": string,"id": string,"order_ref": string,"provider": string,"provider_tx_id": string | null,"status": Database["public"]['Enums']["payment_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cop": number,"booking_id": string,"created_at"?: string,"id"?: string,"order_ref": string,"provider"?: string,"provider_tx_id"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_cop"?: number,"booking_id"?: string,"created_at"?: string,"id"?: string,"order_ref"?: string,"provider"?: string,"provider_tx_id"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "barber_id": string | null,"created_at": string,"full_name": string | null,"id": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "barber_id"?: string | null,"created_at"?: string,"full_name"?: string | null,"id": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "barber_id"?: string | null,"created_at"?: string,"full_name"?: string | null,"id"?: string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_barber_id_fkey"
      columns: ["barber_id"]
isOneToOne: true
      referencedRelation: "barbers"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "booking_id": string | null,"created_at": string,"endpoint": string,"id": string,"keys": NonNullable<Json>,"ticket_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id"?: string | null,"created_at"?: string,"endpoint": string,"id"?: string,"keys": NonNullable<Json>,"ticket_id"?: string | null
                  }
                  Update: {
                    "booking_id"?: string | null,"created_at"?: string,"endpoint"?: string,"id"?: string,"keys"?: NonNullable<Json>,"ticket_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_subscriptions_ticket_id_fkey"
      columns: ["ticket_id"]
isOneToOne: false
      referencedRelation: "queue_tickets"
      referencedColumns: ["id"]
    }
                  ]
                },"queue_tickets": {
                  Row: {
                    "access_token_hash": string,"barber_id": string | null,"booking_id": string | null,"called_at": string | null,"created_at": string,"customer_name": string,"customer_phone": string | null,"day": string,"finished_at": string | null,"id": string,"number": number,"service_id": string,"source": string,"started_at": string | null,"status": Database["public"]['Enums']["ticket_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token_hash": string,"barber_id"?: string | null,"booking_id"?: string | null,"called_at"?: string | null,"created_at"?: string,"customer_name": string,"customer_phone"?: string | null,"day"?: string,"finished_at"?: string | null,"id"?: string,"number": number,"service_id": string,"source": string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["ticket_status"]
                  }
                  Update: {
                    "access_token_hash"?: string,"barber_id"?: string | null,"booking_id"?: string | null,"called_at"?: string | null,"created_at"?: string,"customer_name"?: string,"customer_phone"?: string | null,"day"?: string,"finished_at"?: string | null,"id"?: string,"number"?: number,"service_id"?: string,"source"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["ticket_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "queue_tickets_barber_id_fkey"
      columns: ["barber_id"]
isOneToOne: false
      referencedRelation: "barbers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "queue_tickets_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "queue_tickets_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"services": {
                  Row: {
                    "active": boolean,"description": string | null,"duration_min": number,"id": string,"name": string,"price_cop": number,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"description"?: string | null,"duration_min": number,"id"?: string,"name": string,"price_cop": number,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"description"?: string | null,"duration_min"?: number,"id"?: string,"name"?: string,"price_cop"?: number,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"tattoo_requests": {
                  Row: {
                    "created_at": string,"customer_email": string,"customer_name": string,"customer_phone": string,"id": string,"idea": string,"placement": string | null,"reference_path": string | null,"size": string | null,"status": Database["public"]['Enums']["tattoo_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_email": string,"customer_name": string,"customer_phone": string,"id"?: string,"idea": string,"placement"?: string | null,"reference_path"?: string | null,"size"?: string | null,"status"?: Database["public"]['Enums']["tattoo_status"]
                  }
                  Update: {
                    "created_at"?: string,"customer_email"?: string,"customer_name"?: string,"customer_phone"?: string,"id"?: string,"idea"?: string,"placement"?: string | null,"reference_path"?: string | null,"size"?: string | null,"status"?: Database["public"]['Enums']["tattoo_status"]
                  }
                  Relationships: [
                    
                  ]
                },"work_hours": {
                  Row: {
                    "barber_id": string,"closes": string,"opens": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "barber_id": string,"closes": string,"opens": string,"weekday": number
                  }
                  Update: {
                    "barber_id"?: string,"closes"?: string,"opens"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_hours_barber_id_fkey"
      columns: ["barber_id"]
isOneToOne: false
      referencedRelation: "barbers"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "busy_ranges":
{ Args: { "p_barber": string,"p_from": string,"p_to": string }; Returns: {
              "ends_at": string,"starts_at": string
            }[]
                           },
"create_booking":
{ Args: { "p_barber": string,"p_email": string,"p_hold_minutes"?: number,"p_idempotency": string,"p_name": string,"p_phone": string,"p_service": string,"p_starts": string,"p_token_hash": string }; Returns: {
              "access_token_hash": string,
"barber_id": string,
"created_at": string,
"customer_email": string,
"customer_name": string,
"customer_phone": string,
"ends_at": string,
"hold_expires_at": string | null,
"id": string,
"idempotency_key": string | null,
"price_cop": number,
"service_id": string,
"source": string,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"expire_holds":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            "app_role": "dueno"|"barbero","booking_status": "pendiente_pago"|"confirmada"|"en_atencion"|"finalizada"|"cancelada"|"expirada"|"no_asistio","media_kind": "foto"|"video","media_section": "barberia"|"tatuajes"|"barbero","payment_status": "pendiente"|"aprobado"|"rechazado"|"anulado"|"reembolsado","tattoo_status": "pendiente"|"en_evaluacion"|"cotizada"|"fecha_acordada"|"cerrada","ticket_status": "esperando"|"llamado"|"en_atencion"|"finalizado"|"cancelado"
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
            "app_role": ["dueno", "barbero"],"booking_status": ["pendiente_pago", "confirmada", "en_atencion", "finalizada", "cancelada", "expirada", "no_asistio"],"media_kind": ["foto", "video"],"media_section": ["barberia", "tatuajes", "barbero"],"payment_status": ["pendiente", "aprobado", "rechazado", "anulado", "reembolsado"],"tattoo_status": ["pendiente", "en_evaluacion", "cotizada", "fecha_acordada", "cerrada"],"ticket_status": ["esperando", "llamado", "en_atencion", "finalizado", "cancelado"]
          }
        }
} as const
