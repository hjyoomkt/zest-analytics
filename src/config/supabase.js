import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.warn('[Supabase] 환경변수가 설정되지 않았습니다. 인증 기능이 작동하지 않습니다.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
