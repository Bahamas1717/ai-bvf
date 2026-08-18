-- Run bvf_attention with the querying role's permissions and RLS context.
-- ALTER VIEW preserves the existing owner and grants; recreating the view can
-- reset either and is unnecessary for this security change.

begin;

do $$
begin
  if to_regclass('public.bvf_attention') is null then
    raise exception 'public.bvf_attention does not exist';
  end if;
end
$$;

alter view public.bvf_attention set (security_invoker = true);

comment on view public.bvf_attention is
  'Prioritised AI BVF work queue. Runs with the querying role permissions and RLS policies.';

commit;

-- Verification after deployment:
-- select reloptions
-- from pg_class
-- where oid = 'public.bvf_attention'::regclass;
--
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'bvf_attention'
-- order by grantee, privilege_type;
