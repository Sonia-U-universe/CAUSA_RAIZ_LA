-- PostgreSQL 15+: invoker views preserve the caller's RLS.
create view v_medicao_atual with(security_invoker=true) as
 select distinct on(analise_id,momento) analise_id,momento,data_ref,valor,amostra,p50,p85 from medicoes order by analise_id,momento,data_ref desc;
create view v_efeito_analise with(security_invoker=true) as
 select a.id as analise_id,a.time_id,a.titulo,a.indicador,a.unidade,a.direcao,a.status,a.baseline_valor,a.meta_valor,
 b.valor as valor_antes,b.amostra as amostra_antes,d.valor as valor_depois,d.amostra as amostra_depois,
 case when b.valor is null or d.valor is null or b.valor=0 then null
 when a.direcao='menor_melhor' then (b.valor-d.valor)/abs(b.valor)*100 else (d.valor-b.valor)/abs(b.valor)*100 end as melhora_percentual
 from analises a left join v_medicao_atual b on b.analise_id=a.id and b.momento='antes' left join v_medicao_atual d on d.analise_id=a.id and d.momento='depois';
create view v_pareto_dimensao with(security_invoker=true) as
 with base as(select h.analise_id,c.dimensao,sum(h.frequencia)::integer as frequencia from hipoteses h join causas c on c.id=h.causa_id group by h.analise_id,c.dimensao)
 select *,sum(frequencia)over(partition by analise_id order by frequencia desc,dimensao)*100.0/nullif(sum(frequencia)over(partition by analise_id),0) as percentual_acumulado from base;
create view v_perfil_plano with(security_invoker=true) as select analise_id,count(*)filter(where tipo='contencao') as contencoes,count(*)filter(where tipo='corretiva')as corretivas,count(*)filter(where tipo='preventiva')as preventivas,count(*)as total from acoes group by analise_id;
