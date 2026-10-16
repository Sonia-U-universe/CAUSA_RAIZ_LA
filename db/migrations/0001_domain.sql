-- Portable PostgreSQL. CASCADE: children have no meaning without their analysis.
-- RESTRICT: protect ownership and evidence linked to actions.
create type dimensao_ishikawa as enum ('processos','pessoas','tecnologia','requisitos','dependencias','metricas','governanca');
create type estado_hipotese as enum ('hipotese','em_teste','validada','refutada','inconclusiva');
create type status_analise as enum ('rascunho','investigando','contramedidas','medindo','concluida','reaberta');
create type tipo_acao as enum ('contencao','corretiva','preventiva');
create type status_acao as enum ('planejada','em_andamento','concluida','cancelada');
create type direcao_metrica as enum ('menor_melhor','maior_melhor');
create type momento_medicao as enum ('antes','depois');
create type origem_causa as enum ('workshop','retrospectiva','incidente','dado','ia_sugerida');
create type categoria_risco as enum ('seguranca','financeiro','disponibilidade','prazo','pessoas','conformidade');
create type resposta_risco as enum ('mitigar','transferir','aceitar','evitar');

create table times(id uuid primary key default gen_random_uuid(),nome text not null check(length(trim(nome))>=2),criado_em timestamptz not null default now());
create table membros_time(usuario_id text not null,time_id uuid not null references times on delete cascade,papel text not null default 'facilitador' check(papel in ('membro','facilitador','gestor')),primary key(usuario_id,time_id));
create index on membros_time(time_id);
create table analises(
 id uuid primary key default gen_random_uuid(),time_id uuid not null references times on delete restrict,
 titulo text not null check(length(trim(titulo))>=5),desvio text not null check(length(trim(desvio))>=20),
 indicador text not null check(length(trim(indicador))>=2),unidade text not null check(length(trim(unidade))>=1),
 baseline_valor numeric(12,3) not null,baseline_inicio date not null,baseline_fim date not null,meta_valor numeric(12,3) not null,
 direcao direcao_metrica not null,status status_analise not null default 'rascunho',responsavel text not null check(length(trim(responsavel))>=2),
 criado_por text,criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),version integer not null default 1,
 constraint periodo_coerente check(baseline_fim>=baseline_inicio),constraint meta_difere_baseline check(meta_valor<>baseline_valor),
 constraint meta_na_direcao check((direcao='menor_melhor' and meta_valor<baseline_valor) or (direcao='maior_melhor' and meta_valor>baseline_valor)));
create index on analises(time_id,status);
create table causas(
 id uuid primary key default gen_random_uuid(),analise_id uuid not null references analises on delete cascade,
 dimensao dimensao_ishikawa not null,causa text not null check(length(trim(causa))>=5),parent_id uuid,
 porques text[] not null default '{}',origem origem_causa not null default 'workshop',version integer not null default 1,
 unique(id,analise_id),foreign key(parent_id,analise_id) references causas(id,analise_id) on delete cascade,
 check(parent_id is null or parent_id<>id));
create index on causas(analise_id,dimensao);create index on causas(parent_id);
create table hipoteses(
 id uuid primary key default gen_random_uuid(),analise_id uuid not null references analises on delete cascade,causa_id uuid not null,
 enunciado text not null check(length(trim(enunciado))>=15),evidencia_necessaria text not null check(length(trim(evidencia_necessaria))>=10),fonte_evidencia text not null check(length(trim(fonte_evidencia))>=2),
 impacto smallint not null check(impacto between 1 and 5),forca_evidencia smallint not null check(forca_evidencia between 1 and 5),viabilidade smallint not null check(viabilidade between 1 and 5),
 score integer generated always as(impacto*forca_evidencia*viabilidade) stored,frequencia integer not null default 0 check(frequencia>=0),
 estado estado_hipotese not null default 'hipotese',resultado_teste text,testado_em timestamptz,version integer not null default 1,
 unique(id,analise_id),foreign key(causa_id,analise_id) references causas(id,analise_id) on delete cascade,
 constraint conclusao_exige_resultado check(estado not in ('validada','refutada') or length(trim(coalesce(resultado_teste,'')))>=10));
create index on hipoteses(analise_id,estado);create index on hipoteses(causa_id);create index on hipoteses(score desc);
create table riscos(
 id uuid primary key default gen_random_uuid(),analise_id uuid not null references analises on delete cascade,hipotese_id uuid,
 descricao text not null check(length(trim(descricao))>=15),categoria categoria_risco not null,
 probabilidade smallint not null check(probabilidade between 1 and 5),severidade smallint not null check(severidade between 1 and 5),
 exposicao integer generated always as(probabilidade*severidade) stored,resposta resposta_risco not null default 'mitigar',gatilho text,dono text not null check(length(trim(dono))>=2),
 status text not null default 'aberto' check(status in ('aberto','monitorado','materializado','encerrado')),version integer not null default 1,
 foreign key(hipotese_id,analise_id) references hipoteses(id,analise_id) on delete restrict,
 constraint aceite_exige_gatilho check(resposta<>'aceitar' or length(trim(coalesce(gatilho,'')))>=10));
create index on riscos(analise_id,exposicao desc);create index on riscos(hipotese_id);
create table acoes(
 id uuid primary key default gen_random_uuid(),analise_id uuid not null references analises on delete cascade,hipotese_id uuid not null,
 o_que text not null check(length(trim(o_que))>=10),por_que text not null check(length(trim(por_que))>=10),quem text not null check(length(trim(quem))>=2),
 onde text not null check(length(trim(onde))>=2),quando date not null,como text not null check(length(trim(como))>=10),quanto text not null default 'Não estimado',
 tipo tipo_acao not null,status status_acao not null default 'planejada',efeito_observado text,concluido_em timestamptz,version integer not null default 1,
 foreign key(hipotese_id,analise_id) references hipoteses(id,analise_id) on delete restrict,
 constraint conclusao_exige_efeito check(status<>'concluida' or length(trim(coalesce(efeito_observado,'')))>=10));
create index on acoes(analise_id,status);create index on acoes(hipotese_id);create index on acoes(quando) where status not in ('concluida','cancelada');
create table medicoes(
 id uuid primary key default gen_random_uuid(),analise_id uuid not null references analises on delete cascade,momento momento_medicao not null,data_ref date not null,
 valor numeric(12,3) not null,amostra integer not null check(amostra>0),p50 numeric(12,3),p85 numeric(12,3),observacao text,version integer not null default 1,
 check(p50 is null or p85 is null or p85>=p50),unique(analise_id,momento,data_ref));
create index on medicoes(analise_id,momento,data_ref desc);
create table historico(
 id uuid primary key default gen_random_uuid(),analise_id uuid not null references analises on delete cascade,entidade text not null,registro_id uuid not null,
 anterior text,atual text,criado_em timestamptz not null default now());
create index on historico(analise_id,criado_em desc);
