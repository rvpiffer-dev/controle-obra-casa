CREATE OR REPLACE FUNCTION engefex_private.owners(p text[])
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin

 if p[1]='projects' and p[3]='casa' then
  if p[4] in ('pls','plsSimulations','plsSimulationDraft') then return array['measurements'];end if;
  if p[4]='purchasePlan' then
   if p[5]='__managementSettings' then return array['payables'];end if;
   if p[5] in ('__plsSimulations','__plsSimulationDraft') then return array['measurements'];end if;
   return array['supplies'];
  end if;
  if p[4] in ('purchases','budgetImportMeta') then return array['budget'];end if;
  return array[]::text[];
 end if;
 if p[1]='projects' and p[3]='initialCash' then return array['projects','payables'];end if;
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
end $function$;
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

    if jsonb_typeof(r->'casa')='object' then
      r:=jsonb_set(r,'{casa}',
        (case when engefex_private.any_level(w,u,array['measurements'],1) then (r->'casa') - 'purchasePlan' - 'purchases' - 'budgetImportMeta' else '{}'::jsonb end)
        || (case when engefex_private.any_level(w,u,array['budget'],1) then jsonb_build_object('purchases',coalesce(r->'casa'->'purchases','[]'::jsonb),'budgetImportMeta',r->'casa'->'budgetImportMeta') else '{}'::jsonb end)
        || jsonb_build_object('purchasePlan',
          (case when engefex_private.any_level(w,u,array['supplies'],1) then coalesce(r->'casa'->'purchasePlan','{}'::jsonb)-'__managementSettings'-'__plsSimulations'-'__plsSimulationDraft' else '{}'::jsonb end)
          || (case when engefex_private.any_level(w,u,array['payables'],1) then jsonb_build_object('__managementSettings',r->'casa'->'purchasePlan'->'__managementSettings') else '{}'::jsonb end)
          || (case when engefex_private.any_level(w,u,array['measurements'],1) then jsonb_build_object('__plsSimulations',coalesce(r->'casa'->'purchasePlan'->'__plsSimulations','[]'::jsonb),'__plsSimulationDraft',r->'casa'->'purchasePlan'->'__plsSimulationDraft') else '{}'::jsonb end)
        )
      );
    end if;
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

end $function$;
NOTIFY pgrst, 'reload schema';
