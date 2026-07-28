-- ============================================================
-- PATCH: corrige "infinite recursion detected in policy for
-- relation profiles" — causa da tela em branco em "Indique e
-- Ganhe" e "Perfil".
--
-- Causa: as políticas de admin faziam
--   (select role from public.profiles where id = auth.uid()) = 'admin'
-- Isso consulta a própria tabela `profiles` DE DENTRO de uma
-- política da tabela `profiles`, e o Postgres detecta recursão e
-- aborta a consulta com erro — derrubando até a busca do PRÓPRIO
-- perfil do usuário comum, não só do admin.
--
-- Solução: mover essa checagem para uma função SECURITY DEFINER
-- (`is_admin()`), que roda com privilégio elevado e não passa
-- pela RLS de novo, evitando o loop.
--
-- Rode este bloco inteiro no SQL Editor do Supabase.
-- ============================================================

create or replace function public.is_admin()
returns boolean as $$
  select role = 'admin' from public.profiles where id = auth.uid();
$$ language sql security definer set search_path = public stable;

-- Recria as políticas de profiles usando a função (sem recursão)
drop policy if exists "Admins podem ver todos os perfis" on public.profiles;
create policy "Admins podem ver todos os perfis"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "Admins podem atualizar todos os perfis" on public.profiles;
create policy "Admins podem atualizar todos os perfis"
  on public.profiles for update
  using (public.is_admin());

-- Mesma correção nas políticas de known_devices (também consultavam
-- profiles diretamente e caíam no mesmo problema)
drop policy if exists "Admins podem ver todos os dispositivos" on public.known_devices;
create policy "Admins podem ver todos os dispositivos"
  on public.known_devices for select
  using (public.is_admin());

drop policy if exists "Admins podem atualizar todos os dispositivos" on public.known_devices;
create policy "Admins podem atualizar todos os dispositivos"
  on public.known_devices for update
  using (public.is_admin());
