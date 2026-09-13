// Public configuration for the page. The Supabase anon key is public by design; row-level security protects the data.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
    plan: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
