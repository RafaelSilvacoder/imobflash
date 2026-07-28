-- ============================================================
-- PATCH: corrige o erro 500 no cadastro (auth.signup)
-- Causa: funções SECURITY DEFINER disparadas pelo serviço de Auth
-- rodam com search_path restrito, então chamadas sem o prefixo do
-- schema (ex: generate_referral_code() em vez de public.generate_referral_code())
-- podem falhar com "function does not exist".
-- Rode este bloco inteiro no SQL Editor do Supabase.
-- ============================================================

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
