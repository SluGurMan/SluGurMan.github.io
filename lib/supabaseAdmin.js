// server-side privileged client; use SUPABASE_SERVICE_ROLE_KEY (keep secret)
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(url, key);
