// Public browser configuration. The publishable key is designed for frontend use;
// Row Level Security protects all database writes.
window.wuwaSupabase = window.supabase.createClient(
  "https://humdqfjyuzsiucjpxavj.supabase.co",
  "sb_publishable_JOGHApbpnaQV3Mef5FPS_A_GE5Kzput",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
