-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

-- Dados extras de cada conta. O id é o mesmo de auth.users.
create table if not exists public.perfis (
  id                uuid primary key references auth.users (id) on delete cascade,
  nome              text check (char_length(nome) <= 80),
  foto_url          text,
  admin             boolean not null default false,
  plano             text not null default 'gratuito'
                      check (plano in ('gratuito', 'pro', 'crew')),
  tour_visto        boolean not null default false,
  termos_aceitos_em timestamptz,
  criado_em         timestamptz not null default now()
);

-- Conversas com a Ari (o banco guarda só as 10 mais recentes por conta).
create table if not exists public.conversas (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null default auth.uid()
                  references auth.users (id) on delete cascade,
  titulo        text check (char_length(titulo) <= 120),
  etapa_atual   text not null default 'voos'
                  check (etapa_atual in ('voos', 'hospedagem', 'restaurantes', 'experiencias', 'fim')),
  orcamento     numeric(10, 2) check (orcamento is null or orcamento >= 0),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists conversas_usuario_idx
  on public.conversas (usuario_id, atualizado_em desc);

-- Mensagens de cada conversa.
create table if not exists public.mensagens (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas (id) on delete cascade,
  autor       text not null check (autor in ('usuario', 'ari')),
  texto       text not null check (char_length(texto) <= 8000),
  criado_em   timestamptz not null default now()
);
create index if not exists mensagens_conversa_idx
  on public.mensagens (conversa_id, criado_em);

-- Roteiros gerados. Continuam no histórico mesmo se a conversa for apagada.
create table if not exists public.viagens (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  conversa_id uuid references public.conversas (id) on delete set null,
  titulo      text check (char_length(titulo) <= 120),
  destino     text not null check (char_length(destino) <= 120),
  data_ida    date,
  data_volta  date,
  orcamento   numeric(10, 2) check (orcamento is null or orcamento >= 0),
  custo_total numeric(10, 2) check (custo_total is null or custo_total >= 0),
  criado_em   timestamptz not null default now(),
  check (data_volta is null or data_ida is null or data_volta >= data_ida)
);
create index if not exists viagens_usuario_idx
  on public.viagens (usuario_id, criado_em desc);

-- Itens de cada roteiro (voo, hotel, restaurante, experiência).
create table if not exists public.itens_viagem (
  id        uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.viagens (id) on delete cascade,
  tipo      text not null check (tipo in ('voo', 'hotel', 'restaurante', 'experiencia')),
  dia       date,
  refeicao  text check (refeicao in ('cafe', 'almoco', 'jantar')),
  ordem     smallint not null default 0,
  dados     jsonb not null default '{}'::jsonb  -- o resultado no formato do contrato
);
create index if not exists itens_viagem_viagem_idx
  on public.itens_viagem (viagem_id, dia, ordem);

-- Plano Crew: o titular assina e convida até 3 pessoas.
-- Cada pessoa tem a própria conta; quem é membro usa o plano Crew do titular.
create table if not exists public.crew_membros (
  usuario_id uuid primary key references auth.users (id) on delete cascade,  -- cada pessoa: um Crew só
  dono_id    uuid not null references auth.users (id) on delete cascade,     -- o titular que pagou
  entrou_em  timestamptz not null default now(),
  check (usuario_id <> dono_id)
);
create index if not exists crew_membros_dono_idx on public.crew_membros (dono_id);

-- Convites pendentes, por e-mail. A pessoa aceita ou recusa pela própria conta.
create table if not exists public.crew_convites (
  id        uuid primary key default gen_random_uuid(),
  dono_id   uuid not null references auth.users (id) on delete cascade,
  email     text not null check (char_length(email) <= 254),
  criado_em timestamptz not null default now(),
  unique (dono_id, email)
);

-- Quem do Crew participa de cada roteiro. O roteiro aparece no histórico de cada participante.
create table if not exists public.participantes_viagem (
  viagem_id     uuid not null references public.viagens (id) on delete cascade,
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  adicionado_em timestamptz not null default now(),
  primary key (viagem_id, usuario_id)
);
create index if not exists participantes_usuario_idx on public.participantes_viagem (usuario_id);

-- Contagem de buscas por conta e por dia (o limite mensal soma os dias do mês).
-- Só o back-end (chave secreta) acessa.
create table if not exists public.uso_diario (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  dia        date not null default (now() at time zone 'America/Sao_Paulo')::date,
  buscas     integer not null default 0 check (buscas >= 0),
  primary key (usuario_id, dia)
);

-- Registro de falhas para a tela de admin. Só o back-end escreve e lê.
create table if not exists public.erros (
  id       bigint generated always as identity primary key,
  quando   timestamptz not null default now(),
  origem   text not null check (origem in ('serpapi', 'gemini', 'banco', 'outro')),
  mensagem text not null check (char_length(mensagem) <= 500)
);
create index if not exists erros_quando_idx on public.erros (quando desc);


-- ---------------------------------------------------------------------
-- 2. FUNÇÕES E TRIGGERS
-- ---------------------------------------------------------------------

-- 2.1 Cria o perfil sozinho quando alguém se cadastra.
-- O front manda nome e data de aceite dos termos em options.data do signUp:
--   supabase.auth.signUp({ email, password, options: { data: { nome, termos_aceitos_em } } })
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, termos_aceitos_em)
  values (
    new.id,
    left(new.raw_user_meta_data ->> 'nome', 80),
    nullif(new.raw_user_meta_data ->> 'termos_aceitos_em', '')::timestamptz
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_conta on auth.users;
create trigger ao_criar_conta
  after insert on auth.users
  for each row execute function public.criar_perfil();


-- 2.2 Limites de cada plano. Mudou um plano? Mude só esta tabela.
--   gratuito: 4 roteiros e 40 buscas por mês
--   pro:      8 roteiros e 100 buscas por mês
--   crew:     16 roteiros por mês e 12 buscas por DIA
-- O mês é o mês do calendário, no horário de Brasília.
create or replace function public.limites_do_plano(p_plano text)
returns table (roteiros_mes integer, buscas integer, periodo_buscas text)
language sql
immutable
set search_path = ''
as $$
  select l.roteiros_mes, l.buscas, l.periodo_buscas
  from (values
    ('gratuito', 4, 40, 'mes'),
    ('pro', 8, 100, 'mes'),
    ('crew', 16, 12, 'dia')
  ) as l (plano, roteiros_mes, buscas, periodo_buscas)
  where l.plano = coalesce(p_plano, 'gratuito');
$$;

-- Início do dia e do mês atuais em Brasília.
create or replace function public.inicio_do_mes()
returns timestamptz language sql stable set search_path = '' as $$
  select date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
$$;

-- Titular do Crew de uma pessoa (ela mesma, se for a titular), ou null se não estiver num Crew.
-- Se o titular sair do plano Crew, os membros voltam sozinhos para o próprio plano.
create or replace function public.dono_do_crew(p_usuario uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.crew_membros where usuario_id = p_usuario) then
      (select m.dono_id from public.crew_membros m
         join public.perfis d on d.id = m.dono_id
        where m.usuario_id = p_usuario and d.plano = 'crew')
    when (select plano from public.perfis where id = p_usuario) = 'crew' then p_usuario
  end;
$$;

-- Plano que vale para a pessoa: Crew se estiver num Crew ativo; senão, o do próprio perfil.
create or replace function public.plano_de(p_usuario uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when public.dono_do_crew(p_usuario) is not null then 'crew'
    else coalesce((select plano from public.perfis where id = p_usuario
                   and plano <> 'crew'), 'gratuito')
  end;
$$;


-- 2.3 Limite de roteiros por mês, conforme o plano da conta.
create or replace function public.limite_roteiros_mes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plano  text := public.plano_de(new.usuario_id);
  v_limite integer := (select roteiros_mes from public.limites_do_plano(v_plano));
begin
  if (
    select count(*) from public.viagens
    where usuario_id = new.usuario_id
      and criado_em >= public.inicio_do_mes()
  ) >= v_limite then
    raise exception 'Limite de % roteiros por mês do plano % atingido', v_limite, v_plano
      using errcode = 'P0001', hint = 'limite_roteiros';
  end if;
  return new;
end;
$$;

drop function if exists public.limite_roteiros_dia() cascade;
drop trigger if exists limite_roteiros on public.viagens;
create trigger limite_roteiros
  before insert on public.viagens
  for each row execute function public.limite_roteiros_mes();


-- 2.4 Guarda só as 10 conversas mais recentes de cada conta.
-- Apaga as mais antigas (e as mensagens delas); o roteiro gerado continua.
create or replace function public.manter_ultimas_conversas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A conversa recém-criada nunca é apagada; das outras, ficam as 9 mais recentes.
  delete from public.conversas
  where id in (
    select id from public.conversas
    where usuario_id = new.usuario_id
      and id <> new.id
    order by atualizado_em desc, criado_em desc, id
    offset 9
  );
  return null;
end;
$$;

drop trigger if exists ultimas_conversas on public.conversas;
create trigger ultimas_conversas
  after insert on public.conversas
  for each row execute function public.manter_ultimas_conversas();


-- 2.5 Atualiza conversas.atualizado_em quando a conversa muda
-- ou quando chega mensagem nova (para o menu mostrar a mais recente primeiro).
create or replace function public.tocar_conversa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'conversas' then
    new.atualizado_em := now();
    return new;
  end if;
  update public.conversas set atualizado_em = now() where id = new.conversa_id;
  return null;
end;
$$;

drop trigger if exists conversa_atualizada on public.conversas;
create trigger conversa_atualizada
  before update on public.conversas
  for each row execute function public.tocar_conversa();

drop trigger if exists mensagem_nova on public.mensagens;
create trigger mensagem_nova
  after insert on public.mensagens
  for each row execute function public.tocar_conversa();


-- 2.6 Buscas. Só o api/chat.js chama estas duas funções (com a chave secreta).
-- Antes de chamar a IA: buscas_disponiveis(usuario) > 0? Depois: registrar_buscas(usuario, quantas usou).
create or replace function public.registrar_buscas(p_usuario uuid, p_quantidade integer default 1)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into public.uso_diario (usuario_id, dia, buscas)
  values (p_usuario, (now() at time zone 'America/Sao_Paulo')::date, greatest(p_quantidade, 0))
  on conflict (usuario_id, dia)
  do update set buscas = public.uso_diario.buscas + excluded.buscas
  returning buscas;
$$;

create or replace function public.buscas_disponiveis(p_usuario uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(l.buscas - coalesce((
    select sum(u.buscas) from public.uso_diario u
    where u.usuario_id = p_usuario
      and u.dia >= case l.periodo_buscas
                     when 'dia' then (now() at time zone 'America/Sao_Paulo')::date
                     else date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
                   end
  ), 0), 0)::integer
  from public.limites_do_plano(public.plano_de(p_usuario)) l;
$$;


-- 2.7 Resumo do uso da própria conta, para o perfil, a tela de planos e o chat.
-- No front: const { data } = await supabase.rpc('meu_uso')
create or replace function public.meu_uso()
returns table (
  plano text, roteiros_usados integer, roteiros_limite integer,
  buscas_restantes integer, buscas_limite integer, periodo_buscas text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.plano_de(auth.uid()),
    (select count(*)::integer from public.viagens
      where usuario_id = auth.uid() and criado_em >= public.inicio_do_mes()),
    l.roteiros_mes,
    public.buscas_disponiveis(auth.uid()),
    l.buscas,
    l.periodo_buscas
  from public.limites_do_plano(public.plano_de(auth.uid())) l
  where auth.uid() is not null;
$$;


-- 2.8 Plano Crew. O site chama estas funções com supabase.rpc('nome', { parametros }).

-- Ajudantes usados nas regras de segurança (RLS).
create or replace function public.pode_ver_viagem(p_viagem uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.viagens where id = p_viagem and usuario_id = auth.uid())
      or exists (select 1 from public.participantes_viagem where viagem_id = p_viagem and usuario_id = auth.uid());
$$;

create or replace function public.e_dono_da_viagem(p_viagem uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.viagens where id = p_viagem and usuario_id = auth.uid());
$$;

create or replace function public.mesmo_crew_que_eu(p_usuario uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.dono_do_crew(auth.uid()) is not null
     and public.dono_do_crew(auth.uid()) = public.dono_do_crew(p_usuario);
$$;

-- Quando alguém sai do Crew, deixa de ver os roteiros dos outros e os outros deixam de ver os dela.
create or replace function public.limpar_participacoes(p_usuario uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.participantes_viagem p
   using public.viagens v
   where v.id = p.viagem_id
     and ((p.usuario_id = p_usuario and v.usuario_id <> p_usuario)
       or (v.usuario_id = p_usuario and p.usuario_id <> p_usuario));
$$;

-- Titular convida pelo e-mail (no máximo 3 pessoas além dele).
create or replace function public.convidar_para_crew(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_eu    uuid := auth.uid();
  v_email text := lower(trim(p_email));
begin
  if v_eu is null then raise exception 'Faça login'; end if;
  if (select plano from public.perfis where id = v_eu) is distinct from 'crew'
     or exists (select 1 from public.crew_membros where usuario_id = v_eu) then
    raise exception 'Só o titular do plano Crew pode convidar' using hint = 'crew_titular';
  end if;
  if v_email = (select lower(email) from auth.users where id = v_eu) then
    raise exception 'Você já faz parte do seu Crew' using hint = 'crew_proprio_email';
  end if;
  if (select count(*) from public.crew_membros where dono_id = v_eu)
   + (select count(*) from public.crew_convites where dono_id = v_eu and email <> v_email) >= 3 then
    raise exception 'O plano Crew tem no máximo 4 pessoas' using hint = 'crew_cheio';
  end if;
  insert into public.crew_convites (dono_id, email) values (v_eu, v_email)
  on conflict (dono_id, email) do nothing;
end;
$$;

-- Convites que chegaram para mim.
create or replace function public.meus_convites_crew()
returns table (id uuid, titular text, criado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, coalesce(p.nome, 'Alguém'), c.criado_em
    from public.crew_convites c
    left join public.perfis p on p.id = c.dono_id
   where c.email = (select lower(email) from auth.users where id = auth.uid());
$$;

create or replace function public.aceitar_convite_crew(p_convite uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_eu    uuid := auth.uid();
  v_email text := (select lower(email) from auth.users where id = auth.uid());
  v_dono  uuid;
begin
  select dono_id into v_dono from public.crew_convites where id = p_convite and email = v_email;
  if v_dono is null then raise exception 'Convite não encontrado' using hint = 'crew_convite'; end if;
  if public.dono_do_crew(v_eu) is not null then
    raise exception 'Você já participa de um plano Crew' using hint = 'crew_ja_participa';
  end if;
  if (select count(*) from public.crew_membros where dono_id = v_dono) >= 3 then
    raise exception 'O plano Crew tem no máximo 4 pessoas' using hint = 'crew_cheio';
  end if;
  insert into public.crew_membros (usuario_id, dono_id) values (v_eu, v_dono);
  delete from public.crew_convites where email = v_email;
end;
$$;

create or replace function public.recusar_convite_crew(p_convite uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.crew_convites
   where id = p_convite and email = (select lower(email) from auth.users where id = auth.uid());
$$;

-- Membro sai do Crew por conta própria.
create or replace function public.sair_do_crew()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.limpar_participacoes(auth.uid());
  delete from public.crew_membros where usuario_id = auth.uid();
end;
$$;

-- Titular remove alguém do Crew.
create or replace function public.remover_do_crew(p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.crew_membros where usuario_id = p_usuario and dono_id = auth.uid()) then
    raise exception 'Essa pessoa não está no seu Crew' using hint = 'crew_membro';
  end if;
  perform public.limpar_participacoes(p_usuario);
  delete from public.crew_membros where usuario_id = p_usuario;
end;
$$;

-- Quem está no meu Crew (para a tela de perfil e para escolher participantes do roteiro).
create or replace function public.meu_crew()
returns table (usuario_id uuid, nome text, foto_url text, titular boolean, sou_eu boolean)
language sql stable security definer set search_path = '' as $$
  with grupo as (select public.dono_do_crew(auth.uid()) as dono)
  select p.id, p.nome, p.foto_url, p.id = g.dono, p.id = auth.uid()
    from grupo g
    join public.perfis p
      on p.id = g.dono
      or p.id in (select m.usuario_id from public.crew_membros m where m.dono_id = g.dono)
   where g.dono is not null
   order by p.id = g.dono desc, p.nome;
$$;


-- ---------------------------------------------------------------------
-- 3. SEGURANÇA (RLS): cada conta só enxerga e altera o que é dela
-- ---------------------------------------------------------------------

alter table public.perfis       enable row level security;
alter table public.conversas    enable row level security;
alter table public.mensagens    enable row level security;
alter table public.viagens      enable row level security;
alter table public.itens_viagem enable row level security;
alter table public.participantes_viagem enable row level security;
alter table public.crew_membros enable row level security;  -- sem políticas: só pelas funções do Crew
alter table public.crew_convites enable row level security;
alter table public.uso_diario   enable row level security;  -- sem políticas: só o back-end
alter table public.erros        enable row level security;  -- sem políticas: só o back-end

-- perfis: ler e editar o próprio perfil
drop policy if exists "perfil: ler o proprio" on public.perfis;
create policy "perfil: ler o proprio" on public.perfis
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "perfil: editar o proprio" on public.perfis;
create policy "perfil: editar o proprio" on public.perfis
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- conversas
drop policy if exists "conversas: so as proprias" on public.conversas;
create policy "conversas: so as proprias" on public.conversas
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

-- mensagens: só de conversas da própria conta
drop policy if exists "mensagens: so das proprias conversas" on public.mensagens;
create policy "mensagens: so das proprias conversas" on public.mensagens
  for all to authenticated
  using (exists (
    select 1 from public.conversas c
    where c.id = conversa_id and c.usuario_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.conversas c
    where c.id = conversa_id and c.usuario_id = (select auth.uid())
  ));

-- viagens: ver as próprias e as que me adicionaram; mudar só as próprias
drop policy if exists "viagens: so as proprias" on public.viagens;
drop policy if exists "viagens: ver proprias e compartilhadas" on public.viagens;
create policy "viagens: ver proprias e compartilhadas" on public.viagens
  for select to authenticated
  using ((select auth.uid()) = usuario_id or public.pode_ver_viagem(id));

drop policy if exists "viagens: criar as proprias" on public.viagens;
create policy "viagens: criar as proprias" on public.viagens
  for insert to authenticated
  with check ((select auth.uid()) = usuario_id);

drop policy if exists "viagens: editar as proprias" on public.viagens;
create policy "viagens: editar as proprias" on public.viagens
  for update to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

drop policy if exists "viagens: apagar as proprias" on public.viagens;
create policy "viagens: apagar as proprias" on public.viagens
  for delete to authenticated
  using ((select auth.uid()) = usuario_id);

-- itens_viagem: ver se pode ver a viagem; mudar só nas próprias
drop policy if exists "itens: so das proprias viagens" on public.itens_viagem;
drop policy if exists "itens: ver das viagens visiveis" on public.itens_viagem;
create policy "itens: ver das viagens visiveis" on public.itens_viagem
  for select to authenticated
  using (public.pode_ver_viagem(viagem_id));

drop policy if exists "itens: mudar das proprias viagens" on public.itens_viagem;
create policy "itens: mudar das proprias viagens" on public.itens_viagem
  for all to authenticated
  using (public.e_dono_da_viagem(viagem_id))
  with check (public.e_dono_da_viagem(viagem_id));

-- participantes: quem vê a viagem vê os participantes;
-- o dono adiciona gente do próprio Crew; o dono ou o próprio participante pode tirar
drop policy if exists "participantes: ver das proprias viagens" on public.participantes_viagem;
drop policy if exists "participantes: apagar das proprias viagens" on public.participantes_viagem;
drop policy if exists "participantes: adicionar no plano crew" on public.participantes_viagem;
drop policy if exists "participantes: editar no plano crew" on public.participantes_viagem;

drop policy if exists "participantes: ver" on public.participantes_viagem;
create policy "participantes: ver" on public.participantes_viagem
  for select to authenticated
  using (public.pode_ver_viagem(viagem_id));

drop policy if exists "participantes: adicionar do meu crew" on public.participantes_viagem;
create policy "participantes: adicionar do meu crew" on public.participantes_viagem
  for insert to authenticated
  with check (
    public.e_dono_da_viagem(viagem_id)
    and usuario_id <> (select auth.uid())
    and public.mesmo_crew_que_eu(usuario_id)
  );

drop policy if exists "participantes: tirar" on public.participantes_viagem;
create policy "participantes: tirar" on public.participantes_viagem
  for delete to authenticated
  using (public.e_dono_da_viagem(viagem_id) or usuario_id = (select auth.uid()));

-- convites do Crew: o titular vê e cancela os que mandou (criar é pela função convidar_para_crew)
drop policy if exists "convites: ver os que mandei" on public.crew_convites;
create policy "convites: ver os que mandei" on public.crew_convites
  for select to authenticated
  using ((select auth.uid()) = dono_id);

drop policy if exists "convites: cancelar os que mandei" on public.crew_convites;
create policy "convites: cancelar os que mandei" on public.crew_convites
  for delete to authenticated
  using ((select auth.uid()) = dono_id);


-- ---------------------------------------------------------------------
-- 4. PERMISSÕES POR PAPEL
-- anon = visitante sem login; authenticated = usuário logado.
-- A chave secreta (back-end) ignora tudo isso.
-- ---------------------------------------------------------------------

revoke all on public.perfis, public.conversas, public.mensagens, public.viagens,
              public.itens_viagem, public.participantes_viagem, public.crew_membros,
              public.crew_convites, public.uso_diario, public.erros
  from anon, authenticated;

grant select, insert, update, delete
  on public.conversas, public.mensagens, public.viagens, public.itens_viagem
  to authenticated;
grant select, insert, delete on public.participantes_viagem to authenticated;
grant select, delete on public.crew_convites to authenticated;

-- No perfil, o usuário só pode mudar estes campos.
-- admin e plano ficam de fora: só mudam pelo painel do Supabase ou pelo back-end.
grant select on public.perfis to authenticated;
grant update (nome, foto_url, tour_visto, termos_aceitos_em) on public.perfis to authenticated;

-- Funções internas não podem ser chamadas pelo site.
revoke execute on function public.registrar_buscas(uuid, integer) from public, anon, authenticated;
revoke execute on function public.buscas_disponiveis(uuid)       from public, anon, authenticated;
revoke execute on function public.criar_perfil()                 from public, anon, authenticated;
revoke execute on function public.limite_roteiros_mes()          from public, anon, authenticated;
revoke execute on function public.dono_do_crew(uuid)             from public, anon, authenticated;
revoke execute on function public.limpar_participacoes(uuid)     from public, anon, authenticated;
revoke execute on function public.manter_ultimas_conversas()     from public, anon, authenticated;
revoke execute on function public.tocar_conversa()               from public, anon, authenticated;

revoke execute on function public.plano_de(uuid)                 from public, anon, authenticated;

-- Funções que o site pode chamar (sempre agem sobre a conta de quem está logado).
revoke execute on function public.meu_uso(), public.meu_crew(), public.meus_convites_crew(),
  public.convidar_para_crew(text), public.aceitar_convite_crew(uuid), public.recusar_convite_crew(uuid),
  public.sair_do_crew(), public.remover_do_crew(uuid),
  public.pode_ver_viagem(uuid), public.e_dono_da_viagem(uuid), public.mesmo_crew_que_eu(uuid)
  from public, anon;
grant execute on function public.meu_uso(), public.meu_crew(), public.meus_convites_crew(),
  public.convidar_para_crew(text), public.aceitar_convite_crew(uuid), public.recusar_convite_crew(uuid),
  public.sair_do_crew(), public.remover_do_crew(uuid),
  public.pode_ver_viagem(uuid), public.e_dono_da_viagem(uuid), public.mesmo_crew_que_eu(uuid)
  to authenticated;


-- ---------------------------------------------------------------------
-- 5. FOTO DE PERFIL (Storage, bucket "avatares")
-- Cada foto fica em avatares/<id do usuário>/<arquivo>. Máximo 2 MB.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatares: ver a propria pasta" on storage.objects;
create policy "avatares: ver a propria pasta" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatares: enviar na propria pasta" on storage.objects;
create policy "avatares: enviar na propria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatares: trocar na propria pasta" on storage.objects;
create policy "avatares: trocar na propria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatares: apagar na propria pasta" on storage.objects;
create policy "avatares: apagar na propria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);


-- ---------------------------------------------------------------------
-- 6. DEPOIS DE RODAR
-- Para virar admin, crie sua conta pelo site e rode (trocando o e-mail):
--   update public.perfis set admin = true
--   where id = (select id from auth.users where email = 'seu-email@exemplo.com');
-- ---------------------------------------------------------------------
