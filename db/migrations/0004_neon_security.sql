-- Standard Postgres identity adapter for Neon Auth, always set transaction-locally.
create role causa_raiz_app nologin nobypassrls;
grant causa_raiz_app to current_user;
grant usage on schema public to causa_raiz_app;
create function usuario_corrente() returns text language sql stable as $$select nullif(current_setting('app.usuario_id',true),'')$$;
create function meus_times() returns setof uuid language sql stable security definer set search_path=public as $$select time_id from membros_time where usuario_id=usuario_corrente()$$;
revoke all on function meus_times() from public;grant execute on function meus_times() to causa_raiz_app;
alter table times enable row level security;alter table membros_time enable row level security;
create policy meus_espacos on times for select to causa_raiz_app using(id in(select meus_times()));
create policy minhas_associacoes on membros_time for select to causa_raiz_app using(usuario_id=usuario_corrente());
alter table analises enable row level security;
create policy ler_analises on analises for select to causa_raiz_app using(time_id in(select meus_times()));
create policy criar_analises on analises for insert to causa_raiz_app with check(time_id in(select meus_times()) and criado_por=usuario_corrente());
create policy editar_analises on analises for update to causa_raiz_app using(time_id in(select meus_times())) with check(time_id in(select meus_times()));
do $$declare t text;begin foreach t in array array['causas','hipoteses','riscos','acoes','medicoes']loop
 execute format('alter table %I enable row level security',t);
 execute format('create policy ler on %I for select to causa_raiz_app using(analise_id in(select id from analises))',t);
 execute format('create policy criar on %I for insert to causa_raiz_app with check(analise_id in(select id from analises))',t);
 execute format('create policy editar on %I for update to causa_raiz_app using(analise_id in(select id from analises)) with check(analise_id in(select id from analises))',t);
end loop;end $$;
alter table historico enable row level security;
create policy ler_historico on historico for select to causa_raiz_app using(analise_id in(select id from analises));
grant select on times,membros_time,historico,v_medicao_atual,v_efeito_analise,v_pareto_dimensao,v_perfil_plano to causa_raiz_app;
grant select,insert,update on analises,causas,hipoteses,riscos,acoes,medicoes to causa_raiz_app;
create function criar_meu_espaco() returns uuid language plpgsql security definer set search_path=public as $$
declare uid text:=usuario_corrente();tid uuid;
begin
 if uid is null then raise exception 'Entre para criar seu espaço.';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid,0));
 select time_id into tid from membros_time where usuario_id=uid limit 1;
 if tid is not null then return tid;end if;
 insert into times(nome) values('Meu laboratório')returning id into tid;
 insert into membros_time(usuario_id,time_id,papel)values(uid,tid,'facilitador');return tid;
end $$;
revoke all on function criar_meu_espaco() from public;grant execute on function criar_meu_espaco() to causa_raiz_app;
revoke all on function registrar_historico() from public;
