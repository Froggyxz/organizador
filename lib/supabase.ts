import { createClient } from '@supabase/supabase-js';

// Essas variáveis são lidas do seu arquivo .env.local (localmente) 
// ou das Environment Variables que você configurou no painel da Vercel.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltam as variáveis de ambiente do Supabase!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);