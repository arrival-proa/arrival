// api/keep-alive.js · impede que o Supabase gratuito pause por falta de uso
// O cron da Vercel (vercel.json) chama esta rota 2 vezes por dia e envia o CRON_SECRET sozinho.
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Não autorizado', { status: 401 });
  }

  // Usa a chave secreta porque as tabelas não aceitam leitura de visitantes (RLS).
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.from('perfis').select('id').limit(1);

  if (error) console.error('keep-alive:', error.message);
  return Response.json({ ok: !error, quando: new Date().toISOString() }, { status: error ? 500 : 200 });
}
