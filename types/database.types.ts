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
      tiers: {
        Row: {
          id: string
          name: string
          rank: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          rank: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          rank?: number
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          phone: string | null
          email: string | null
          role: 'client' | 'admin'
          tier_id: string | null
          created_at: string
          display_name: string | null
          notes: string | null
        }
        Insert: {
          id: string
          phone?: string | null
          email?: string | null
          role: 'client' | 'admin'
          tier_id?: string | null
          created_at?: string
          display_name?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          phone?: string | null
          email?: string | null
          role?: 'client' | 'admin'
          tier_id?: string | null
          created_at?: string
          display_name?: string | null
          notes?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          code: string
          name: string
          category_id: string
          description: string | null
          stock: number
          unit: string
          image_url: string | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          category_id: string
          description?: string | null
          stock?: number
          unit?: string
          image_url?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          category_id?: string
          description?: string | null
          stock?: number
          unit?: string
          image_url?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
