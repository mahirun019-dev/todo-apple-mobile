export type SourceType = "mynavi" | "official" | "other";
export type WatchStatus = "active" | "checking" | "error" | "paused";
export type EventType = "entry_open" | "briefing_open" | "internship_open" | "deadline_changed" | "selection_updated" | "job_info_updated" | "recruitment_closed" | "other_recruitment_update";

export interface Env {
  DB: D1Database;
  WATCH_ACCESS_CODE: string;
  ALLOWED_ORIGIN: string;
}

export interface TargetRow {
  id: string;
  company_id: string;
  company_name: string;
  source_type: SourceType;
  label: string;
  url: string;
  normalized_url: string;
  enabled: number;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
  last_success_at: string | null;
  status: WatchStatus;
  last_http_status: number | null;
  last_hash: string | null;
  last_error: string | null;
  snapshot: string | null;
}
