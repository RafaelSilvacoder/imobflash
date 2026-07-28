-- ============================================================
-- ImobQuick — Schema SQL completo para Supabase
-- Rode este script inteiro no SQL Editor do seu projeto Supabase
-- Inclui: properties, profiles, assinatura, indicação paga,
-- RLS e bucket de fotos no Storage.
--
-- IMPORTANTE: todas as funções SECURITY DEFINER abaixo têm
-- `set search_path = public` explícito. Sem isso, funções chamadas
-- pelo serviço interno de Auth do Supabase (como a trigger de
-- cadastro) podem falhar com "function does not exist" e derrubar
-- o cadastro com erro 500 — search_path do processo de Auth não
-- inclui `public` por padrão.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto"; -- necessário para gen_random_uuid()

-- ============================================================
-- 1. TABELA PROFILES (assinatura, admin, indicação)
-- ============================================================
create table if not exists public.profiles (
  id                     uuid references auth.users on delete cascade primary key,
  email                  text not null,
  subscription_status    text default 'active',   -- 'active' | 'inactive' | 'canceled'
  role                   text default 'user',      -- 'user' | 'admin'
  referral_code          text unique,
  referred_by            text,                     -- código de quem indicou este usuário
  subscription_ends_at   timestamptz default (now() + interval '7 days'), -- trial de 7 dias
  paid_referrals_count   integer default 0,
  months_earned_count    integer default 0,
  broker_name            text,                     -- nome do corretor, exibido em todo anúncio
  broker_phone           text,                     -- telefone/WhatsApp do corretor
  creci                  text,                     -- número do CRECI do corretor
  created_at             timestamptz default timezone('utc'::text, now()) not null
);

-- Garante as colunas mesmo se a tabela já existia de uma versão anterior deste schema
alter table public.profiles add column if not exists broker_name text;
alter table public.profiles add column if not exists broker_phone text;
alter table public.profiles add column if not exists creci text;

-- ------------------------------------------------------------
-- Gerador de código de indicação único de 6 caracteres
-- ------------------------------------------------------------
create or replace function generate_referral_code()
returns text as $$
declare
  chars text[] := '{A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,S,T,U,V,W,X,Y,Z,2,3,4,5,6,7,8,9}';
  result text := '';
  i integer := 0;
begin
  for i in 1..6 loop
    result := result || chars[1 + floor(random() * array_length(chars, 1))::int];
  end loop;
  return result;
end;
$$ language plpgsql set search_path = public;

-- ------------------------------------------------------------
-- Trigger: cria o perfil automaticamente no cadastro do usuário.
-- Lê o código de quem indicou a partir do metadata enviado no
-- signUp (options.data.referred_by) — ver src/services/authService.js.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_code text;
  ref_code text;
