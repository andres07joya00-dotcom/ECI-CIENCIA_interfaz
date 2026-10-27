-- Copa Ingenium: tabla inicial de persistencia compartida.
-- Ejecuta este archivo en Supabase > SQL Editor.

create table if not exists public.app_state (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Solo usuarios autenticados pueden leer y modificar los datos del concurso.
-- Esta política asume que todos los usuarios que crees en Supabase Auth son
-- moderadores autorizados para trabajar en el mismo evento.
drop policy if exists "Moderadores autenticados pueden leer estado" on public.app_state;
create policy "Moderadores autenticados pueden leer estado"
  on public.app_state for select to authenticated using (true);

drop policy if exists "Moderadores autenticados pueden insertar estado" on public.app_state;
create policy "Moderadores autenticados pueden insertar estado"
  on public.app_state for insert to authenticated with check (true);

drop policy if exists "Moderadores autenticados pueden actualizar estado" on public.app_state;
create policy "Moderadores autenticados pueden actualizar estado"
  on public.app_state for update to authenticated using (true) with check (true);

drop policy if exists "Moderadores autenticados pueden eliminar estado" on public.app_state;
create policy "Moderadores autenticados pueden eliminar estado"
  on public.app_state for delete to authenticated using (true);

grant select, insert, update, delete on public.app_state to authenticated;

-- Habilita eventos Realtime para sincronizar otros navegadores.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end $$;
