-- Serialize writes for an analysis. Shared parent lock makes hypothesis/action
-- checks atomic, including concurrent validation reversals and cross-child edits.
create function bloquear_investigacao() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and new.analise_id<>old.analise_id then raise exception 'O vínculo com a análise não pode ser alterado.'; end if;
 perform 1 from analises where id=new.analise_id for update;
 if tg_op='UPDATE' then new.version:=old.version+1; end if;
 return new;
end $$;
do $$ declare t text;begin foreach t in array array['causas','hipoteses','riscos','acoes','medicoes'] loop
 execute format('create trigger a_bloquear before insert or update on %I for each row execute function bloquear_investigacao()',t);
end loop;end $$;

create function validar_arvore() returns trigger language plpgsql set search_path=public as $$
begin
 if new.parent_id is not null and exists(
 with recursive pais as (select id,parent_id from causas where id=new.parent_id union all select c.id,c.parent_id from causas c join pais p on c.id=p.parent_id)
 select 1 from pais where id=new.id) then raise exception 'Uma subcausa não pode criar um ciclo na árvore.';end if;
 return new;
end $$;
create trigger b_validar_arvore before insert or update on causas for each row execute function validar_arvore();

create function exigir_hipotese_validada() returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from hipoteses where id=new.hipotese_id and analise_id=new.analise_id and estado='validada') then
 raise exception 'Valide a hipótese por evidências antes de criar uma contramedida.' using errcode='23514';end if;
 if new.status='concluida' then new.concluido_em:=coalesce(new.concluido_em,now());else new.concluido_em:=null;end if;
 return new;
end $$;
create trigger b_acao_validada before insert or update on acoes for each row execute function exigir_hipotese_validada();
create function proteger_validacao() returns trigger language plpgsql set search_path=public as $$
begin
 if new.estado<>'validada' and exists(select 1 from acoes where hipotese_id=new.id) then raise exception 'Esta causa possui contramedidas. Preserve a validação e registre uma nova hipótese para investigar a revisão.';end if;
 if new.estado in ('validada','refutada','inconclusiva') then new.testado_em:=now();end if;
 return new;
end $$;
create trigger b_proteger_validacao before update on hipoteses for each row execute function proteger_validacao();

create function registrar_historico() returns trigger language plpgsql security definer set search_path=public as $$
declare antes text;depois text;aid uuid;
begin
 if tg_table_name='analises' then aid:=new.id;depois:=new.status::text;if tg_op='UPDATE' then antes:=old.status::text;end if;
 elsif tg_table_name='hipoteses' then aid:=new.analise_id;depois:=new.estado::text;if tg_op='UPDATE' then antes:=old.estado::text;end if;
 else aid:=new.analise_id;depois:=new.status::text;if tg_op='UPDATE' then antes:=old.status::text;end if;end if;
 if antes is distinct from depois then insert into historico(analise_id,entidade,registro_id,anterior,atual) values(aid,tg_table_name,new.id,antes,depois);end if;
 return new;
end $$;
do $$ declare t text;begin foreach t in array array['analises','hipoteses','acoes'] loop
 execute format('create trigger z_historico after insert or update on %I for each row execute function registrar_historico()',t);
end loop;end $$;
create function validar_ciclo() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' then
 if new.time_id<>old.time_id then raise exception 'O espaço da análise não pode ser alterado.';end if;
 new.version:=old.version+1;new.atualizado_em:=now();end if;
 if new.status='concluida' and not exists(select 1 from medicoes where analise_id=new.id and momento='depois') then raise exception 'Registre uma medição depois antes de concluir a análise.';end if;
 return new;
end $$;
create trigger a_validar_ciclo before insert or update on analises for each row execute function validar_ciclo();
