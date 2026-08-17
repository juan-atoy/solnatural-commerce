export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string;
          city: string;
          country: string;
          created_at: string;
          id: string;
          is_default: boolean;
          label: string | null;
          phone: string;
          recipient_name: string;
          region: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address_line: string;
          city: string;
          country?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          phone: string;
          recipient_name: string;
          region?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address_line?: string;
          city?: string;
          country?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          phone?: string;
          recipient_name?: string;
          region?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: string;
          new_values: Json | null;
          old_values: Json | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: string;
          new_values?: Json | null;
          old_values?: Json | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          new_values?: Json | null;
          old_values?: Json | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          quantity: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          quantity?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_public";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          new_stock: number;
          notes: string | null;
          order_id: string | null;
          previous_stock: number;
          product_id: string;
          quantity: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          new_stock: number;
          notes?: string | null;
          order_id?: string | null;
          previous_stock: number;
          product_id: string;
          quantity: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_type?: Database["public"]["Enums"]["movement_type"];
          new_stock?: number;
          notes?: string | null;
          order_id?: string | null;
          previous_stock?: number;
          product_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_public";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          is_read: boolean;
          message: string;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          is_read?: boolean;
          message: string;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          is_read?: boolean;
          message?: string;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          created_at: string;
          discount: number;
          id: string;
          line_cost: number;
          line_profit: number;
          line_total: number;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          sku: string;
          unit_cost: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          discount?: number;
          id?: string;
          line_cost?: number;
          line_profit?: number;
          line_total: number;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          sku: string;
          unit_cost?: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          discount?: number;
          id?: string;
          line_cost?: number;
          line_profit?: number;
          line_total?: number;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          sku?: string;
          unit_cost?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_public";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          created_at: string;
          created_by: string | null;
          from_status: Database["public"]["Enums"]["order_status"] | null;
          id: string;
          note: string | null;
          order_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: string;
          note?: string | null;
          order_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: string;
          note?: string | null;
          order_id?: string;
          to_status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          customer_email: string;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string;
          discount_total: number;
          gross_profit: number;
          id: string;
          notes: string | null;
          order_number: string;
          order_status: Database["public"]["Enums"]["order_status"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          shipping_address: string;
          shipping_city: string;
          shipping_company_cost: number;
          shipping_country: string;
          shipping_customer_charge: number;
          shipping_method_code: string;
          shipping_method_name: string;
          shipping_region: string | null;
          shipping_total: number;
          subtotal: number;
          total: number;
          total_cost: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_email: string;
          customer_id?: string | null;
          customer_name: string;
          customer_phone: string;
          discount_total?: number;
          gross_profit?: number;
          id?: string;
          notes?: string | null;
          order_number: string;
          order_status?: Database["public"]["Enums"]["order_status"];
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          shipping_address: string;
          shipping_city: string;
          shipping_company_cost?: number;
          shipping_country?: string;
          shipping_customer_charge?: number;
          shipping_method_code?: string;
          shipping_method_name?: string;
          shipping_region?: string | null;
          shipping_total?: number;
          subtotal?: number;
          total?: number;
          total_cost?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_email?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          discount_total?: number;
          gross_profit?: number;
          id?: string;
          notes?: string | null;
          order_number?: string;
          order_status?: Database["public"]["Enums"]["order_status"];
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          shipping_address?: string;
          shipping_city?: string;
          shipping_company_cost?: number;
          shipping_country?: string;
          shipping_customer_charge?: number;
          shipping_method_code?: string;
          shipping_method_name?: string;
          shipping_region?: string | null;
          shipping_total?: number;
          subtotal?: number;
          total?: number;
          total_cost?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          alt: string | null;
          created_at: string;
          id: string;
          is_primary: boolean;
          product_id: string;
          sort_order: number;
          storage_path: string | null;
          url: string;
        };
        Insert: {
          alt?: string | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          product_id: string;
          sort_order?: number;
          storage_path?: string | null;
          url: string;
        };
        Update: {
          alt?: string | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          product_id?: string;
          sort_order?: number;
          storage_path?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_public";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          benefits: string | null;
          brand: string | null;
          category_id: string | null;
          cost_price: number;
          created_at: string;
          description: string | null;
          gallery: string[];
          id: string;
          image_url: string | null;
          ingredients: string | null;
          is_featured: boolean;
          min_stock: number;
          name: string;
          price: number;
          sale_price: number | null;
          short_description: string | null;
          sku: string;
          slug: string;
          status: Database["public"]["Enums"]["product_status"];
          stock: number;
          unit: string;
          updated_at: string;
          usage_mode: string | null;
          warnings: string | null;
        };
        Insert: {
          benefits?: string | null;
          brand?: string | null;
          category_id?: string | null;
          cost_price?: number;
          created_at?: string;
          description?: string | null;
          gallery?: string[];
          id?: string;
          image_url?: string | null;
          ingredients?: string | null;
          is_featured?: boolean;
          min_stock?: number;
          name: string;
          price: number;
          sale_price?: number | null;
          short_description?: string | null;
          sku: string;
          slug: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock?: number;
          unit?: string;
          updated_at?: string;
          usage_mode?: string | null;
          warnings?: string | null;
        };
        Update: {
          benefits?: string | null;
          brand?: string | null;
          category_id?: string | null;
          cost_price?: number;
          created_at?: string;
          description?: string | null;
          gallery?: string[];
          id?: string;
          image_url?: string | null;
          ingredients?: string | null;
          is_featured?: boolean;
          min_stock?: number;
          name?: string;
          price?: number;
          sale_price?: number | null;
          short_description?: string | null;
          sku?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock?: number;
          unit?: string;
          updated_at?: string;
          usage_mode?: string | null;
          warnings?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          document: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          document?: string | null;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          document?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          address: string | null;
          bank_details: string | null;
          currency: string;
          default_shipping_method: string;
          email: string | null;
          facebook: string | null;
          free_shipping_min: number;
          id: boolean;
          instagram: string | null;
          logo_url: string | null;
          payment_methods: string[];
          phone: string | null;
          shipping_company_cost: number;
          shipping_cost: number;
          shipping_message: string | null;
          shipping_methods: Json;
          store_name: string;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          address?: string | null;
          bank_details?: string | null;
          currency?: string;
          default_shipping_method?: string;
          email?: string | null;
          facebook?: string | null;
          free_shipping_min?: number;
          id?: boolean;
          instagram?: string | null;
          logo_url?: string | null;
          payment_methods?: string[];
          phone?: string | null;
          shipping_company_cost?: number;
          shipping_cost?: number;
          shipping_message?: string | null;
          shipping_methods?: Json;
          store_name?: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          bank_details?: string | null;
          currency?: string;
          default_shipping_method?: string;
          email?: string | null;
          facebook?: string | null;
          free_shipping_min?: number;
          id?: boolean;
          instagram?: string | null;
          logo_url?: string | null;
          payment_methods?: string[];
          phone?: string | null;
          shipping_company_cost?: number;
          shipping_cost?: number;
          shipping_message?: string | null;
          shipping_methods?: Json;
          store_name?: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      my_order_items: {
        Row: {
          created_at: string | null;
          discount: number | null;
          id: string | null;
          line_total: number | null;
          order_id: string | null;
          product_id: string | null;
          product_name: string | null;
          quantity: number | null;
          sku: string | null;
          unit_price: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_public";
            referencedColumns: ["id"];
          },
        ];
      };
      products_public: {
        Row: {
          benefits: string | null;
          brand: string | null;
          category_id: string | null;
          category_name: string | null;
          category_slug: string | null;
          created_at: string | null;
          description: string | null;
          gallery: string[] | null;
          id: string | null;
          image_url: string | null;
          ingredients: string | null;
          is_featured: boolean | null;
          name: string | null;
          price: number | null;
          sale_price: number | null;
          short_description: string | null;
          sku: string | null;
          slug: string | null;
          status: Database["public"]["Enums"]["product_status"] | null;
          stock: number | null;
          unit: string | null;
          usage_mode: string | null;
          warnings: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      adjust_stock: {
        Args: { p_new_stock: number; p_notes?: string; p_product_id: string };
        Returns: number;
      };
      claim_admin: { Args: never; Returns: boolean };
      create_order: {
        Args: {
          p_customer_email: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_items: Json;
          p_notes?: string;
          p_payment_method?: Database["public"]["Enums"]["payment_method"];
          p_shipping_address: string;
          p_shipping_city: string;
          p_shipping_country?: string;
          p_shipping_region?: string;
        };
        Returns: Json;
      };
      create_order_v2: {
        Args: {
          p_customer_email: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_items: Json;
          p_notes?: string;
          p_payment_method?: Database["public"]["Enums"]["payment_method"];
          p_shipping_address: string;
          p_shipping_city: string;
          p_shipping_country?: string;
          p_shipping_method?: string;
          p_shipping_region?: string;
        };
        Returns: Json;
      };
      get_low_stock_products: {
        Args: never;
        Returns: {
          id: string;
          min_stock: number;
          name: string;
          sku: string;
          status: string;
          stock: number;
        }[];
      };
      get_orders_by_status: {
        Args: { p_from?: string; p_to?: string };
        Returns: {
          orders_count: number;
          status: string;
          total: number;
        }[];
      };
      get_sales_by_category: {
        Args: { p_from?: string; p_to?: string };
        Returns: {
          category_name: string;
          profit: number;
          revenue: number;
          units: number;
        }[];
      };
      get_sales_by_period: {
        Args: { p_bucket?: string; p_from: string; p_to: string };
        Returns: {
          bucket: string;
          cost: number;
          orders_count: number;
          profit: number;
          sales: number;
        }[];
      };
      get_sales_report: {
        Args: { p_from?: string; p_to?: string };
        Returns: {
          cost: number;
          created_at: string;
          customer_name: string;
          margin: number;
          order_number: string;
          order_status: string;
          payment_status: string;
          profit: number;
          sales: number;
        }[];
      };
      get_sales_summary: {
        Args: { p_from?: string; p_to?: string };
        Returns: {
          avg_ticket: number;
          gross_profit: number;
          gross_sales: number;
          margin: number;
          net_profit: number;
          orders_count: number;
          paid_sales: number;
          total_cost: number;
          unpaid_sales: number;
        }[];
      };
      get_top_customers: {
        Args: { p_from?: string; p_limit?: number; p_to?: string };
        Returns: {
          avg_ticket: number;
          customer_email: string;
          customer_name: string;
          orders_count: number;
          total_spent: number;
        }[];
      };
      get_top_products: {
        Args: { p_from?: string; p_limit?: number; p_to?: string };
        Returns: {
          cost: number;
          margin: number;
          product_id: string;
          product_name: string;
          profit: number;
          revenue: number;
          units: number;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
      set_order_status: {
        Args: {
          p_note?: string;
          p_order_id: string;
          p_status: Database["public"]["Enums"]["order_status"];
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "customer";
      movement_type:
        "purchase" | "sale" | "return" | "adjustment" | "cancellation" | "manual_entry";
      order_status:
        "pending" | "confirmed" | "processing" | "ready" | "shipped" | "delivered" | "cancelled";
      payment_method: "bank_transfer" | "cash_on_delivery";
      payment_status: "pending" | "paid" | "failed" | "refunded";
      product_status: "draft" | "active" | "out_of_stock" | "discontinued" | "inactive";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      movement_type: ["purchase", "sale", "return", "adjustment", "cancellation", "manual_entry"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "ready",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: ["bank_transfer", "cash_on_delivery"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      product_status: ["draft", "active", "out_of_stock", "discontinued", "inactive"],
    },
  },
} as const;
