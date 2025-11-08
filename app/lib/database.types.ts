export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
        }
      }
      business_settings: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          business_name: string | null
          business_number: string | null
          business_owner: string | null
          business_address: string | null
          business_email: string | null
          business_phone: string | null
          business_mobile: string | null
          business_website: string | null
          logo_url: string | null
          default_invoice_note: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          business_name?: string | null
          business_number?: string | null
          business_owner?: string | null
          business_address?: string | null
          business_email?: string | null
          business_phone?: string | null
          business_mobile?: string | null
          business_website?: string | null
          logo_url?: string | null
          default_invoice_note?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          business_name?: string | null
          business_number?: string | null
          business_owner?: string | null
          business_address?: string | null
          business_email?: string | null
          business_phone?: string | null
          business_mobile?: string | null
          business_website?: string | null
          logo_url?: string | null
          default_invoice_note?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          invoice_name: string
          invoice_number: string
          date: string
          terms: string
          status: "draft" | "sent" | "paid" | "overdue"
          from_name: string | null
          from_email: string | null
          from_address: string | null
          from_phone: string | null
          from_business_number: string | null
          from_website: string | null
          from_owner: string | null
          bill_to_name: string | null
          bill_to_email: string | null
          bill_to_address: string | null
          bill_to_phone: string | null
          bill_to_mobile: string | null
          bill_to_fax: string | null
          line_items: Json
          subtotal: number
          total: number
          balance_due: number
          notes: string | null
          share_token: string | null
          payment_method: string | null
          payment_date: string | null
          payment_reference: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          invoice_name: string
          invoice_number: string
          date: string
          terms: string
          status?: "draft" | "sent" | "paid" | "overdue"
          from_name?: string | null
          from_email?: string | null
          from_address?: string | null
          from_phone?: string | null
          from_business_number?: string | null
          from_website?: string | null
          from_owner?: string | null
          bill_to_name?: string | null
          bill_to_email?: string | null
          bill_to_address?: string | null
          bill_to_phone?: string | null
          bill_to_mobile?: string | null
          bill_to_fax?: string | null
          line_items: Json
          subtotal: number
          total: number
          balance_due: number
          notes?: string | null
          share_token?: string | null
          payment_method?: string | null
          payment_date?: string | null
          payment_reference?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          invoice_name?: string
          invoice_number?: string
          date?: string
          terms?: string
          status?: "draft" | "sent" | "paid" | "overdue"
          from_name?: string | null
          from_email?: string | null
          from_address?: string | null
          from_phone?: string | null
          from_business_number?: string | null
          from_website?: string | null
          from_owner?: string | null
          bill_to_name?: string | null
          bill_to_email?: string | null
          bill_to_address?: string | null
          bill_to_phone?: string | null
          bill_to_mobile?: string | null
          bill_to_fax?: string | null
          line_items?: Json
          subtotal?: number
          total?: number
          balance_due?: number
          notes?: string | null
          share_token?: string | null
          payment_method?: string | null
          payment_date?: string | null
          payment_reference?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          merchant: string
          category: string | null
          date: string
          total: number
          tax: number | null
          description: string | null
          receipt_url: string | null
          is_tax_deductible: boolean
          business_use_percentage: number
          tax_category: string | null
          deductible_amount: number
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          merchant: string
          category?: string | null
          date: string
          total: number
          tax?: number | null
          description?: string | null
          receipt_url?: string | null
          is_tax_deductible?: boolean
          business_use_percentage?: number
          tax_category?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          merchant?: string
          category?: string | null
          date?: string
          total?: number
          tax?: number | null
          description?: string | null
          receipt_url?: string | null
          is_tax_deductible?: boolean
          business_use_percentage?: number
          tax_category?: string | null
        }
      }
      line_item_templates: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          rate: number
          quantity: number
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string | null
          rate: number
          quantity?: number
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string | null
          rate?: number
          quantity?: number
        }
      }
      mileage: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          date: string
          purpose: string
          miles: number
          rate_per_mile: number
          total: number
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          date: string
          purpose: string
          miles: number
          rate_per_mile?: number
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          date?: string
          purpose?: string
          miles?: number
          rate_per_mile?: number
          notes?: string | null
        }
      }
      household_settings: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          rent_business_percentage: number
          utilities_business_percentage: number
          internet_business_percentage: number
          monthly_rent: number | null
          monthly_utilities: number | null
          monthly_internet: number | null
          total_home_square_feet: number | null
          office_square_feet: number | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          rent_business_percentage?: number
          utilities_business_percentage?: number
          internet_business_percentage?: number
          monthly_rent?: number | null
          monthly_utilities?: number | null
          monthly_internet?: number | null
          total_home_square_feet?: number | null
          office_square_feet?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          rent_business_percentage?: number
          utilities_business_percentage?: number
          internet_business_percentage?: number
          monthly_rent?: number | null
          monthly_utilities?: number | null
          monthly_internet?: number | null
          total_home_square_feet?: number | null
          office_square_feet?: number | null
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          name: string
          email: string | null
          phone: string | null
          mobile: string | null
          fax: string | null
          website: string | null
          address: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string | null
          contact_person: string | null
          tax_id: string | null
          notes: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          name: string
          email?: string | null
          phone?: string | null
          mobile?: string | null
          fax?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          contact_person?: string | null
          tax_id?: string | null
          notes?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          name?: string
          email?: string | null
          phone?: string | null
          mobile?: string | null
          fax?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          contact_person?: string | null
          tax_id?: string | null
          notes?: string | null
          is_active?: boolean
        }
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
  }
}