begin
  new_code := public.generate_referral_code();
  ref_code := nullif(new.raw_user_meta_data->>'referred_by', '');

  insert into public.profiles (
    id, email, subscription_status, role, referral_code, referred_by, subscription_ends_at
  )
  values (
    new.id,
    new.email,
    'active',
    'user',
    new_code,
    ref_code,
    now() + interval '7 days'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. RECOMPENSA DE INDICAÇÃO PAGA (a cada 2 pagos = +30 dias)
-- ============================================================
-- Esta função deve ser chamada pelo seu BACKEND/WEBHOOK de pagamento
-- (Asaas / Mercado Pago) quando a cobrança de um indicado é confirmada,
-- passando o `referral_code` de quem o indicou. Não é chamada pelo
-- frontend, pois depende da confirmação real do pagamento.
create or replace function process_paid_referral(referrer_code text)
returns void as $$
declare
  current_paid integer;
begin
  if referrer_code is not null and referrer_code != '' then
    update public.profiles
    set paid_referrals_count = paid_referrals_count + 1
    where referral_code = referrer_code
    returning paid_referrals_count into current_paid;

    -- A cada 2 indicados que pagam (2, 4, 6, 8...), soma +30 dias na assinatura
    if current_paid % 2 = 0 then
      update public.profiles
      set
        subscription_ends_at = case
          when subscription_ends_at < now() then now() + interval '30 days'
          else subscription_ends_at + interval '30 days'
        end,
        subscription_status = 'active',
        months_earned_count = months_earned_count + 1
      where referral_code = referrer_code;
    end if;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------------------
-- Função de uso do painel Admin: concede N dias grátis a um perfil.
-- Usada pelo botão "🎁 Conceder 7 Dias Grátis".
-- ------------------------------------------------------------
create or replace function grant_free_days(target_user_id uuid, days_to_add integer)
returns void as $$
begin
  update public.profiles
  set
    subscription_status = 'active',
    subscription_ends_at = case
      when subscription_ends_at < now() then now() + (days_to_add || ' days')::interval
      else subscription_ends_at + (days_to_add || ' days')::interval
    end
  where id = target_user_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- 3. TABELA PROPERTIES
-- ============================================================
create table if not exists public.properties (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  title        text not null,
  type         text not null check (type in ('Casa', 'Apartamento', 'Terreno', 'Comercial')),
  purpose      text not null check (purpose in ('Venda', 'Aluguel')),
  price        numeric not null default 0,
  location     text not null,
  bedrooms     integer default 0,
  bathrooms    integer default 0,
  vacancies    integer default 0,
  area         numeric default 0,
  details      text,
  ai_texts     jsonb default '{}'::jsonb,
  photo_urls   text[] default '{}'::text[],
  created_at   timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_properties_user_id on public.properties(user_id);
create index if not exists idx_properties_created_at on public.properties(created_at desc);

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.properties enable row level security;

-- ---------------- Profiles ----------------
create policy "Usuário pode ver próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuário pode atualizar próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Função auxiliar para checar se o usuário logado é admin, sem causar
-- recursão nas políticas de RLS da própria tabela profiles (uma política
-- de profiles não pode fazer "select ... from profiles" diretamente sem
-- disparar o erro "infinite recursion detected in policy").
create or replace function public.is_admin()
returns boolean as $$
  select role = 'admin' from public.profiles where id = auth.uid();
$$ language sql security definer set search_path = public stable;

create policy "Admins podem ver todos os perfis"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins podem atualizar todos os perfis"
  on public.profiles for update
  using (public.is_admin());

-- ---------------- Properties ----------------
create policy "Usuários podem ver seus imóveis"
  on public.properties for select
  using (auth.uid() = user_id);

create policy "Usuários podem criar seus imóveis"
  on public.properties for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar seus imóveis"
  on public.properties for update
  using (auth.uid() = user_id);

create policy "Usuários podem deletar seus imóveis"
  on public.properties for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 5. STORAGE: bucket de fotos dos imóveis
-- ============================================================
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

create policy "Usuários autenticados podem subir fotos"
  on storage.objects for insert
  with check (
    bucket_id = 'property-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Fotos são públicas para leitura"
  on storage.objects for select
  using (bucket_id = 'property-photos');

create policy "Usuários podem excluir suas próprias fotos"
  on storage.objects for delete
  using (
    bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 6. CONTROLE DE DISPOSITIVOS (limite de 2 por conta)
-- ============================================================
-- Evita que uma única assinatura seja compartilhada entre vários
-- corretores. Os 2 primeiros dispositivos que logarem em uma conta
-- são aprovados automaticamente; a partir do 3º, o dispositivo fica
-- "blocked" até um admin aprová-lo (o que revoga automaticamente o
-- dispositivo aprovado mais antigo, mantendo o limite de 2).

create table if not exists public.known_devices (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  device_id      text not null,          -- UUID gerado no navegador/app e salvo em localStorage
  device_label   text,                    -- ex: "Chrome · Android" (informativo, não é trava de segurança)
  status         text not null default 'approved', -- 'approved' | 'blocked' | 'rejected'
  created_at     timestamptz default timezone('utc'::text, now()) not null,
  last_seen_at   timestamptz default timezone('utc'::text, now()) not null,
  unique (user_id, device_id)
);

create index if not exists idx_known_devices_user_id on public.known_devices(user_id);

alter table public.known_devices enable row level security;

-- Usuário só vê/gerencia os próprios dispositivos (leitura, para exibir na tela de bloqueio)
create policy "Usuário pode ver seus próprios dispositivos"
  on public.known_devices for select
  using (auth.uid() = user_id);

-- Admins podem ver e atualizar todos os dispositivos (aprovar/rejeitar)
create policy "Admins podem ver todos os dispositivos"
  on public.known_devices for select
  using (public.is_admin());

create policy "Admins podem atualizar todos os dispositivos"
  on public.known_devices for update
  using (public.is_admin());

-- ------------------------------------------------------------
-- Função chamada pelo frontend a cada login/carregamento do app.
-- Registra o dispositivo atual e devolve o status ('approved' | 'blocked' | 'rejected').
-- SECURITY DEFINER: roda com privilégios elevados, mas só enxerga/altera
-- dados do próprio usuário logado (auth.uid()), então é seguro chamar
-- direto do cliente via supabase.rpc(...).
-- ------------------------------------------------------------
create or replace function register_or_check_device(p_device_id text, p_device_label text)
returns text as $$
declare
  existing_status text;
  approved_count integer;
  result_status text;
begin
  select status into existing_status
  from public.known_devices
  where user_id = auth.uid() and device_id = p_device_id;

  if existing_status is not null then
    -- Dispositivo já conhecido: apenas atualiza o "visto por último" e devolve o status atual
    update public.known_devices
    set last_seen_at = now(), device_label = coalesce(p_device_label, device_label)
    where user_id = auth.uid() and device_id = p_device_id;

    return existing_status;
  end if;

  -- Dispositivo novo: conta quantos já estão aprovados para este usuário
  select count(*) into approved_count
  from public.known_devices
  where user_id = auth.uid() and status = 'approved';

  if approved_count < 2 then
    result_status := 'approved';
  else
    result_status := 'blocked';
  end if;

  insert into public.known_devices (user_id, device_id, device_label, status)
  values (auth.uid(), p_device_id, p_device_label, result_status);

  return result_status;
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------------------
-- Funções usadas pelo Painel Admin para aprovar/rejeitar dispositivos.
-- ------------------------------------------------------------
create or replace function admin_approve_device(target_device_row_id uuid)
returns void as $$
declare
  target_user_id uuid;
  approved_count integer;
  oldest_device_id uuid;
begin
  if (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'Apenas administradores podem aprovar dispositivos';
  end if;

  select user_id into target_user_id from public.known_devices where id = target_device_row_id;

  update public.known_devices
  set status = 'approved', last_seen_at = now()
  where id = target_device_row_id;

  -- Mantém o limite de 2 aprovados: revoga o mais antigo (por last_seen_at) se necessário
  select count(*) into approved_count
  from public.known_devices
  where user_id = target_user_id and status = 'approved';

  if approved_count > 2 then
    select id into oldest_device_id
    from public.known_devices
    where user_id = target_user_id and status = 'approved' and id <> target_device_row_id
    order by last_seen_at asc
    limit 1;

    update public.known_devices set status = 'revoked' where id = oldest_device_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function admin_reject_device(target_device_row_id uuid)
returns void as $$
begin
  if (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'Apenas administradores podem rejeitar dispositivos';
  end if;

  update public.known_devices set status = 'rejected' where id = target_device_row_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- 7. INTEGRAÇÃO COM ASAAS (pagamento da assinatura)
-- ============================================================
-- Vincula o pagamento confirmado no Asaas ao perfil correto no
-- Supabase, e evita que o bônus de indicação seja concedido mais
-- de uma vez para o mesmo indicado (só na primeira cobrança paga).

alter table public.profiles add column if not exists asaas_customer_id text unique;
alter table public.profiles add column if not exists referral_bonus_processed boolean default false;

create index if not exists idx_profiles_asaas_customer_id on public.profiles(asaas_customer_id);

-- ============================================================
-- 8. FINANCIAMENTO / SUBSÍDIO (campos opcionais do imóvel)
-- ============================================================
-- Usado por corretores que trabalham com imóveis do Minha Casa
-- Minha Vida / financiamento facilitado. Tudo opcional — se não
-- preenchido, simplesmente não aparece nos textos gerados.

alter table public.properties add column if not exists accepts_subsidy boolean default false;
alter table public.properties add column if not exists min_income numeric;
alter table public.properties add column if not exists subsidy_value numeric;
alter table public.properties add column if not exists down_payment_info text;

-- ============================================================
-- 9. (Opcional) Criar seu primeiro usuário admin
-- ============================================================
-- Depois de cadastrar sua conta normalmente pelo app, rode:
-- update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
