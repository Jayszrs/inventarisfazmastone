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
      barang: {
        Row: {
          created_at: string
          harga_beli: number
          harga_jual: number
          id: string
          kategori: string
          nama_barang: string
          stok: number
          supplier: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          harga_beli?: number
          harga_jual?: number
          id?: string
          kategori?: string
          nama_barang: string
          stok?: number
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          harga_beli?: number
          harga_jual?: number
          id?: string
          kategori?: string
          nama_barang?: string
          stok?: number
          supplier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      detail_transaksi: {
        Row: {
          barang_id: string
          created_at: string
          harga: number
          id: string
          jumlah: number
          transaksi_id: string
        }
        Insert: {
          barang_id: string
          created_at?: string
          harga?: number
          id?: string
          jumlah?: number
          transaksi_id: string
        }
        Update: {
          barang_id?: string
          created_at?: string
          harga?: number
          id?: string
          jumlah?: number
          transaksi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detail_transaksi_barang_id_fkey"
            columns: ["barang_id"]
            isOneToOne: false
            referencedRelation: "barang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_transaksi_transaksi_id_fkey"
            columns: ["transaksi_id"]
            isOneToOne: false
            referencedRelation: "transaksi"
            referencedColumns: ["id"]
          },
        ]
      }
      dokumentasi: {
        Row: {
          created_at: string
          deskripsi: string | null
          file_url: string
          id: string
          kategori: string | null
          nama_file: string
          relasi_id: string | null
          tags: string[] | null
          tipe_file: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          file_url: string
          id?: string
          kategori?: string | null
          nama_file: string
          relasi_id?: string | null
          tags?: string[] | null
          tipe_file?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          file_url?: string
          id?: string
          kategori?: string | null
          nama_file?: string
          relasi_id?: string | null
          tags?: string[] | null
          tipe_file?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaksi: {
        Row: {
          created_at: string
          diskon: number
          id: string
          jumlah_bayar: number
          metode_pembayaran: string
          nomor_invoice: string
          pajak: number
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          diskon?: number
          id?: string
          jumlah_bayar?: number
          metode_pembayaran?: string
          nomor_invoice: string
          pajak?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          diskon?: number
          id?: string
          jumlah_bayar?: number
          metode_pembayaran?: string
          nomor_invoice?: string
          pajak?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      admin_set_user_role: {
        Args: {
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
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
      app_role: ["admin", "staff", "user"],
    },
  },
} as const
