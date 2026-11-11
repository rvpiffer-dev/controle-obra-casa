CREATE FUNCTION public.casa_initialize_access() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u auth.users%rowtype; w uuid;
BEGIN
 SELECT * INTO u FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
 IF u.id IS NULL OR lower(u.email) <> 'rvpiffer@gmail.com' THEN RETURN; END IF;
 SELECT id INTO w FROM public.engefex_workspaces WHERE name='Casa Ramon e Talita' FOR UPDATE;
 IF w IS NULL THEN RAISE EXCEPTION 'Obra não configurada'; END IF;
 INSERT INTO public.engefex_members(workspace_id,user_id) VALUES(w,u.id) ON CONFLICT DO NOTHING;
 UPDATE public.engefex_access SET is_admin=true WHERE workspace_id=w AND user_id=u.id AND NOT is_admin;
 UPDATE public.engefex_usuarios SET nome='Ramon',perfil='administrador',ativo=true,atualizado_em=now() WHERE id=u.id AND (NOT ativo OR perfil<>'administrador');
END $$;
REVOKE ALL ON FUNCTION public.casa_initialize_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.casa_initialize_access() TO authenticated;
NOTIFY pgrst,'reload schema';
