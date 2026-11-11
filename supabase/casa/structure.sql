CREATE SCHEMA engefex_private;
REVOKE ALL ON SCHEMA engefex_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA engefex_private TO authenticated, service_role;
SET check_function_bodies = false;
CREATE TABLE "public"."engefex_usuarios" (id uuid NOT NULL, nome text NOT NULL DEFAULT ''::text, email text NOT NULL DEFAULT ''::text, perfil text NOT NULL DEFAULT 'funcionario'::text, ativo boolean NOT NULL DEFAULT false, criado_em timestamp with time zone NOT NULL DEFAULT now(), atualizado_em timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."engefex_members" (workspace_id uuid NOT NULL, user_id uuid NOT NULL);
CREATE TABLE "public"."engefex_workspaces" (id uuid NOT NULL DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."engefex_state" (workspace_id uuid NOT NULL, revision bigint NOT NULL DEFAULT 0, payload jsonb, updated_at timestamp with time zone NOT NULL DEFAULT now(), updated_by uuid);
CREATE TABLE "public"."engefex_access" (workspace_id uuid NOT NULL, user_id uuid NOT NULL, is_admin boolean NOT NULL DEFAULT false, permissions jsonb NOT NULL DEFAULT '{"views": {}, "modules": {}}'::jsonb, revision bigint NOT NULL DEFAULT 1, updated_at timestamp with time zone NOT NULL DEFAULT now(), updated_by uuid);
CREATE TABLE "engefex_private"."access_audit" (id uuid NOT NULL DEFAULT gen_random_uuid(), workspace_id uuid, user_id uuid, actor uuid, at timestamp with time zone DEFAULT now(), before_data jsonb, after_data jsonb);
CREATE TABLE "public"."engefex_nextar_inventory" (workspace_id uuid NOT NULL, snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamp with time zone NOT NULL DEFAULT now(), updated_by uuid NOT NULL);
CREATE TABLE "engefex_private"."hr_vacation_import_backups" (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, workspace_id uuid NOT NULL, saved_at timestamp with time zone DEFAULT now(), prior_revision bigint NOT NULL, previous_vacations jsonb NOT NULL);
CREATE TABLE "engefex_private"."release_safety_snapshots" (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, captured_at timestamp with time zone NOT NULL DEFAULT now(), workspace_id uuid NOT NULL, state_revision bigint NOT NULL, state_payload jsonb NOT NULL, nextar_snapshot jsonb, attachment_manifest jsonb NOT NULL DEFAULT '[]'::jsonb, label text NOT NULL);
CREATE TABLE "engefex_private"."user_creation_audit" (request_id uuid NOT NULL, workspace_id uuid NOT NULL, actor_id uuid NOT NULL, user_id uuid, created_at timestamp with time zone NOT NULL DEFAULT now(), completed_at timestamp with time zone, action text NOT NULL DEFAULT 'create'::text);
CREATE TABLE "engefex_private"."rh_reset_backups" (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, workspace_id uuid NOT NULL, backed_up_at timestamp with time zone NOT NULL DEFAULT now(), previous_revision bigint NOT NULL, employees jsonb NOT NULL, documents jsonb NOT NULL);
CREATE TABLE "public"."engefex_notification_reads" (workspace_id uuid NOT NULL, user_id uuid NOT NULL, notification_id text NOT NULL, read_at timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "engefex_private"."state_recovery_snapshots" (snapshot_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, workspace_id uuid NOT NULL, revision bigint NOT NULL, saved_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(), payload jsonb NOT NULL);
CREATE TABLE "engefex_private"."restore_transfer_chunks" (part integer NOT NULL, content text NOT NULL);
CREATE TABLE "public"."engefex_stock_updates" (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, workspace_id uuid NOT NULL, stock_kind text NOT NULL, actor_id uuid, actor_name text NOT NULL DEFAULT 'Usuário da equipe'::text, created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp());
ALTER TABLE public.engefex_usuarios ADD CONSTRAINT engefex_usuarios_perfil_check CHECK ((perfil = ANY (ARRAY['administrador'::text, 'gerente'::text, 'funcionario'::text])));
ALTER TABLE public.engefex_usuarios ADD CONSTRAINT engefex_usuarios_pkey PRIMARY KEY (id);
ALTER TABLE public.engefex_members ADD CONSTRAINT engefex_members_pkey PRIMARY KEY (workspace_id, user_id);
ALTER TABLE public.engefex_workspaces ADD CONSTRAINT engefex_workspaces_pkey PRIMARY KEY (id);
ALTER TABLE public.engefex_state ADD CONSTRAINT engefex_payload_object CHECK (((payload IS NULL) OR (jsonb_typeof(payload) = 'object'::text)));
ALTER TABLE public.engefex_state ADD CONSTRAINT engefex_state_pkey PRIMARY KEY (workspace_id);
ALTER TABLE public.engefex_state ADD CONSTRAINT engefex_state_revision_check CHECK ((revision >= 0));
ALTER TABLE public.engefex_access ADD CONSTRAINT engefex_access_permissions_check CHECK ((jsonb_typeof(permissions) = 'object'::text));
ALTER TABLE public.engefex_access ADD CONSTRAINT engefex_access_pkey PRIMARY KEY (workspace_id, user_id);
ALTER TABLE engefex_private.access_audit ADD CONSTRAINT access_audit_pkey PRIMARY KEY (id);
ALTER TABLE public.engefex_nextar_inventory ADD CONSTRAINT engefex_nextar_inventory_pkey PRIMARY KEY (workspace_id);
ALTER TABLE engefex_private.hr_vacation_import_backups ADD CONSTRAINT hr_vacation_import_backups_pkey PRIMARY KEY (id);
ALTER TABLE engefex_private.release_safety_snapshots ADD CONSTRAINT release_safety_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE engefex_private.user_creation_audit ADD CONSTRAINT user_creation_audit_action_check CHECK ((action = ANY (ARRAY['create'::text, 'reset_password'::text])));
ALTER TABLE engefex_private.user_creation_audit ADD CONSTRAINT user_creation_audit_pkey PRIMARY KEY (request_id);
ALTER TABLE engefex_private.rh_reset_backups ADD CONSTRAINT rh_reset_backups_pkey PRIMARY KEY (id);
ALTER TABLE public.engefex_notification_reads ADD CONSTRAINT engefex_notification_reads_notification_id_check CHECK (((char_length(notification_id) >= 1) AND (char_length(notification_id) <= 300)));
ALTER TABLE public.engefex_notification_reads ADD CONSTRAINT engefex_notification_reads_pkey PRIMARY KEY (workspace_id, user_id, notification_id);
ALTER TABLE engefex_private.state_recovery_snapshots ADD CONSTRAINT state_recovery_snapshots_pkey PRIMARY KEY (snapshot_id);
ALTER TABLE engefex_private.state_recovery_snapshots ADD CONSTRAINT state_recovery_snapshots_workspace_id_revision_key UNIQUE (workspace_id, revision);
ALTER TABLE engefex_private.restore_transfer_chunks ADD CONSTRAINT restore_transfer_chunks_pkey PRIMARY KEY (part);
ALTER TABLE public.engefex_stock_updates ADD CONSTRAINT engefex_stock_updates_pkey PRIMARY KEY (id);
ALTER TABLE public.engefex_stock_updates ADD CONSTRAINT engefex_stock_updates_stock_kind_check CHECK ((stock_kind = ANY (ARRAY['nextarstock'::text, 'paintstock'::text, 'civilstock'::text])));
ALTER TABLE public.engefex_usuarios ADD CONSTRAINT engefex_usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.engefex_members ADD CONSTRAINT engefex_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.engefex_members ADD CONSTRAINT engefex_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES engefex_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.engefex_state ADD CONSTRAINT engefex_state_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.engefex_state ADD CONSTRAINT engefex_state_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES engefex_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.engefex_access ADD CONSTRAINT engefex_access_workspace_id_user_id_fkey FOREIGN KEY (workspace_id, user_id) REFERENCES engefex_members(workspace_id, user_id) ON DELETE CASCADE;
ALTER TABLE public.engefex_nextar_inventory ADD CONSTRAINT engefex_nextar_inventory_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.engefex_nextar_inventory ADD CONSTRAINT engefex_nextar_inventory_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES engefex_workspaces(id) ON DELETE CASCADE;
ALTER TABLE engefex_private.user_creation_audit ADD CONSTRAINT user_creation_audit_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES engefex_workspaces(id);
ALTER TABLE public.engefex_stock_updates ADD CONSTRAINT engefex_stock_updates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES engefex_workspaces(id) ON DELETE CASCADE;
CREATE INDEX engefex_members_user_idx ON public.engefex_members USING btree (user_id);
CREATE INDEX user_creation_actor_time ON engefex_private.user_creation_audit USING btree (actor_id, created_at DESC);
CREATE INDEX engefex_stock_updates_recent ON public.engefex_stock_updates USING btree (workspace_id, created_at DESC, id DESC);
CREATE OR REPLACE FUNCTION engefex_private.full_read(w uuid, u uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select coalesce(bool_and(coalesce(engefex_private.level(w,u,v),0)>=1),false) from jsonb_object_keys('{"dashboard": "core", "projects": "core", "sharedcalendar": "core", "agenda": "works", "activities": "works", "timeline": "works", "budget": "works", "supplies": "works", "measurements": "works", "checklist": "works", "issues": "works", "responsibles": "works", "diary": "works", "documents": "works", "teams": "works", "payables": "finance", "receivables": "finance", "fixedexpenses": "finance", "fabrication": "factory", "factory-overview": "factory", "factory-data": "factory", "factory-quantities": "factory", "factory-preparation": "factory", "factory-progress": "factory", "factory-quality": "factory", "nextarstock": "nextar", "hr": "hr"}'::jsonb) v $function$
;
REVOKE ALL ON FUNCTION engefex_private.full_read(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION engefex_private.full_read(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION engefex_private.cost_read(w uuid, u uuid, c jsonb)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select engefex_private.any_level(w,u,array['payables','budget'],1) or (coalesce(c->>'purchase',c->>'laborContract','')<>'' and engefex_private.any_level(w,u,array['supplies'],1)) or (coalesce(c->>'fixedExpense','')<>'' and engefex_private.any_level(w,u,array['fixedexpenses'],1)) $function$
;
REVOKE ALL ON FUNCTION engefex_private.cost_read(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.engefex_criar_perfil()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    INSERT INTO public.engefex_usuarios (
        id,
        nome,
        email,
        perfil,
        ativo
    )
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data ->> 'nome',
            ''
        ),
        COALESCE(NEW.email, ''),
        'funcionario',
        false
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$function$
;
REVOKE ALL ON FUNCTION public.engefex_criar_perfil() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_criar_perfil() TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_save_state(p_workspace uuid, p_revision bigint, p_payload jsonb)
 RETURNS TABLE(revision bigint, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare oldrow public.engefex_state%rowtype;merged jsonb;visible jsonb;event jsonb;orders jsonb:='[]';o jsonb;prior jsonb;c jsonb;notifs jsonb:='[]';candidate jsonb;email text;file_id text;
begin
 if auth.uid() is null or not exists(select 1 from public.engefex_members where workspace_id=p_workspace and user_id=auth.uid()) then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_payload) is distinct from 'object' or p_payload->>'version' is distinct from '1' or p_payload->>'dataModel' is distinct from '2' or jsonb_typeof(p_payload->'projects') is distinct from 'array' or octet_length(p_payload::text)>20000000 then raise exception 'Base de dados inválida' using errcode='22023';end if;
 select * into oldrow from public.engefex_state s where s.workspace_id=p_workspace for update;
 if not found or oldrow.revision<>p_revision then raise exception 'A base mudou. Recarregue antes de salvar.' using errcode='40001';end if;
 if engefex_private.is_admin(p_workspace,auth.uid()) then merged:=p_payload-'_accessFiltered';
 else
  visible:=engefex_private.project_state(p_workspace,auth.uid(),oldrow.payload);
  merged:=engefex_private.merge_delta(p_workspace,auth.uid(),oldrow.payload,visible,p_payload,array[]::text[],oldrow.payload,p_payload);
  -- Referenciar um ID de arquivo de outra área não concede acesso ao arquivo.
  for file_id in
   -- Referências operacionais no payload devem ter sido visíveis ao usuário.
   select f from engefex_private.file_ids(p_payload - 'history') f
     where not exists(select 1 from engefex_private.file_ids(visible - 'history') old_id where old_id=f)
   union
   -- O histórico antigo não pode ser reenviado como se fosse novo anexo.
   -- Arquivos em novas entradas de histórico continuam sendo verificados.
   select f from engefex_private.file_ids(p_payload->'history') f
     where not exists(select 1 from engefex_private.file_ids(oldrow.payload->'history') old_id where old_id=f)
       and not exists(select 1 from engefex_private.file_ids(visible - 'history') old_id where old_id=f)
 loop
   if exists(select 1 from engefex_private.file_ids(oldrow.payload) old_id where old_id=file_id) or not exists(select 1 from storage.objects obj where obj.bucket_id='engefex-files' and obj.name=p_workspace::text||'/'||file_id and coalesce(obj.owner_id,obj.owner::text)=auth.uid()::text) then raise exception 'Anexo não autorizado para este registro' using errcode='42501';end if;
  end loop;
  -- Invalidar a conferência final é uma consequência da mudança da produção.
  for o in select value from jsonb_array_elements(coalesce(merged->'factoryOrders','[]')) loop
   select x into prior from jsonb_array_elements(coalesce(oldrow.payload->'factoryOrders','[]')) x where x->>'id'=o->>'id';
   if prior is not null and prior->'workflow'->'events' is distinct from o->'workflow'->'events' then
    o:=jsonb_set(o,'{workflow,quality}',coalesce((select jsonb_agg(x||'{"status":"pending","owner":"","checkedAt":""}'::jsonb) from jsonb_array_elements(coalesce(o->'workflow'->'quality','[]')) x),'[]'));
   end if;orders:=orders||jsonb_build_array(o);
  end loop;
  if merged?'factoryOrders' then merged:=jsonb_set(merged,'{factoryOrders}',orders);end if;
  email:=lower((select u.email from auth.users u where u.id=auth.uid()));
  for c in select value from jsonb_array_elements(coalesce(oldrow.payload->'notifications','[]')) loop
   select x into candidate from jsonb_array_elements(coalesce(p_payload->'notifications','[]')) x where x->>'id'=c->>'id';
   if candidate is not null and lower(c->>'recipientEmail')=email and c-'readBy'=candidate-'readBy' and not exists(select 1 from jsonb_array_elements_text(coalesce(candidate->'readBy','[]')) x where x<>email and not coalesce(c->'readBy','[]')?x) then c:=jsonb_set(c,'{readBy}',coalesce(candidate->'readBy','[]'));end if;
   notifs:=notifs||jsonb_build_array(c);
  end loop;
  if engefex_private.any_level(p_workspace,auth.uid(),array['issues'],2) then
   for c in select value from jsonb_array_elements(coalesce(p_payload->'notifications','[]')) loop
    if not exists(select 1 from jsonb_array_elements(notifs) x where x->>'id'=c->>'id') and exists(select 1 from jsonb_array_elements(coalesce(merged->'issues','[]')) i where i->>'id'=c->>'issueId' and i->>'project'=c->>'project') then notifs:=jsonb_build_array(c)||notifs;end if;
   end loop;
  end if;
  if oldrow.payload?'notifications' then merged:=jsonb_set(merged,'{notifications}',notifs);end if;
  if not exists(select 1 from jsonb_object_keys('{"dashboard": "core", "projects": "core", "sharedcalendar": "core", "agenda": "works", "activities": "works", "timeline": "works", "budget": "works", "supplies": "works", "measurements": "works", "checklist": "works", "issues": "works", "responsibles": "works", "diary": "works", "documents": "works", "teams": "works", "board": "board", "payables": "finance", "receivables": "finance", "fixedexpenses": "finance", "fabrication": "factory", "factory-overview": "factory", "factory-data": "factory", "factory-quantities": "factory", "factory-preparation": "factory", "factory-progress": "factory", "factory-quality": "factory", "nextarstock": "nextar"}'::jsonb) v where engefex_private.level(p_workspace,auth.uid(),v)=2) and coalesce(oldrow.payload->'notifications','[]')=notifs then raise exception 'Usuário sem permissão de edição' using errcode='42501';end if;
  if not engefex_private.any_level(p_workspace,auth.uid(),array['payables','budget'],2) and engefex_private.financial_signature(oldrow.payload) is distinct from engefex_private.financial_signature(merged) then raise exception 'Rateio deve preservar os pagamentos. Para alterar baixas é necessária permissão de edição no financeiro.' using errcode='42501';end if;
  event:=jsonb_build_object('id',gen_random_uuid(),'time',clock_timestamp(),'kind','scopedChange','record','','action','Alteração com permissões verificadas','actor',auth.uid());
  merged:=jsonb_set(merged,'{history}',jsonb_build_array(event)||coalesce((select jsonb_agg(x||jsonb_build_object('actor',auth.uid())) from jsonb_array_elements(coalesce(p_payload->'history','[]')) x where engefex_private.any_level(p_workspace,auth.uid(),array['projects','sharedcalendar','agenda','activities','timeline','budget','supplies','measurements','checklist','issues','responsibles','diary','documents','teams','board','payables','receivables','fixedexpenses','factory-data','factory-quantities','factory-preparation','factory-progress','factory-quality'],2) and not exists(select 1 from jsonb_array_elements(coalesce(oldrow.payload->'history','[]')) h where h->>'id'=x->>'id')),'[]')||coalesce(oldrow.payload->'history','[]'));
 end if;
 if octet_length(merged::text)>20000000 then raise exception 'Base excede 20 MB' using errcode='22023';end if;
 return query update public.engefex_state s set payload=merged,revision=s.revision+1,updated_at=clock_timestamp(),updated_by=auth.uid() where s.workspace_id=p_workspace returning s.revision,s.updated_at;
end $function$
;
REVOKE ALL ON FUNCTION public.engefex_save_state(uuid,bigint,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_save_state(uuid,bigint,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_save_state(uuid,bigint,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_autorizar_usuario(p_email text, p_perfil text DEFAULT 'funcionario'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_user_id UUID;
    v_workspace_id UUID;
    v_total INTEGER;
BEGIN
    -- Conferir perfil solicitado
    IF p_perfil NOT IN (
        'administrador',
        'gerente',
        'funcionario'
    ) THEN
        RAISE EXCEPTION 'Perfil inválido';
    END IF;

    -- Localizar conta no Supabase Auth
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower(trim(p_email));

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
        'Usuário não encontrado no Auth';
    END IF;

    -- Exigir uma única área Engefex
    SELECT COUNT(*), MIN(id::text)::uuid
    INTO v_total, v_workspace_id
    FROM public.engefex_workspaces
    WHERE name = 'Casa Ramon e Talita';

    IF v_total <> 1 THEN
        RAISE EXCEPTION
        'Área Engefex ausente ou duplicada';
    END IF;

    -- Impedir contas vinculadas a múltiplas áreas
    SELECT COUNT(*)
    INTO v_total
    FROM public.engefex_members
    WHERE user_id = v_user_id
      AND workspace_id <> v_workspace_id;

    IF v_total > 0 THEN
        RAISE EXCEPTION
        'Usuário vinculado a outra área';
    END IF;

    -- Registrar vínculo, sem duplicar
    INSERT INTO public.engefex_members (
        workspace_id, user_id
    )
    SELECT v_workspace_id, v_user_id
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.engefex_members
        WHERE workspace_id = v_workspace_id
          AND user_id = v_user_id
    );

    -- Atualizar ou criar perfil autorizado
    INSERT INTO public.engefex_usuarios (
        id, nome, email, perfil, ativo
    )
    VALUES (
        v_user_id,
        '',
        lower(trim(p_email)),
        p_perfil,
        true
    )
    ON CONFLICT (id)
    DO UPDATE SET
        perfil = EXCLUDED.perfil,
        ativo = true,
        atualizado_em = now();
END;
$function$
;
REVOKE ALL ON FUNCTION public.engefex_autorizar_usuario(text,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_autorizar_usuario(text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_patch_state(p_workspace uuid, p_revision bigint, p_changes jsonb)
 RETURNS TABLE(revision bigint, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_payload jsonb;
 v_revision bigint;
 v_change jsonb;
 v_key text;
 v_array jsonb;
 v_prefix jsonb;
 v_suffix jsonb;
 v_start integer;
 v_delete integer;
 v_length integer;
begin
 if auth.uid() is null or not exists (
  select 1 from public.engefex_members m
  where m.workspace_id=p_workspace and m.user_id=auth.uid()
 ) then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 if p_revision is null or p_revision<0
 or jsonb_typeof(p_changes) is distinct from 'array' then
  raise exception 'Alterações inválidas' using errcode='22023';
 end if;
 if jsonb_array_length(p_changes)>1000 or octet_length(p_changes::text)>20000000 then
  raise exception 'Lote de alterações muito grande' using errcode='22023';
 end if;
 -- Trava a revisão antes de aplicar índices. Nenhuma alteração é feita se estiver antiga.
 select s.payload,s.revision into v_payload,v_revision
 from public.engefex_state s where s.workspace_id=p_workspace for update;
 if not found or v_revision<>p_revision then
  raise exception 'A base mudou. Recarregue antes de salvar.' using errcode='40001';
 end if;
 if v_payload is null then
  raise exception 'Base online não inicializada' using errcode='22023';
 end if;
 for v_change in select e.value from jsonb_array_elements(p_changes) e loop
  v_key:=v_change->>'key';
  if jsonb_typeof(v_change) is distinct from 'object' or v_key is null
  or v_key !~ '^[a-zA-Z][a-zA-Z0-9_]{0,63}$'
  or v_key in ('constructor','prototype','__proto__') then
   raise exception 'Campo de alteração inválido' using errcode='22023';
  end if;
  if v_change->'remove'='true'::jsonb then
   if v_change ? 'value' or v_change ? 'start' then
    raise exception 'Operação ambígua' using errcode='22023';
   end if;
   v_payload:=v_payload-v_key;
  elsif v_change ? 'value' then
   if v_change ? 'start' then raise exception 'Operação ambígua' using errcode='22023'; end if;
   v_payload:=jsonb_set(v_payload,array[v_key],v_change->'value',true);
  else
   if jsonb_typeof(v_change->'start') is distinct from 'number'
   or jsonb_typeof(v_change->'deleteCount') is distinct from 'number'
   or (v_change->>'start') !~ '^[0-9]{1,9}$'
   or (v_change->>'deleteCount') !~ '^[0-9]{1,9}$'
   or jsonb_typeof(v_change->'items') is distinct from 'array'
   or jsonb_typeof(v_payload->v_key) is distinct from 'array' then
    raise exception 'Operação de lista inválida' using errcode='22023';
   end if;
   v_start:=(v_change->>'start')::integer;
   v_delete:=(v_change->>'deleteCount')::integer;
   v_array:=v_payload->v_key;
   v_length:=jsonb_array_length(v_array);
   if v_start>v_length or v_delete>v_length-v_start then
    raise exception 'Índices de lista inválidos' using errcode='22023';
   end if;
   select coalesce(jsonb_agg(e.value order by e.n),'[]'::jsonb) into v_prefix
    from jsonb_array_elements(v_array) with ordinality e(value,n) where e.n<=v_start;
   select coalesce(jsonb_agg(e.value order by e.n),'[]'::jsonb) into v_suffix
    from jsonb_array_elements(v_array) with ordinality e(value,n) where e.n>v_start+v_delete;
   v_payload:=jsonb_set(v_payload,array[v_key],v_prefix||(v_change->'items')||v_suffix,false);
  end if;
 end loop;
 -- Reutiliza validação, limite de 20 MB, auditoria e compare-and-swap existentes.
 return query select saved.revision,saved.updated_at
 from public.engefex_save_state(p_workspace,p_revision,v_payload) saved;
end;
$function$
;
REVOKE ALL ON FUNCTION public.engefex_patch_state(uuid,bigint,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_patch_state(uuid,bigint,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_patch_state(uuid,bigint,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION engefex_private.file_ids(s jsonb)
 RETURNS SETOF text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select distinct value#>>'{}' from (select jsonb_path_query(s,'$.**.attachments[*].id') as value union all select jsonb_path_query(s,'$.**.photos[*].id')) refs where jsonb_typeof(value)='string' $function$
;
REVOKE ALL ON FUNCTION engefex_private.file_ids(jsonb) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION engefex_private.any_level(w uuid, u uuid, vs text[], minimum integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(bool_or(coalesce(engefex_private.level(w,u,v),0)>=minimum),false) from unnest(vs) v $function$
;
REVOKE ALL ON FUNCTION engefex_private.any_level(uuid,uuid,text[],integer) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION engefex_private.is_admin(w uuid, u uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select coalesce((select is_admin from public.engefex_access where workspace_id=w and user_id=u),false) and exists(select 1 from public.engefex_members where workspace_id=w and user_id=u) $function$
;
REVOKE ALL ON FUNCTION engefex_private.is_admin(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION engefex_private.module_for(v text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 SELECT CASE
   WHEN v IN ('hr','hr-employees','hr-documents','hr-vacations','hr-payroll') THEN 'hr'
   WHEN v='board' THEN 'board'
   ELSE '{"dashboard":"core","projects":"core","sharedcalendar":"core","agenda":"works","activities":"works","timeline":"works","budget":"works","supplies":"works","measurements":"works","checklist":"works","issues":"works","responsibles":"works","diary":"works","documents":"works","teams":"works","payables":"finance","receivables":"finance","fixedexpenses":"finance","fabrication":"factory","factory-overview":"factory","factory-data":"factory","factory-quantities":"factory","factory-preparation":"factory","factory-progress":"factory","factory-quality":"factory","nextarstock":"nextar","paintstock":"nextar","civilstock":"nextar"}'::jsonb->>v
 END
$function$
;
REVOKE ALL ON FUNCTION engefex_private.module_for(text) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION engefex_private.catalog()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select '[["core","Principal",[["dashboard","Visão geral"],["projects","Obras"],["sharedcalendar","Agenda compartilhada"]]],["works","Gerenciamento de obras",[["agenda","Agenda do engenheiro"],["activities","Etapas e atividades"],["timeline","Cronograma"],["budget","Orçamento"],["supplies","Compras e notas / fornecedores / mão de obra"],["measurements","Medições e recebimentos"],["checklist","Checklist de execução"],["issues","Pendências e riscos"],["responsibles","Responsáveis"],["diary","Diário de obra"],["documents","Documentos e histórico"],["teams","Equipes e produtividade"]]],["finance","Financeiro",[["payables","Contas a pagar"],["receivables","Contas a receber"],["fixedexpenses","Despesas gerais"]]],["factory","Fabricação",[["fabrication","Fábrica por obra"],["factory-overview","Painel da fábrica"],["factory-data","Caracterização da obra"],["factory-quantities","Peças e quantidades"],["factory-preparation","Preparação da fabricação"],["factory-progress","Produção"],["factory-quality","Checklist de fabricação"]]],["nextar","Consulta de estoque",[["nextarstock","Estoque Nextar"],["paintstock","Estoque de Tintas"],["civilstock","Estoque Civil"]]],["hr","Recursos Humanos",[["hr-employees","Funcionários"],["hr-documents","Validade Documentos"],["hr-vacations","Férias"],["hr-payroll","Folha de pagamento"]]],["board","Atividades",[["board","Lousa de atividades"]]]]'::jsonb $function$
;
REVOKE ALL ON FUNCTION engefex_private.catalog() FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION engefex_private.level(w uuid, u uuid, v text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select case when a.is_admin then 2 else least(case a.permissions->'modules'->>engefex_private.module_for(v) when 'edit' then 2 when 'view' then 1 else 0 end,
 case coalesce(a.permissions->'views'->>v,case when v in ('paintstock','civilstock') then 'none' else a.permissions->'modules'->>engefex_private.module_for(v) end) when 'edit' then 2 when 'view' then 1 else 0 end) end
 from public.engefex_access a join public.engefex_members m using(workspace_id,user_id) where a.workspace_id=w and a.user_id=u
$function$
;
REVOKE ALL ON FUNCTION engefex_private.level(uuid,uuid,text) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION engefex_private.financial_signature(s jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_agg(to_jsonb(t) order by key),'[]') from (select coalesce(x->>'purchase','')||'/'||coalesce(x->>'purchaseInstallment','')||'/'||coalesce(x->>'laborMeasurement','')||'/'||coalesce(x->>'fixedExpense','')||'/'||case when coalesce(x->>'purchase',x->>'laborContract',x->>'fixedExpense','')='' then x->>'id' else '' end as key,
 sum(coalesce((x->>'paid')::numeric,0)) paid,sum(coalesce((x->>'incurred')::numeric,0)) incurred,sum(coalesce((x->>'paymentDiscount')::numeric,0)) discount,sum(coalesce((x->>'paymentAddition')::numeric,0)) addition,max(x->>'paidDate') paid_date
 from jsonb_array_elements(coalesce(s->'costs','[]')) x where coalesce((x->>'paid')::numeric,0)<>0 or coalesce((x->>'incurred')::numeric,0)<>0 or coalesce((x->>'paymentDiscount')::numeric,0)<>0 or coalesce((x->>'paymentAddition')::numeric,0)<>0 group by 1) t $function$
;
REVOKE ALL ON FUNCTION engefex_private.financial_signature(jsonb) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION engefex_private.can_edit(w uuid, u uuid, p text[], oldstate jsonb, newstate jsonb, v jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c jsonb;ok boolean;part text;
begin
 if engefex_private.is_admin(w,u) then return true;end if;
 if p[1]='crewAllocations' then return engefex_private.any_level(w,u,array['teams'],2);end if; if p[1]='materialsBudgetLinked' and v='true'::jsonb then return engefex_private.any_level(w,u,array['budget','supplies','activities','timeline','diary','factory-progress'],2);end if;
 if p[1] in ('version','dataModel','_accessFiltered','history','notifications') then return false;end if;
 if p[1]='activities' and p[3] in ('executed','actualStart','actualFinish') and engefex_private.any_level(w,u,array['diary'],2) then return true;end if;
 if p[1]='factoryOrders' and p[3]='workflow' and p[4]='quality' and p[6] in ('status','owner','checkedAt') and v in ('"pending"'::jsonb,'""'::jsonb) and engefex_private.any_level(w,u,array['factory-progress'],2) then return true;end if;
 if p[1]='factoryOrders' and array_length(p,1)=2 and not exists(select 1 from jsonb_array_elements(coalesce(oldstate->'factoryOrders','[]')) x where x->>'id'=p[2]) then
  if not engefex_private.any_level(w,u,array['factory-data'],2) or jsonb_array_length(coalesce(v->'parts','[]'))<>0 or jsonb_array_length(coalesce(v->'workflow'->'events','[]'))<>0 or exists(select 1 from jsonb_array_elements(coalesce(v->'workflow'->'ready','[]')||coalesce(v->'workflow'->'quality','[]')) x where x->>'status'<>'pending') then return false;end if;return true;
 end if;
 if p[1]='costs' then
  for c in select x from jsonb_array_elements(coalesce(oldstate->'costs','[]')||coalesce(newstate->'costs','[]')) x where x->>'id'=p[2] loop
   ok:=engefex_private.any_level(w,u,array['payables','budget'],2) or (coalesce(c->>'purchase',c->>'laborContract','')<>'' and engefex_private.any_level(w,u,array['supplies'],2)) or (coalesce(c->>'fixedExpense','')<>'' and engefex_private.any_level(w,u,array['fixedexpenses'],2));
   if not ok then return false;end if;
  end loop;
  return c is not null;
 end if;
 return engefex_private.any_level(w,u,engefex_private.owners(p),2);
end $function$
;
REVOKE ALL ON FUNCTION engefex_private.can_edit(uuid,uuid,text[],jsonb,jsonb,jsonb) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.engefex_log_nextar_stock_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_actor text;
begin
  if tg_op = 'UPDATE' and old.snapshot is not distinct from new.snapshot then
    return new;
  end if;
  select nullif(btrim(u.nome),'') into v_actor
  from public.engefex_usuarios u where u.id = new.updated_by limit 1;
  insert into public.engefex_stock_updates(workspace_id,stock_kind,actor_id,actor_name,created_at)
  values(new.workspace_id,'nextarstock',new.updated_by,coalesce(v_actor,'Usuário da equipe'),new.updated_at);
  return new;
end;
$function$
;
REVOKE ALL ON FUNCTION public.engefex_log_nextar_stock_updates() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_log_nextar_stock_updates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_log_nextar_stock_updates() TO service_role;
CREATE OR REPLACE FUNCTION engefex_private.file_access(w text, file_id text, writing boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare workspace uuid;s jsonb;
begin
 begin workspace:=w::uuid;exception when invalid_text_representation then return false;end;
 if auth.uid() is null or not exists(select 1 from public.engefex_members where workspace_id=workspace and user_id=auth.uid()) then return false;end if;
 if writing then return exists(select 1 from jsonb_object_keys('{"dashboard": "core", "projects": "core", "sharedcalendar": "core", "agenda": "works", "activities": "works", "timeline": "works", "budget": "works", "supplies": "works", "measurements": "works", "checklist": "works", "issues": "works", "responsibles": "works", "diary": "works", "documents": "works", "teams": "works", "payables": "finance", "receivables": "finance", "fixedexpenses": "finance", "fabrication": "factory", "factory-overview": "factory", "factory-data": "factory", "factory-quantities": "factory", "factory-preparation": "factory", "factory-progress": "factory", "factory-quality": "factory", "nextarstock": "nextar"}'::jsonb) v where engefex_private.level(workspace,auth.uid(),v)=2);end if;
 if engefex_private.full_read(workspace,auth.uid()) then return true;end if;
 select engefex_private.project_state(workspace,auth.uid(),payload) into s from public.engefex_state where workspace_id=workspace;
 return jsonb_path_exists(s,'$.**.attachments[*] ? (@.id == $file)',jsonb_build_object('file',file_id)) or jsonb_path_exists(s,'$.**.photos[*] ? (@.id == $file)',jsonb_build_object('file',file_id));
end $function$
;
REVOKE ALL ON FUNCTION engefex_private.file_access(text,text,boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION engefex_private.file_access(text,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.engefex_access_context(p_workspace uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a public.engefex_access%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.engefex_members where workspace_id=p_workspace and user_id=auth.uid()) then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 select * into a from public.engefex_access where workspace_id=p_workspace and user_id=auth.uid();
 return jsonb_build_object('is_admin',coalesce(a.is_admin,false),'permissions',coalesce(a.permissions,'{"modules":{},"views":{}}'),'revision',coalesce(a.revision,0),'restricted',not engefex_private.full_read(p_workspace,auth.uid()));
end $function$
;
REVOKE ALL ON FUNCTION public.engefex_access_context(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_access_context(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_access_context(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_read_state(p_workspace uuid, p_head boolean DEFAULT false)
 RETURNS TABLE(revision bigint, updated_at timestamp with time zone, payload jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not exists(select 1 from public.engefex_members where workspace_id=p_workspace and user_id=auth.uid()) then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 return query select s.revision,s.updated_at,case when p_head then null else engefex_private.project_state(p_workspace,auth.uid(),s.payload) end from public.engefex_state s where s.workspace_id=p_workspace;
end $function$
;
REVOKE ALL ON FUNCTION public.engefex_read_state(uuid,boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_read_state(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_read_state(uuid,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_list_access(p_workspace uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not engefex_private.is_admin(p_workspace,auth.uid()) then raise exception 'Somente o administrador pode gerenciar acessos' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'email',u.email,'is_admin',coalesce(a.is_admin,false),'permissions',coalesce(a.permissions,'{"modules":{},"views":{}}'),'revision',coalesce(a.revision,0)) order by u.email),'[]') from public.engefex_members m join auth.users u on u.id=m.user_id left join public.engefex_access a using(workspace_id,user_id) where m.workspace_id=p_workspace);
end $function$
;
REVOKE ALL ON FUNCTION public.engefex_list_access(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_list_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_list_access(uuid) TO service_role;
CREATE OR REPLACE FUNCTION engefex_private.guard_and_snapshot_state()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'engefex_private'
AS $function$
begin
 if new.payload is null or jsonb_typeof(new.payload) <> 'object'
   or jsonb_typeof(new.payload->'projects') <> 'array'
   or jsonb_typeof(new.payload->'measurements') <> 'array'
   or jsonb_typeof(new.payload->'history') <> 'array'
   or jsonb_typeof(new.payload->'budgetItems') <> 'array'
 then raise exception 'Proteção Engefex: carga incompleta ou nula; gravação recusada';
 end if;
 if tg_op='UPDATE' and old.payload is not null and old.payload is distinct from new.payload then
   insert into engefex_private.state_recovery_snapshots(workspace_id,revision,payload)
   values(old.workspace_id,old.revision,old.payload) on conflict(workspace_id,revision) do nothing;
   delete from engefex_private.state_recovery_snapshots b
   where b.workspace_id=old.workspace_id
     and b.snapshot_id in (
       select x.snapshot_id from engefex_private.state_recovery_snapshots x
       where x.workspace_id=old.workspace_id order by x.revision desc offset 5
     );
 end if;
 return new;
end $function$
;
REVOKE ALL ON FUNCTION engefex_private.guard_and_snapshot_state() FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION engefex_private.provision_member_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.engefex_access(workspace_id,user_id,is_admin) select new.workspace_id,new.user_id,lower(email)='admin@engefex.com' and email_confirmed_at is not null from auth.users where id=new.user_id on conflict do nothing;return new;
end $function$
;
REVOKE ALL ON FUNCTION engefex_private.provision_member_access() FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.engefex_admin_password_guard(p_workspace uuid, p_actor uuid, p_session uuid, p_request uuid, p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform engefex_private.assert_user_admin(p_workspace,p_actor,p_session);
 if p_user=p_actor or not exists(select 1 from public.engefex_members m join public.engefex_access a using(workspace_id,user_id) where m.workspace_id=p_workspace and m.user_id=p_user and not a.is_admin) then raise exception 'Conta não autorizada para redefinição' using errcode='42501';end if;
 perform public.engefex_admin_user_guard(p_workspace,p_actor,p_session,p_request);
 update engefex_private.user_creation_audit set action='reset_password',user_id=p_user where request_id=p_request;
end $function$
;
REVOKE ALL ON FUNCTION public.engefex_admin_password_guard(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_admin_password_guard(uuid,uuid,uuid,uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_admin_password_complete(p_workspace uuid, p_actor uuid, p_session uuid, p_request uuid, p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform engefex_private.assert_user_admin(p_workspace,p_actor,p_session);
 perform 1 from engefex_private.user_creation_audit where request_id=p_request and workspace_id=p_workspace and actor_id=p_actor and user_id=p_user and action='reset_password' and completed_at is null and created_at>now()-interval '5 minutes' for update;
 if not found then raise exception 'Solicitação inválida' using errcode='42501';end if;
 if not exists(select 1 from public.engefex_access where workspace_id=p_workspace and user_id=p_user and not is_admin) then raise exception 'Conta protegida' using errcode='42501';end if;
 update engefex_private.user_creation_audit set completed_at=now() where request_id=p_request;
end $function$
;
REVOKE ALL ON FUNCTION public.engefex_admin_password_complete(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_admin_password_complete(uuid,uuid,uuid,uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION engefex_private.factory_read(w uuid, u uuid, o jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r jsonb;wf jsonb;pr jsonb;prepared boolean;v text;
begin
 r:=jsonb_build_object('id',o->'id','project',o->'project','number',o->'number','owner',o->'owner','updatedAt',o->'updatedAt','parts','[]'::jsonb,'fields','[]'::jsonb,'preparation','[]'::jsonb,'shipping','[]'::jsonb,'lots','[]'::jsonb,'loads','[]'::jsonb);
 if engefex_private.any_level(w,u,array['factory-overview','factory-quantities','factory-progress','factory-quality'],1) then r:=r||jsonb_build_object('parts',coalesce(o->'parts','[]'),'lots',coalesce(o->'lots','[]'));end if;
 r:=r||jsonb_build_object('revision',coalesce(o->>'revision',''),'start',coalesce(o->>'start',''),'due',coalesce(o->>'due',''),'note',case when engefex_private.any_level(w,u,array['factory-data'],1) then coalesce(o->>'note','') else '' end,'attachments',case when engefex_private.any_level(w,u,array['factory-data'],1) then coalesce(o->'attachments','[]') else '[]'::jsonb end,'warnings','[]'::jsonb,'sourceName','');
 wf:=coalesce(o->'workflow','{}');pr:=wf->'profile';
 if not engefex_private.any_level(w,u,array['factory-data'],1) then
  prepared:=coalesce((select bool_and(coalesce(pr->>k,'')<>'') from unnest(array['structureType','scope','drawing','steel']) k),false);
  pr:=jsonb_build_object('structureType',case when prepared then 'Conferido' else '' end,'scope',case when prepared then 'Conferido' else '' end,'drawing',case when prepared then 'Conferido' else '' end,'steel',case when prepared then 'Conferido' else '' end,'coating',coalesce(pr->>'coating','none'),'color','','width','','length','','height','','notes','','roofTileType','','roofTileColor','','wallTileType','','wallTileColor','');
 end if;
 r:=r||jsonb_build_object('workflow',jsonb_build_object('version',1,'profile',pr,'routes',coalesce(wf->'routes','{}'),'events',case when engefex_private.any_level(w,u,array['factory-progress'],1) then coalesce(wf->'events','[]') when engefex_private.any_level(w,u,array['factory-overview','factory-quantities','factory-quality'],1) then coalesce((select jsonb_agg(jsonb_build_object('id',e->'id','part',e->'part','stage',e->'stage','quantity',e->'quantity','date',e->'date','owner','Produção','note','')) from jsonb_array_elements(coalesce(wf->'events','[]')) e),'[]') else '[]'::jsonb end,'ready',case when engefex_private.any_level(w,u,array['factory-preparation'],1) then wf->'ready' else jsonb_build_array(jsonb_build_object('id','ACCESS-READY','name','Preparação da fabricação','group','Preparação','status',case when not exists(select 1 from jsonb_array_elements(coalesce(wf->'ready','[]')) c where c->>'status' not in ('ok','na')) then 'ok' else 'pending' end,'owner','','note','')) end,'quality',case when engefex_private.any_level(w,u,array['factory-quality'],1) then coalesce(wf->'quality','[]') else jsonb_build_array(jsonb_build_object('id','ACCESS-QUALITY','name','Conferência da fabricação','group','Conferência','status','pending','owner','','note','')) end,'qualityTemplateVersion',2,'closedAt',coalesce(wf->>'closedAt',''),'closedBy',coalesce(wf->>'closedBy',''),'reopenReason',coalesce(wf->>'reopenReason',''),'baselineResets',coalesce(wf->'baselineResets','{}'),'restartHistory',case when engefex_private.any_level(w,u,array['factory-progress'],1) then coalesce((select jsonb_agg(x-'snapshot'-'quality') from jsonb_array_elements(coalesce(wf->'restartHistory','[]')) x),'[]') else '[]'::jsonb end));
 return r;
end $function$
;
REVOKE ALL ON FUNCTION engefex_private.factory_read(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.engefex_birthdays_today()
 RETURNS TABLE(employee_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select distinct e->>'name' from public.engefex_state s
  join public.engefex_members m on m.workspace_id=s.workspace_id and m.user_id=(select auth.uid())
  cross join lateral jsonb_array_elements(coalesce(s.payload->'hrEmployees','[]'::jsonb)) e
  where coalesce(e->>'name','') <> ''
    and coalesce(e->>'birthDate','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    and right(e->>'birthDate',5) = to_char((now() at time zone 'America/Sao_Paulo')::date,'MM-DD')
    and coalesce(e->>'employmentStatus','ativo') <> 'inativo'
    and e->>'active' is distinct from 'false'
  order by 1;
$function$
;
REVOKE ALL ON FUNCTION public.engefex_birthdays_today() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_birthdays_today() TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_birthdays_today() TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_admin_register_user(p_workspace uuid, p_actor uuid, p_session uuid, p_request uuid, p_user uuid, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare attempt engefex_private.user_creation_audit%rowtype; target auth.users%rowtype;
begin
 perform engefex_private.assert_user_admin(p_workspace,p_actor,p_session);
 select * into attempt from engefex_private.user_creation_audit where request_id=p_request and workspace_id=p_workspace and actor_id=p_actor and completed_at is null and created_at>now()-interval '5 minutes' for update;
 if not found then raise exception 'Solicitação de cadastro inválida' using errcode='42501';end if;
 if p_name is null or length(trim(p_name)) not between 1 and 120 then raise exception 'Nome inválido';end if;
 select * into target from auth.users where id=p_user and email_confirmed_at is not null and created_at>=attempt.created_at-interval '5 seconds';
 if not found or exists(select 1 from public.engefex_members where user_id=p_user) then raise exception 'Somente uma nova conta pode ser vinculada';end if;
 if to_regclass('public.engefex_usuarios') is not null then
 insert into public.engefex_usuarios(id,nome,email,perfil,ativo) values(p_user,trim(p_name),target.email,'funcionario',true) on conflict(id) do update set nome=excluded.nome,email=excluded.email,ativo=true,atualizado_em=now();
 end if;
 insert into public.engefex_members(workspace_id,user_id) values(p_workspace,p_user);
 -- O gatilho existente cria a matriz sem acesso. Nunca promover uma conta a administrador.
 if not exists(select 1 from public.engefex_access where workspace_id=p_workspace and user_id=p_user and is_admin=false and permissions='{"modules":{},"views":{}}'::jsonb) then raise exception 'Permissão inicial inesperada';end if;
 update engefex_private.user_creation_audit set user_id=p_user,completed_at=now() where request_id=p_request;
 return jsonb_build_object('id',p_user,'email',target.email);
end $function$
;
REVOKE ALL ON FUNCTION public.engefex_admin_register_user(uuid,uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_admin_register_user(uuid,uuid,uuid,uuid,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_set_access(p_workspace uuid, p_user uuid, p_revision bigint, p_permissions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare before_row public.engefex_access%rowtype;after_row public.engefex_access%rowtype;key text;value jsonb;
begin
 if not engefex_private.is_admin(p_workspace,auth.uid()) then raise exception 'Somente o administrador pode gerenciar acessos' using errcode='42501';end if;
 if not exists(select 1 from public.engefex_members where workspace_id=p_workspace and user_id=p_user) then raise exception 'Usuário não vinculado a esta área de trabalho';end if;
 perform 1 from public.engefex_workspaces where id=p_workspace for update;
 select * into before_row from public.engefex_access where workspace_id=p_workspace and user_id=p_user;
 if before_row.is_admin or p_user=auth.uid() then raise exception 'O acesso do administrador é preservado para evitar bloqueio';end if;
 if coalesce(before_row.revision,0)<>p_revision then raise exception 'As permissões mudaram. Atualize a lista.' using errcode='40001';end if;
 if jsonb_typeof(p_permissions) is distinct from 'object' or jsonb_typeof(p_permissions->'modules') is distinct from 'object' or jsonb_typeof(p_permissions->'views') is distinct from 'object' or (p_permissions-'modules'-'views')<>'{}' then raise exception 'Permissões inválidas' using errcode='22023';end if;
 for key,value in select * from jsonb_each(p_permissions->'modules') loop
  if key not in ('core','works','finance','factory','nextar','hr','board') or value not in ('"none"'::jsonb,'"view"'::jsonb,'"edit"'::jsonb) then raise exception 'Permissão de módulo inválida';end if;
 end loop;
 for key,value in select * from jsonb_each(p_permissions->'views') loop
  if engefex_private.module_for(key) is null or value not in ('"none"'::jsonb,'"view"'::jsonb,'"edit"'::jsonb) then raise exception 'Permissão de tela inválida';end if;
 end loop;
 insert into public.engefex_access(workspace_id,user_id,permissions,revision,updated_by) values(p_workspace,p_user,p_permissions,1,auth.uid()) on conflict(workspace_id,user_id) do update set permissions=excluded.permissions,revision=engefex_access.revision+1,updated_at=clock_timestamp(),updated_by=auth.uid() returning * into after_row;
 insert into engefex_private.access_audit(workspace_id,user_id,actor,before_data,after_data) values(p_workspace,p_user,auth.uid(),to_jsonb(before_row),to_jsonb(after_row));
 return to_jsonb(after_row);
end $function$
;
REVOKE ALL ON FUNCTION public.engefex_set_access(uuid,uuid,bigint,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_set_access(uuid,uuid,bigint,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_set_access(uuid,uuid,bigint,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_can_read_stock_update(p_workspace uuid, p_kind text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select auth.uid()) is not null
    and coalesce(engefex_private.level(p_workspace,(select auth.uid()),p_kind),0)>=1
$function$
;
REVOKE ALL ON FUNCTION public.engefex_can_read_stock_update(uuid,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_can_read_stock_update(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_can_read_stock_update(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_log_state_stock_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_actor text;
begin
  select nullif(btrim(u.nome),'') into v_actor
  from public.engefex_usuarios u where u.id = new.updated_by limit 1;
  if old.payload->'paintStock' is distinct from new.payload->'paintStock' then
    insert into public.engefex_stock_updates(workspace_id,stock_kind,actor_id,actor_name,created_at)
    values(new.workspace_id,'paintstock',new.updated_by,coalesce(v_actor,'Usuário da equipe'),new.updated_at);
  end if;
  if old.payload->'civilStock' is distinct from new.payload->'civilStock' then
    insert into public.engefex_stock_updates(workspace_id,stock_kind,actor_id,actor_name,created_at)
    values(new.workspace_id,'civilstock',new.updated_by,coalesce(v_actor,'Usuário da equipe'),new.updated_at);
  end if;
  return new;
end;
$function$
;
REVOKE ALL ON FUNCTION public.engefex_log_state_stock_updates() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_log_state_stock_updates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_log_state_stock_updates() TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_nextar_publish(p_workspace uuid, p_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := (select auth.uid());
  number_rows integer;
BEGIN
  IF v_uid IS NULL OR coalesce(engefex_private.level(p_workspace,v_uid,'nextarstock'),0) < 2 THEN
    RAISE EXCEPTION 'Sem permissão para atualizar o estoque Nextar' USING errcode = '42501';
  END IF;
  IF jsonb_typeof(p_snapshot) <> 'object' OR jsonb_typeof(p_snapshot->'rows') <> 'array' THEN
    RAISE EXCEPTION 'Formato inválido';
  END IF;
  number_rows := jsonb_array_length(p_snapshot->'rows');
  IF number_rows < 1 OR number_rows > 50000 OR octet_length(p_snapshot::text) > 15000000 THEN
    RAISE EXCEPTION 'Backup excede os limites de segurança';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_snapshot->'rows') x
    WHERE jsonb_typeof(x) <> 'object'
       OR jsonb_typeof(x->'code') <> 'string' OR length(x->>'code') > 60
       OR jsonb_typeof(x->'description') <> 'string' OR length(x->>'description') > 500
       OR (x->'stock' IS NOT NULL AND jsonb_typeof(x->'stock') NOT IN ('number','null'))
  ) THEN
    RAISE EXCEPTION 'Produto contém campos inválidos';
  END IF;
  INSERT INTO public.engefex_nextar_inventory(workspace_id,snapshot,updated_at,updated_by)
  VALUES(p_workspace,p_snapshot,now(),v_uid)
  ON CONFLICT(workspace_id) DO UPDATE SET snapshot=excluded.snapshot,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  RETURN jsonb_build_object('count',number_rows,'updated_at',now());
END;
$function$
;
REVOKE ALL ON FUNCTION public.engefex_nextar_publish(uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_nextar_publish(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_nextar_publish(uuid,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION engefex_private.assert_user_admin(w uuid, a uuid, s uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not engefex_private.is_admin(w,a) or not exists(select 1 from auth.sessions where id=s and user_id=a and (not_after is null or not_after>now())) then raise exception 'Administrador com sessão ativa obrigatório' using errcode='42501';end if;
end $function$
;
REVOKE ALL ON FUNCTION engefex_private.assert_user_admin(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.engefex_admin_user_guard(p_workspace uuid, p_actor uuid, p_session uuid, p_request uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform engefex_private.assert_user_admin(p_workspace,p_actor,p_session);
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 if (select count(*) from engefex_private.user_creation_audit where actor_id=p_actor and created_at>now()-interval '1 minute')>=5 or (select count(*) from engefex_private.user_creation_audit where actor_id=p_actor and created_at>now()-interval '1 day')>=50 then raise exception 'Limite de cadastros';end if;
 insert into engefex_private.user_creation_audit(request_id,workspace_id,actor_id) values(p_request,p_workspace,p_actor);
end $function$
;
REVOKE ALL ON FUNCTION public.engefex_admin_user_guard(uuid,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_admin_user_guard(uuid,uuid,uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.engefex_read_state_compact(p_workspace uuid)
 RETURNS TABLE(revision bigint, updated_at timestamp with time zone, payload jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.engefex_members m
    where m.workspace_id = p_workspace and m.user_id = auth.uid()
  ) then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;

  return query
  select s.revision, s.updated_at,
    case
      when engefex_private.full_read(p_workspace, auth.uid())
      then jsonb_set(
        s.payload,
        '{history}',
        jsonb_path_query_array(s.payload, '$.history[0 to 49]'),
        false
      )
      else engefex_private.project_state(p_workspace, auth.uid(), s.payload)
    end
  from public.engefex_state s
  where s.workspace_id = p_workspace;
end;
$function$
;
REVOKE ALL ON FUNCTION public.engefex_read_state_compact(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.engefex_read_state_compact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.engefex_read_state_compact(uuid) TO service_role;
CREATE OR REPLACE FUNCTION engefex_private.project_state(w uuid, u uuid, s jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb:='{}';k text;arr jsonb;r jsonb;outarr jsonb;readit boolean;has_any boolean;
begin
 if engefex_private.is_admin(w,u) then return s;end if;
 has_any:=exists(select 1 from jsonb_object_keys('{"dashboard": "core", "projects": "core", "sharedcalendar": "core", "agenda": "works", "activities": "works", "timeline": "works", "budget": "works", "supplies": "works", "measurements": "works", "checklist": "works", "issues": "works", "responsibles": "works", "diary": "works", "documents": "works", "teams": "works", "board": "board", "payables": "finance", "receivables": "finance", "fixedexpenses": "finance", "fabrication": "factory", "factory-overview": "factory", "factory-data": "factory", "factory-quantities": "factory", "factory-preparation": "factory", "factory-progress": "factory", "factory-quality": "factory", "nextarstock": "nextar", "paintstock": "nextar", "civilstock": "nextar"}'::jsonb) v where engefex_private.level(w,u,v)>=1);
 result:=jsonb_build_object('version',1,'dataModel',2,'materialsBudgetLinked',coalesce(s->'materialsBudgetLinked','true'::jsonb),'_accessFiltered',true);
 for k in select jsonb_object_keys(s) loop
  if k in ('version','dataModel') then continue;end if;
  if k='history' then result:=result||jsonb_build_object(k,'[]'::jsonb);continue;end if;
  if k='boardMuralPositions' then
   if engefex_private.any_level(w,u,array['board'],1) then
     result:=result||jsonb_build_object(k,s->k);
   end if;
   continue;
 end if;
 if k='hrSettings' then if engefex_private.any_level(w,u,array['hr-documents'],1) then result:=result||jsonb_build_object(k,s->k);end if;continue;end if; if jsonb_typeof(s->k)<>'array' then continue;end if;
  outarr:='[]';
  for r in select value from jsonb_array_elements(s->k) loop
   readit:=engefex_private.any_level(w,u,engefex_private.owners(array[k]),1);
   if k='history' then readit:=false;
   elsif k='projects' then
    if not has_any then continue;end if;
    if not engefex_private.any_level(w,u,array['projects','dashboard','budget','measurements','payables','receivables'],1) then r:=jsonb_build_object('id',r->'id','name',r->'name','code',r->'code');end if;readit:=true;
   elsif k in ('stages','activities') and not readit and engefex_private.any_level(w,u,array['diary','issues','checklist','teams'],1) then
    r:=r-'sale'-'unitPrice'-'laborUnit'-'materialUnit'-'equipmentUnit';readit:=true;
   elsif k in ('budgetStages','budgetItems') and not readit then
    if engefex_private.any_level(w,u,array['measurements','receivables'],1) then readit:=true;
    elsif engefex_private.any_level(w,u,array['supplies','payables'],1) then r:=jsonb_build_object('id',r->'id','project',r->'project','stage',r->'stage','name',r->'name','code',r->'code','parent',r->'parent','unit',r->'unit','quantity',0,'executed',0,'unitPrice',0,'sale',0);readit:=true;end if;
   elsif k='costs' then readit:=engefex_private.cost_read(w,u,r);
   elsif k in ('purchases','laborContracts','suppliers') then readit:=readit or engefex_private.any_level(w,u,array['payables'],1);
   elsif k='fixedExpenses' then readit:=readit or engefex_private.any_level(w,u,array['payables'],1);
   elsif k='receipts' then readit:=engefex_private.any_level(w,u,array['receivables'],1) or (coalesce(r->>'receivableId','')='' and engefex_private.any_level(w,u,array['measurements','budget'],1));
   elsif k='measurements' then readit:=readit or engefex_private.any_level(w,u,array['budget'],1);
   elsif k='responsibles' then readit:=readit or engefex_private.any_level(w,u,array['issues','sharedcalendar'],1);
   elsif k='notifications' then readit:=engefex_private.any_level(w,u,array['issues'],1) and lower(r->>'recipientEmail')=lower((select email from auth.users where id=u));
   elsif k='factoryOrders' then
    readit:=engefex_private.any_level(w,u,array['fabrication','factory-overview','factory-data','factory-quantities','factory-preparation','factory-progress','factory-quality'],1);
    if readit then r:=engefex_private.factory_read(w,u,r);end if;
   end if;
   if readit then outarr:=outarr||jsonb_build_array(r);end if;
  end loop;
  result:=result||jsonb_build_object(k,outarr);
 end loop;

 -- A tela Equipes recebe somente campos operacionais e custo/hora calculado.
 -- Esta projeção nunca inclui base salarial, encargos discriminados ou holerite.
 if engefex_private.any_level(w,u,array['teams'],1) then
   result:=result||jsonb_build_object(
     'crewEmployees',
     coalesce((
       select jsonb_agg(jsonb_build_object(
         'id', e->'id',
         'name', e->'name',
         'role', coalesce(e->'role','""'::jsonb),
         'active', coalesce(e->'active','true'::jsonb),
         'employmentStatus', coalesce(e->'employmentStatus','""'::jsonb)
       ))
       from jsonb_array_elements(
         case when jsonb_typeof(s->'hrEmployees')='array' then s->'hrEmployees' else '[]'::jsonb end
       ) e
     ),'[]'::jsonb),
     'crewHourlyRates',
     coalesce((
       select jsonb_agg(jsonb_build_object(
         'employeeId',coalesce(pay->>'employeeId',''),
         'employeeName',coalesce(pay->>'employeeName',pay->'values'->>'A',''),
         'period',coalesce(pay->>'period',''),
         'hourlyRate', round((
           (case when coalesce(pay->'values'->>'B','') ~ '^[0-9]+([.,][0-9]+)?$'
             then replace(pay->'values'->>'B',',','.')::numeric else 0 end)
           +(case when coalesce(pay->>'employerCosts','') ~ '^[0-9]+([.,][0-9]+)?$'
             then replace(pay->>'employerCosts',',','.')::numeric else 0 end)
         )/
         (case when coalesce(pay->>'monthlyHours','') ~ '^[0-9]+([.,][0-9]+)?$'
                 and replace(pay->>'monthlyHours',',','.')::numeric>0
           then replace(pay->>'monthlyHours',',','.')::numeric else 220 end),6),
         'chargesMissing',(case when coalesce(pay->>'employerCosts','') ~ '^[0-9]+([.,][0-9]+)?$'
           then replace(pay->>'employerCosts',',','.')::numeric<=0 else true end)
       ))
       from jsonb_array_elements(
         case when jsonb_typeof(s->'hrPayroll')='array' then s->'hrPayroll' else '[]'::jsonb end
       ) pay
     ),'[]'::jsonb)
   );
 end if;
 return result;

end $function$
;
REVOKE ALL ON FUNCTION engefex_private.project_state(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION engefex_private.merge_delta(w uuid, u uuid, fullvalue jsonb, visible jsonb, nextvalue jsonb, p text[], oldstate jsonb, newstate jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;key text;entry jsonb;prior jsonb;actual jsonb;target jsonb;ids boolean;
begin
 if visible is not distinct from nextvalue then return fullvalue;end if;
 -- Clientes com dados legados podem enviar valores restritos que NÃO mudaram.
 -- Mantemos o registro integral e bloqueamos modificações não autorizadas.
 if array_length(p,1)>0 and fullvalue is not null and nextvalue is not distinct from fullvalue then return fullvalue;end if;
 if jsonb_typeof(visible)='object' and jsonb_typeof(nextvalue)='object' then
  result:=coalesce(fullvalue,'{}');
  for key in select jsonb_object_keys(visible||nextvalue) loop
   if visible->key is not distinct from nextvalue->key then continue;end if;
   if array_length(p,1) is null and key in ('history','notifications','_accessFiltered','crewEmployees','crewHourlyRates') then continue;end if;
   target:=engefex_private.merge_delta(w,u,fullvalue->key,visible->key,nextvalue->key,p||key,oldstate,newstate);
   if target is null then result:=result-key;else result:=jsonb_set(result,array[key],target,true);end if;
  end loop;return result;
 end if;
 if jsonb_typeof(visible)='array' and jsonb_typeof(nextvalue)='array' and (jsonb_array_length(visible)>0 or jsonb_array_length(nextvalue)>0) then
  ids:=not exists(select 1 from jsonb_array_elements(visible||nextvalue) x where jsonb_typeof(x)<>'object' or coalesce(x->>'id','')='');
  if ids then
   if (select count(*) from jsonb_array_elements(nextvalue))<>(select count(distinct x->>'id') from jsonb_array_elements(nextvalue) x) then raise exception 'IDs duplicados' using errcode='22023';end if;
   result:='[]';
   for actual in select value from jsonb_array_elements(coalesce(fullvalue,'[]')) loop
    select x into prior from jsonb_array_elements(visible) x where x->>'id'=actual->>'id';
    if prior is null then result:=result||jsonb_build_array(actual);continue;end if;
    select x into entry from jsonb_array_elements(nextvalue) x where x->>'id'=actual->>'id';
    target:=engefex_private.merge_delta(w,u,actual,prior,entry,p||(actual->>'id'),oldstate,newstate);
    if target is not null then result:=result||jsonb_build_array(target);end if;
   end loop;
   for entry in select value from jsonb_array_elements(nextvalue) x where not exists(select 1 from jsonb_array_elements(visible) z where z->>'id'=x.value->>'id') loop
    if exists(select 1 from jsonb_array_elements(coalesce(fullvalue,'[]')) z where z->>'id'=entry->>'id') then raise exception 'Registro não autorizado em %',array_to_string(p,' / ') using errcode='42501';end if;
    target:=engefex_private.merge_delta(w,u,null,null,entry,p||(entry->>'id'),oldstate,newstate);result:=result||jsonb_build_array(target);
   end loop;return result;
  end if;
 end if;
 if not engefex_private.can_edit(w,u,p,oldstate,newstate,nextvalue) then raise exception 'Sem permissão de edição nesta área: %',array_to_string(p,' / ') using errcode='42501';end if;
 return nextvalue;
end $function$
;
REVOKE ALL ON FUNCTION engefex_private.merge_delta(uuid,uuid,jsonb,jsonb,jsonb,text[],jsonb,jsonb) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION engefex_private.owners(p text[])
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
 if p[1]='factoryOrders' then
  if array_length(p,1)<=2 then return array['factory-data'];end if;
  if p[3]='updatedAt' then return array['factory-data','factory-quantities','factory-preparation','factory-progress','factory-quality'];end if;
  if p[3] in ('parts') then
   if p[5] in ('prepared','fabricated','painted','released','shipped','received') then return array['factory-progress'];end if;
   return array['factory-quantities'];
  elsif p[3] in ('lots') then return array['factory-progress'];
  elsif p[3]='workflow' then
   if p[4]='profile' then return array['factory-data'];
   elsif p[4]='routes' then return array['factory-quantities'];
   elsif p[4]='ready' then return array['factory-preparation'];
   elsif p[4] in ('quality','qualityArchive','qualityTemplateVersion') then return array['factory-quality'];
   elsif p[4] in ('events','baselineResets','restartHistory') then return array['factory-progress'];
   elsif p[4] in ('closedAt','closedBy','reopenReason') then return array['factory-progress','factory-quality'];
   end if;
  end if;
  return array['factory-data'];
 end if;
 return case p[1]
 when 'projects' then array['projects'] when 'stages' then array['activities','timeline'] when 'activities' then array['activities','timeline']
 when 'tasks' then array['agenda'] when 'calendarEvents' then array['sharedcalendar']
 when 'budgetStages' then array['budget'] when 'budgetItems' then array['budget'] when 'quotes' then array['budget'] when 'materials' then array['budget'] when 'stockMoves' then array['budget'] when 'paintStock' then array['paintstock'] when 'civilStock' then array['civilstock']
 when 'purchases' then array['supplies','payables'] when 'suppliers' then array['supplies'] when 'laborContracts' then array['supplies']
 when 'measurements' then array['measurements','receivables'] when 'receipts' then array['measurements','receivables'] when 'receivableEntries' then array['receivables'] when 'fixedExpenses' then array['fixedexpenses']
 when 'costs' then array['payables','budget'] when 'fiscalImports' then array['payables'] when 'measurementForecastLinks' then array['measurements','timeline','budget']
 when 'issues' then array['issues'] when 'responsibles' then array['responsibles'] when 'checklists' then array['checklist'] when 'diary' then array['diary'] when 'teams' then array['teams'] when 'crewAllocations' then array['teams','payables']
 when 'boardTasks' then array['board'] when 'boardMuralPositions' then array['board'] when 'hrVacations' then array['hr-vacations'] when 'hrPayroll' then array['hr-payroll'] when 'hrPayrollVale' then array['hr-payroll'] when 'hrEmployees' then array['hr-employees'] when 'hrDocuments' then array['hr-documents'] when 'hrSettings' then array['hr-documents'] when 'documents' then array['documents'] when 'facts' then array['documents'] else array[]::text[] end;
end $function$
;
REVOKE ALL ON FUNCTION engefex_private.owners(text[]) FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER engefex_novo_usuario AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION engefex_criar_perfil();
CREATE TRIGGER engefex_member_access AFTER INSERT ON public.engefex_members FOR EACH ROW EXECUTE FUNCTION engefex_private.provision_member_access();
CREATE TRIGGER engefex_guard_snapshot BEFORE INSERT OR UPDATE ON public.engefex_state FOR EACH ROW EXECUTE FUNCTION engefex_private.guard_and_snapshot_state();
CREATE TRIGGER engefex_log_state_stock_updates AFTER UPDATE OF payload ON public.engefex_state FOR EACH ROW EXECUTE FUNCTION engefex_log_state_stock_updates();
CREATE TRIGGER engefex_log_nextar_stock_updates AFTER INSERT OR UPDATE ON public.engefex_nextar_inventory FOR EACH ROW EXECUTE FUNCTION engefex_log_nextar_stock_updates();
ALTER TABLE "public"."engefex_usuarios" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."engefex_usuarios" FROM PUBLIC, anon, authenticated;
ALTER TABLE "public"."engefex_members" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."engefex_members" FROM PUBLIC, anon, authenticated;
ALTER TABLE "public"."engefex_workspaces" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."engefex_workspaces" FROM PUBLIC, anon, authenticated;
ALTER TABLE "public"."engefex_state" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."engefex_state" FROM PUBLIC, anon, authenticated;
ALTER TABLE "public"."engefex_access" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."engefex_access" FROM PUBLIC, anon, authenticated;
ALTER TABLE "engefex_private"."access_audit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "engefex_private"."access_audit" FROM PUBLIC, anon, authenticated;
ALTER TABLE "public"."engefex_nextar_inventory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."engefex_nextar_inventory" FROM PUBLIC, anon, authenticated;
ALTER TABLE "engefex_private"."hr_vacation_import_backups" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "engefex_private"."hr_vacation_import_backups" FROM PUBLIC, anon, authenticated;
ALTER TABLE "engefex_private"."release_safety_snapshots" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "engefex_private"."release_safety_snapshots" FROM PUBLIC, anon, authenticated;
ALTER TABLE "engefex_private"."user_creation_audit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "engefex_private"."user_creation_audit" FROM PUBLIC, anon, authenticated;
ALTER TABLE "engefex_private"."rh_reset_backups" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "engefex_private"."rh_reset_backups" FROM PUBLIC, anon, authenticated;
ALTER TABLE "public"."engefex_notification_reads" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."engefex_notification_reads" FROM PUBLIC, anon, authenticated;
ALTER TABLE "engefex_private"."state_recovery_snapshots" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "engefex_private"."state_recovery_snapshots" FROM PUBLIC, anon, authenticated;
ALTER TABLE "engefex_private"."restore_transfer_chunks" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "engefex_private"."restore_transfer_chunks" FROM PUBLIC, anon, authenticated;
ALTER TABLE "public"."engefex_stock_updates" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."engefex_stock_updates" FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE "public"."engefex_usuarios" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_usuarios" TO "service_role";
GRANT UPDATE ON TABLE "public"."engefex_usuarios" TO "service_role";
GRANT DELETE ON TABLE "public"."engefex_usuarios" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."engefex_usuarios" TO "service_role";
GRANT REFERENCES ON TABLE "public"."engefex_usuarios" TO "service_role";
GRANT TRIGGER ON TABLE "public"."engefex_usuarios" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_usuarios" TO "authenticated";
GRANT INSERT ON TABLE "public"."engefex_members" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_members" TO "service_role";
GRANT UPDATE ON TABLE "public"."engefex_members" TO "service_role";
GRANT DELETE ON TABLE "public"."engefex_members" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."engefex_members" TO "service_role";
GRANT REFERENCES ON TABLE "public"."engefex_members" TO "service_role";
GRANT TRIGGER ON TABLE "public"."engefex_members" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_members" TO "authenticated";
GRANT INSERT ON TABLE "public"."engefex_workspaces" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_workspaces" TO "service_role";
GRANT UPDATE ON TABLE "public"."engefex_workspaces" TO "service_role";
GRANT DELETE ON TABLE "public"."engefex_workspaces" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."engefex_workspaces" TO "service_role";
GRANT REFERENCES ON TABLE "public"."engefex_workspaces" TO "service_role";
GRANT TRIGGER ON TABLE "public"."engefex_workspaces" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_workspaces" TO "authenticated";
GRANT INSERT ON TABLE "public"."engefex_state" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_state" TO "service_role";
GRANT UPDATE ON TABLE "public"."engefex_state" TO "service_role";
GRANT DELETE ON TABLE "public"."engefex_state" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."engefex_state" TO "service_role";
GRANT REFERENCES ON TABLE "public"."engefex_state" TO "service_role";
GRANT TRIGGER ON TABLE "public"."engefex_state" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_state" TO "authenticated";
GRANT INSERT ON TABLE "public"."engefex_access" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_access" TO "service_role";
GRANT UPDATE ON TABLE "public"."engefex_access" TO "service_role";
GRANT DELETE ON TABLE "public"."engefex_access" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."engefex_access" TO "service_role";
GRANT REFERENCES ON TABLE "public"."engefex_access" TO "service_role";
GRANT TRIGGER ON TABLE "public"."engefex_access" TO "service_role";
GRANT INSERT ON TABLE "public"."engefex_nextar_inventory" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_nextar_inventory" TO "service_role";
GRANT UPDATE ON TABLE "public"."engefex_nextar_inventory" TO "service_role";
GRANT DELETE ON TABLE "public"."engefex_nextar_inventory" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."engefex_nextar_inventory" TO "service_role";
GRANT REFERENCES ON TABLE "public"."engefex_nextar_inventory" TO "service_role";
GRANT TRIGGER ON TABLE "public"."engefex_nextar_inventory" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_nextar_inventory" TO "authenticated";
GRANT INSERT ON TABLE "public"."engefex_notification_reads" TO "authenticated";
GRANT SELECT ON TABLE "public"."engefex_notification_reads" TO "authenticated";
GRANT UPDATE ON TABLE "public"."engefex_notification_reads" TO "authenticated";
GRANT DELETE ON TABLE "public"."engefex_notification_reads" TO "authenticated";
GRANT TRUNCATE ON TABLE "public"."engefex_notification_reads" TO "authenticated";
GRANT REFERENCES ON TABLE "public"."engefex_notification_reads" TO "authenticated";
GRANT TRIGGER ON TABLE "public"."engefex_notification_reads" TO "authenticated";
GRANT INSERT ON TABLE "public"."engefex_notification_reads" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_notification_reads" TO "service_role";
GRANT UPDATE ON TABLE "public"."engefex_notification_reads" TO "service_role";
GRANT DELETE ON TABLE "public"."engefex_notification_reads" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."engefex_notification_reads" TO "service_role";
GRANT REFERENCES ON TABLE "public"."engefex_notification_reads" TO "service_role";
GRANT TRIGGER ON TABLE "public"."engefex_notification_reads" TO "service_role";
GRANT INSERT ON TABLE "public"."engefex_stock_updates" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_stock_updates" TO "service_role";
GRANT UPDATE ON TABLE "public"."engefex_stock_updates" TO "service_role";
GRANT DELETE ON TABLE "public"."engefex_stock_updates" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."engefex_stock_updates" TO "service_role";
GRANT REFERENCES ON TABLE "public"."engefex_stock_updates" TO "service_role";
GRANT TRIGGER ON TABLE "public"."engefex_stock_updates" TO "service_role";
GRANT SELECT ON TABLE "public"."engefex_stock_updates" TO "authenticated";
CREATE POLICY "engefex_files_insert" ON "storage"."objects" FOR INSERT TO "authenticated"  WITH CHECK (((bucket_id = 'engefex-files'::text) AND engefex_private.file_access((storage.foldername(name))[1], storage.filename(name), true)));
CREATE POLICY "engefex_files_read" ON "storage"."objects" FOR SELECT TO "authenticated" USING (((bucket_id = 'engefex-files'::text) AND engefex_private.file_access((storage.foldername(name))[1], storage.filename(name), false))) ;
CREATE POLICY "engefex_ler_proprio_perfil" ON "public"."engefex_usuarios" FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = id)) ;
CREATE POLICY "engefex_own_membership" ON "public"."engefex_members" FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) ;
CREATE POLICY "engefex_workspace_read" ON "public"."engefex_workspaces" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM engefex_members m
  WHERE ((m.workspace_id = engefex_workspaces.id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))) ;
CREATE POLICY "engefex_state_read" ON "public"."engefex_state" FOR SELECT TO "authenticated" USING (engefex_private.full_read(workspace_id, ( SELECT auth.uid() AS uid))) ;
CREATE POLICY "nextar_read" ON "public"."engefex_nextar_inventory" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM engefex_members m
  WHERE ((m.workspace_id = engefex_nextar_inventory.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))) AND (COALESCE(((engefex_access_context(workspace_id) ->> 'is_admin'::text))::boolean, false) OR (((((engefex_access_context(workspace_id) -> 'permissions'::text) -> 'modules'::text) ->> 'nextar'::text) = ANY (ARRAY['view'::text, 'edit'::text])) AND (COALESCE((((engefex_access_context(workspace_id) -> 'permissions'::text) -> 'views'::text) ->> 'nextarstock'::text), (((engefex_access_context(workspace_id) -> 'permissions'::text) -> 'modules'::text) ->> 'nextar'::text)) = ANY (ARRAY['view'::text, 'edit'::text])))))) ;
CREATE POLICY "engefex_notification_reads_self_insert" ON "public"."engefex_notification_reads" FOR INSERT TO "authenticated"  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM engefex_members m
  WHERE ((m.workspace_id = engefex_notification_reads.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "engefex_notification_reads_self_select" ON "public"."engefex_notification_reads" FOR SELECT TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM engefex_members m
  WHERE ((m.workspace_id = engefex_notification_reads.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))))) ;
CREATE POLICY "engefex_stock_updates_visible" ON "public"."engefex_stock_updates" FOR SELECT TO "authenticated" USING (engefex_can_read_stock_update(workspace_id, stock_kind)) ;
INSERT INTO storage.buckets(id,name,public,file_size_limit) VALUES ('engefex-files','engefex-files',false,20000000);
NOTIFY pgrst, 'reload schema';
