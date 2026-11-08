// Public browser configuration. The publishable key is designed for frontend use;
// Row Level Security protects all database writes.
if (window.supabase && typeof window.supabase.createClient === "function") {
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
} else {
  // The public character catalogue has a bundled fallback and can still load.
  window.wuwaSupabase = null;
  console.warn("Supabase client library did not load; using bundled public data.");
}
