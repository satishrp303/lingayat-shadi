declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    SUPABASE_STORAGE_BUCKET?: string;
  }
}
