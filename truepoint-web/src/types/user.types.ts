export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  preferred_grading_company: string;
  show_market_values: boolean;
  is_pro_member: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  user_id: string;
  notify_price_alerts: boolean;
  notify_grading_updates: boolean;
  notify_marketing: boolean;
}

export type PlanTier = "starter" | "collector" | "pro";
