// Hand-authored types mirroring supabase/migrations/*.sql.
// Once a live Supabase project exists, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
// and re-merge any manual additions from this file.

export type UserRole = "customer" | "guy" | "admin";
export type GuyStatus = "pending" | "approved" | "rejected" | "suspended";
export type PricingModel = "flat" | "hourly" | "quantity" | "sqft" | "quote";
export type JobStatusDB =
  | "REQUESTED" | "MATCHING" | "QUOTED" | "ACCEPTED" | "SCHEDULED"
  | "EN_ROUTE" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  | "DECLINED" | "EXPIRED" | "DISPUTED" | "REFUNDED" | "PAYOUT_PENDING"
  | "PAYOUT_COMPLETED";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded" | "refund_pending";
export type PayoutStatus = "pending" | "in_transit" | "paid" | "failed";
export type TransactionType =
  | "charge" | "platform_fee" | "provider_payout" | "tip" | "refund"
  | "discount" | "tax" | "processor_fee" | "adjustment";
export type LedgerAccount = "customer" | "platform" | "provider";

export interface RequestField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "multiselect";
  required?: boolean;
  options?: string[];
}

interface Table<Row, Insert, Update = Partial<Row>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  // Required by @supabase/postgrest-js's GenericTable constraint. We don't
  // model FK relationships for typed embedded-resource selects (joins are
  // manually cast at call sites instead) — without this field the whole
  // Database type fails its GenericSchema constraint and every query
  // silently degrades to `never`.
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string; role: UserRole; full_name: string; phone: string | null;
          avatar_url: string | null; created_at: string; updated_at: string;
        },
        { id: string; role?: UserRole; full_name?: string; phone?: string | null; avatar_url?: string | null }
      >;
      guy_profiles: Table<
        {
          id: string; status: GuyStatus; bio: string; years_experience: number | null;
          identity_verified: boolean; background_check_status: string;
          stripe_connect_account_id: string | null; stripe_payouts_enabled: boolean;
          is_available: boolean; avg_rating: number | null; rating_count: number;
          completed_jobs_count: number; applied_at: string; approved_at: string | null;
          created_at: string; updated_at: string;
        },
        { id: string; status?: GuyStatus; bio?: string; years_experience?: number | null; approved_at?: string | null }
      >;
      addresses: Table<
        {
          id: string; user_id: string; label: string; line1: string; line2: string | null;
          city: string; state: string; postal_code: string; lat: number | null; lng: number | null;
          is_default: boolean; created_at: string;
        },
        {
          user_id: string; label?: string; line1: string; line2?: string | null; city: string;
          state: string; postal_code: string; lat?: number | null; lng?: number | null; is_default?: boolean;
        }
      >;
      guy_service_areas: Table<
        {
          id: string; guy_id: string; center_lat: number; center_lng: number; radius_miles: number;
          postal_code: string | null; city: string | null; state: string | null; created_at: string;
        },
        { guy_id: string; center_lat: number; center_lng: number; radius_miles?: number; postal_code?: string | null; city?: string | null; state?: string | null }
      >;
      guy_availability: Table<
        { id: string; guy_id: string; day_of_week: number; start_time: string; end_time: string; created_at: string },
        { guy_id: string; day_of_week: number; start_time: string; end_time: string }
      >;
      service_categories: Table<
        { id: string; name: string; slug: string; description: string; icon: string; sort_order: number; active: boolean; created_at: string },
        { id?: string; name: string; slug: string; description?: string; icon?: string; sort_order?: number; active?: boolean }
      >;
      services: Table<
        {
          id: string; category_id: string; name: string; slug: string; short_description: string;
          description: string; pricing_model: PricingModel; base_price_cents: number; min_price_cents: number;
          unit_label: string | null; request_fields: RequestField[]; image_url: string | null;
          active: boolean; sort_order: number; created_at: string; updated_at: string;
        },
        {
          id?: string; category_id: string; name: string; slug: string; short_description?: string; description?: string;
          pricing_model?: PricingModel; base_price_cents?: number; min_price_cents?: number;
          unit_label?: string | null; request_fields?: RequestField[]; image_url?: string | null; active?: boolean;
        }
      >;
      service_addons: Table<
        { id: string; service_id: string; name: string; price_cents: number; active: boolean; sort_order: number },
        { service_id: string; name: string; price_cents: number; active?: boolean; sort_order?: number }
      >;
      guy_services: Table<
        { guy_id: string; service_id: string; custom_base_price_cents: number | null; active: boolean; created_at: string },
        { guy_id: string; service_id: string; custom_base_price_cents?: number | null; active?: boolean }
      >;
      platform_fee_rules: Table<
        { id: string; service_id: string | null; fee_type: string; fee_value: number; min_fee_cents: number; active: boolean; created_at: string },
        { id?: string; service_id?: string | null; fee_type?: string; fee_value?: number; min_fee_cents?: number; active?: boolean }
      >;
      promotions: Table<
        {
          id: string; code: string; description: string; discount_type: string; discount_value: number;
          max_uses: number | null; used_count: number; active: boolean; expires_at: string | null; created_at: string;
        },
        { id?: string; code: string; description?: string; discount_type?: string; discount_value?: number; max_uses?: number | null; active?: boolean; expires_at?: string | null }
      >;
      jobs: Table<
        {
          id: string; customer_id: string; service_id: string; guy_id: string | null; address_id: string;
          city: string; state: string; postal_code: string; status: JobStatusDB; description: string;
          details: Record<string, unknown>; addon_ids: string[]; quantity: number | null;
          requested_at: string; scheduled_start: string | null; scheduled_end: string | null; is_asap: boolean;
          service_amount_cents: number; addon_amount_cents: number; discount_cents: number; tax_cents: number;
          platform_fee_cents: number; tip_cents: number; total_cents: number; promotion_id: string | null;
          cancelled_by: string | null; cancellation_reason: string | null; created_at: string; updated_at: string;
        },
        {
          customer_id: string; service_id: string; guy_id?: string | null; address_id: string;
          city: string; state: string; postal_code: string; status?: JobStatusDB; description?: string;
          details?: Record<string, unknown>; addon_ids?: string[]; quantity?: number | null;
          scheduled_start?: string | null; scheduled_end?: string | null; is_asap?: boolean;
          service_amount_cents?: number; addon_amount_cents?: number; discount_cents?: number; tax_cents?: number;
          platform_fee_cents?: number; tip_cents?: number; total_cents?: number; promotion_id?: string | null;
        }
      >;
      job_status_history: Table<
        { id: string; job_id: string; status: JobStatusDB; changed_by: string | null; note: string | null; created_at: string },
        { job_id: string; status: JobStatusDB; changed_by?: string | null; note?: string | null }
      >;
      job_photos: Table<
        { id: string; job_id: string; url: string; stage: string; uploaded_by: string | null; created_at: string },
        { job_id: string; url: string; stage?: string; uploaded_by?: string | null }
      >;
      quotes: Table<
        { id: string; job_id: string; guy_id: string; amount_cents: number; note: string; status: string; proposed_by: "guy" | "customer"; created_at: string },
        { job_id: string; guy_id: string; amount_cents: number; note?: string; status?: string; proposed_by?: "guy" | "customer" }
      >;
      payments: Table<
        {
          id: string; job_id: string; customer_id: string; amount_cents: number; currency: string;
          kind: "charge" | "tip"; status: PaymentStatus; processor: string; processor_payment_intent_id: string | null;
          processor_fee_cents: number; refunded_cents: number; created_at: string; updated_at: string;
        },
        {
          job_id: string; customer_id: string; amount_cents: number; currency?: string; kind?: "charge" | "tip"; status?: PaymentStatus;
          processor?: string; processor_payment_intent_id?: string | null; processor_fee_cents?: number; refunded_cents?: number;
        }
      >;
      transactions: Table<
        {
          id: string; job_id: string; payment_id: string | null; type: TransactionType; account: LedgerAccount;
          amount_cents: number; description: string; created_at: string;
        },
        { job_id: string; payment_id?: string | null; type: TransactionType; account: LedgerAccount; amount_cents: number; description?: string }
      >;
      provider_payouts: Table<
        {
          id: string; guy_id: string; job_id: string; amount_cents: number; status: PayoutStatus;
          type: "completion" | "tip"; processor_transfer_id: string | null; created_at: string; paid_at: string | null;
        },
        { guy_id: string; job_id: string; amount_cents: number; status?: PayoutStatus; type?: "completion" | "tip"; processor_transfer_id?: string | null; paid_at?: string | null }
      >;
      processed_webhook_events: Table<
        { event_id: string; processor: string; processed_at: string },
        { event_id: string; processor?: string; processed_at?: string }
      >;
      reviews: Table<
        { id: string; job_id: string; author_id: string; target_id: string; rating: number; comment: string; created_at: string },
        { job_id: string; author_id: string; target_id: string; rating: number; comment?: string }
      >;
      messages: Table<
        { id: string; job_id: string; sender_id: string; recipient_id: string; body: string; read_at: string | null; created_at: string },
        { job_id: string; sender_id: string; recipient_id: string; body: string }
      >;
      notifications: Table<
        {
          id: string; user_id: string; type: string; title: string; body: string;
          data: Record<string, unknown>; read_at: string | null; created_at: string;
        },
        { user_id: string; type: string; title: string; body?: string; data?: Record<string, unknown> }
      >;
      support_tickets: Table<
        { id: string; user_id: string; job_id: string | null; subject: string; body: string; status: string; created_at: string; updated_at: string },
        { user_id: string; job_id?: string | null; subject: string; body: string; status?: string }
      >;
    };
    Views: {
      public_guy_profiles: {
        Row: {
          id: string; full_name: string; avatar_url: string | null; bio: string;
          avg_rating: number | null; rating_count: number; completed_jobs_count: number;
          identity_verified: boolean; background_check_status: string; years_experience: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      redeem_promotion: { Args: { promo_id: string }; Returns: boolean };
    };
  };
}
