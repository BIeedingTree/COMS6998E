-- Run in Supabase SQL Editor before week4.sql. Read-only; no row contents or secrets.
-- Review every application schema. auth/storage are managed by Supabase.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p') and n.nspname not in ('pg_catalog', 'information_schema')
  and n.nspname not like 'pg_toast%'
order by 1, 2;

select table_schema, table_name, column_name, data_type, udt_name,
       is_nullable, column_default, is_identity
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies order by schemaname, tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, grantee;

-- Verify the existing signup trigger creates profiles; week4.sql does not replace it.
select n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid) as definition,
       p.proname as function_name, p.prosecdef as security_definer
from pg_trigger t join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal and n.nspname in ('auth', 'public');

select id, public from storage.buckets;

-- Views/security-definer RPCs can expose data separately from direct table RLS.
select schemaname, viewname, definition from pg_views where schemaname = 'public';
select p.proname, p.prosecdef, p.proacl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef;
