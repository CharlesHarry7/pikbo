-- Keep pgcrypto in Supabase's conventional extensions schema so
-- SECURITY DEFINER functions can call extensions.digest with a restricted
-- search_path in both new and historical environments.

create schema if not exists extensions;

do $$
declare
  v_schema text;
begin
  select n.nspname
    into v_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pgcrypto';

  if v_schema is null then
    create extension pgcrypto with schema extensions;
  elsif v_schema <> 'extensions' then
    alter extension pgcrypto set schema extensions;
  end if;

  select n.nspname
    into v_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pgcrypto';

  if v_schema is distinct from 'extensions'
     or to_regprocedure('extensions.digest(text,text)') is null
     or to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'PGCRYPTO_EXTENSIONS_SCHEMA_REQUIRED';
  end if;
end
$$;
