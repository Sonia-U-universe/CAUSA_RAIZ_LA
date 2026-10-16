"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sun,
  Moon,
  Target,
  CheckCircle2,
  Clock3,
  X,
  FileText,
  Pencil,
  LoaderCircle,
  Mail,
} from "lucide-react";
import { createAuthClient } from "@neondatabase/auth/next";
import {
  Data,
  Entity,
  Row,
  labels,
  dimensions,
  emptyData,
  format,
  dateLabel,
  riskPriority,
} from "@/lib/domain";
import { demoData, deriveDemo, validateDemo } from "@/lib/demo";
import { Button, Badge, Empty, Notice, Modal } from "./ui";
import { Editor } from "./editor";
import { Fishbone } from "./fishbone";
type View = "dashboard" | "analises" | "diagrama" | "riscos" | "acoes";
const nav = [
  { id: "dashboard", name: "Visão geral", icon: LayoutDashboard },
  { id: "analises", name: "Análises", icon: FileText },
  { id: "diagrama", name: "Diagrama de Ishikawa", icon: GitBranch },
  { id: "riscos", name: "Riscos", icon: ShieldAlert },
  { id: "acoes", name: "Plano de ação", icon: ListChecks },
] as const;
const titles: Record<View, string> = {
  dashboard: "Da hipótese à evidência.",
  analises: "Investigações em andamento.",
  diagrama: "Enxergue além do sintoma.",
  riscos: "Antecipe o que pode falhar.",
  acoes: "Evidências em movimento.",
};
const subtitles: Record<View, string> = {
  dashboard:
    "Um olhar sobre suas investigações e o efeito observado nos processos.",
  analises: "Comece por um desvio observável. Investigue antes de agir.",
  diagrama: "Explore as sete dimensões, conecte causas e teste suas hipóteses.",
  riscos: "Priorize a exposição e torne explícita a resposta a cada risco.",
  acoes:
    "Contramedidas conectadas a causas validadas, com responsabilidade e prazo.",
};
const isOverdue = (a: Row) =>
  !["concluida", "cancelada"].includes(a.status) &&
  a.quando <
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
const name = (s: string) => labels[s] ?? s;
function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value}`}>
      <span aria-hidden="true">
        {value === "validada"
          ? "●"
          : value === "refutada"
            ? "×"
            : value === "em_teste"
              ? "◐"
              : "•"}
      </span>
      {name(value)}
    </span>
  );
}

export default function Workspace() {
  const [view, setView] = useState<View>("dashboard"),
    [data, setData] = useState<Data>(emptyData),
    [selected, setSelected] = useState(""),
    [demo, setDemo] = useState(false),
    [configured, setConfigured] = useState(false),
    [authenticated, setAuthenticated] = useState(false),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [notification, setNotification] = useState<{
      text: string;
      error?: boolean;
    } | null>(null),
    [editor, setEditor] = useState<{
      entity: Entity;
      row?: Row;
      seed?: Record<string, unknown>;
    } | null>(null),
    [cause, setCause] = useState<Row | null>(null),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [dark, setDark] = useState(false),
    [showLogin, setShowLogin] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null),
    request = useRef<AbortController | null>(null),
    sequence = useRef(0);
  const reload = useCallback(async () => {
    const seq = ++sequence.current;
    request.current?.abort();
    const ctrl = new AbortController();
    request.current = ctrl;
    setLoading(true);
    setLoadError("");
    try {
      const r = await fetch("/api/data", { signal: ctrl.signal });
      const body = await r.json();
      if (seq !== sequence.current) return;
      setConfigured(body.configured ?? true);
      if (r.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!r.ok) throw Error(body.error);
      if (body.data) {
        setData(body.data);
        setAuthenticated(true);
        setSelected((id) =>
          body.data.analises.some((a: Row) => a.id === id)
            ? id
            : (body.data.analises[0]?.id ?? ""),
        );
      }
    } catch (e) {
      if (
        e instanceof Error &&
        e.name !== "AbortError" &&
        seq === sequence.current
      )
        setLoadError(e.message);
    } finally {
      if (seq === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get("view");
    if (nav.some((n) => n.id === v)) setView(v as View);
    void reload();
    return () => request.current?.abort();
  }, [reload]);
  useEffect(() => {
    document.title = `${nav.find((n) => n.id === view)?.name} · Causa Raiz La`;
    const u = new URL(location.href);
    u.searchParams.set("view", view);
    history.replaceState(null, "", u);
    setPage(0);
  }, [view]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  const analysis = data.analises.find((a) => a.id === selected);
  const effects = data.efeitos.find((a) => a.analise_id === selected);
  const children = (entity: Entity) =>
    data[entity].filter((r) => r.analise_id === selected);
  const startDemo = () => {
    request.current?.abort();
    sequence.current++;
    const d = demoData();
    setData(d);
    setSelected(d.analises[0].id);
    setDemo(true);
    setLoading(false);
    setLoadError("");
  };
  async function save(
    entity: Entity,
    row: Row,
    values: Record<string, unknown>,
  ) {
    if (demo) {
      let changed: Row = {
        ...row,
        ...values,
        analise_id: selected,
        version: (row.version ?? 0) + 1,
      };
      if (entity === "analises")
        changed = { ...changed, time_id: data.time_id };
      if (entity === "hipoteses")
        changed.score =
          Number(changed.impacto) *
          Number(changed.forca_evidencia) *
          Number(changed.viabilidade);
      if (entity === "riscos")
        changed.exposicao =
          Number(changed.probabilidade) * Number(changed.severidade);
      validateDemo(entity, changed, data);
      setData((d) =>
        deriveDemo({
          ...d,
          [entity]: d[entity].some((r) => r.id === row.id)
            ? d[entity].map((r) => (r.id === row.id ? changed : r))
            : [...d[entity], changed],
          historico: ["analises", "hipoteses", "acoes"].includes(entity)
            ? [
                ...d.historico,
                {
                  id: crypto.randomUUID(),
                  analise_id: entity === "analises" ? row.id : selected,
                  entidade: entity,
                  atual: changed.estado ?? changed.status,
                  criado_em: new Date().toISOString(),
                },
              ]
            : d.historico,
        }),
      );
      if (entity === "analises") setSelected(row.id);
    } else {
      const r = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity,
          id: row.id,
          version: row.version ?? null,
          analysis: selected,
          values,
        }),
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error);
      await reload();
      if (entity === "analises") setSelected(row.id);
    }
    setNotification({
      text: demo
        ? "Registro salvo na demonstração. Os dados serão descartados ao recarregar."
        : "Registro salvo.",
    });
  }
  function exportData() {
    const exported = analysis
      ? {
          analysis,
          causas: children("causas"),
          hipoteses: children("hipoteses"),
          riscos: children("riscos"),
          acoes: children("acoes"),
          medicoes: children("medicoes"),
          demonstracao: demo,
        }
      : data;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(exported, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "causa-raiz-la.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const [logout, setLogout] = useState(false);
  const add = (entity: Entity) => setEditor({ entity });
  async function signOut() {
    try {
      await createAuthClient().signOut();
      setAuthenticated(false);
      setData(emptyData());
      setSelected("");
      await reload();
    } catch {
      setNotification({
        text: "Não foi possível sair. Tente novamente.",
        error: true,
      });
    }
  }
  const edit = (entity: Entity, row: Row) => setEditor({ entity, row });
  const usable = demo || authenticated;
  const filtered = data.analises.filter((a) =>
    (a.titulo + " " + a.indicador)
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const recurrenceClosed = new Set(
    data.historico
      .filter((h) => h.entidade === "analises" && h.atual === "concluida")
      .map((h) => h.analise_id),
  );
  const recurrenceReopened = new Set(
    data.historico
      .filter(
        (h) =>
          h.entidade === "analises" &&
          h.atual === "reaberta" &&
          recurrenceClosed.has(h.analise_id),
      )
      .map((h) => h.analise_id),
  );
  const header = (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {view === "dashboard"
            ? "LABORATÓRIO DE INVESTIGAÇÃO"
            : nav.find((n) => n.id === view)?.name.toUpperCase()}
        </div>
        <h1>{titles[view]}</h1>
        <p>{subtitles[view]}</p>
      </div>
      <Button
        tone="primary"
        onClick={() =>
          add(
            view === "riscos"
              ? "riscos"
              : view === "acoes"
                ? "acoes"
                : view === "diagrama"
                  ? "causas"
                  : "analises",
          )
        }
        disabled={
          !usable || (view !== "analises" && view !== "dashboard" && !analysis)
        }
      >
        <Plus size={18} />
        {view === "riscos"
          ? "Novo risco"
          : view === "acoes"
            ? "Nova ação"
            : view === "diagrama"
              ? "Adicionar causa"
              : "Nova análise"}
      </Button>
    </div>
  );
  const table = (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            {view === "dashboard"
              ? "Suas investigações"
              : "Portfólio de análises"}
          </h2>
          <p>
            {data.analises.length}{" "}
            {data.analises.length === 1
              ? "análise registrada"
              : "análises registradas"}
          </p>
        </div>
        <div className="search">
          <Search size={17} />
          <input
            ref={searchRef}
            aria-label="Buscar análises"
            type="search"
            placeholder="Buscar análise…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          {query ? (
            <button
              aria-label="Limpar busca"
              onClick={() => {
                setQuery("");
                setPage(0);
                searchRef.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>
      {filtered.length ? (
        <>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">
                Análises com indicador, baseline, meta, medição atual e efeito
                observado
              </caption>
              <thead>
                <tr>
                  <th scope="col">ANÁLISE / INDICADOR</th>
                  <th scope="col">ETAPA</th>
                  <th scope="col">BASELINE → META</th>
                  <th scope="col">EFEITO OBSERVADO</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(page * 8, page * 8 + 8).map((a) => {
                  const e = data.efeitos.find((e) => e.analise_id === a.id);
                  return (
                    <tr key={a.id}>
                      <td>
                        <button
                          className="analysis-link"
                          onClick={() => {
                            setSelected(a.id);
                            setView("diagrama");
                          }}
                        >
                          {a.titulo}
                          <ArrowRight size={15} />
                        </button>
                        <small>
                          {a.indicador} · {a.unidade}
                        </small>
                      </td>
                      <td>
                        <Status value={a.status} />
                      </td>
                      <td className="numeric">
                        {format(a.baseline_valor)} → {format(a.meta_valor)}{" "}
                        {a.unidade}
                      </td>
                      <td>
                        {e?.melhora_percentual !== null &&
                        e?.melhora_percentual !== undefined ? (
                          <>
                            <strong
                              className={
                                Number(e.melhora_percentual) >= 0
                                  ? "good"
                                  : "bad"
                              }
                            >
                              {Number(e.melhora_percentual) >= 0 ? "+" : ""}
                              {format(e.melhora_percentual)}%
                            </strong>
                            <small>
                              n={format(e.amostra_antes)} → n=
                              {format(e.amostra_depois)}
                              {Math.min(
                                Number(e.amostra_antes),
                                Number(e.amostra_depois),
                              ) < 10
                                ? " · baixa confiança"
                                : ""}
                            </small>
                          </>
                        ) : (
                          <span className="muted">Aguardando medição</span>
                        )}
                      </td>
                      <td>
                        <Button
                          aria-label={"Editar " + a.titulo}
                          onClick={() => edit("analises", a)}
                        >
                          <Pencil size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              {page * 8 + 1}–{Math.min((page + 1) * 8, filtered.length)} de{" "}
              {filtered.length}
            </span>
            <Button
              aria-label="Página anterior"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <span>
              Página {page + 1} de {pageCount}
            </span>
            <Button
              aria-label="Próxima página"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </>
      ) : (
        <Empty
          title={
            query
              ? "Nenhuma análise encontrada"
              : "Sua primeira investigação começa aqui"
          }
          action={
            <Button
              tone="primary"
              onClick={() =>
                query ? (setQuery(""), setPage(0)) : add("analises")
              }
            >
              {query ? "Limpar busca" : "Criar análise"}
            </Button>
          }
        >
          {query
            ? "Tente outro termo ou limpe a busca."
            : "Registre um desvio mensurável, o período observado e a meta de melhora."}
        </Empty>
      )}
    </section>
  );
  return (
    <div className="app">
      <a href="#content" className="skip-link">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <a className="brand" href="/?view=dashboard">
          <span className="brand-mark">
            <GitBranch size={25} />
          </span>
          <span>
            Causa Raiz <b>La</b>
            <small>INVESTIGAR PARA EVOLUIR</small>
          </span>
        </a>
        <div className="workspace-name">
          <span className="workspace-icon">
            <FlaskConical size={20} />
          </span>
          <div>
            Meu laboratório<small>Espaço pessoal</small>
          </div>
          <span className="online-dot" />
        </div>
        <p className="nav-label">INVESTIGAÇÃO</p>
        <nav aria-label="Navegação principal">
          {nav.map((n) => (
            <button
              key={n.id}
              aria-current={view === n.id ? "page" : undefined}
              className={view === n.id ? "active" : ""}
              onClick={() => setView(n.id)}
            >
              <n.icon size={19} />
              {n.name}
              {n.id === "analises" && data.analises.length ? (
                <span className="nav-count">{data.analises.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="method-note">
          <div className="tiny-fish">⌁</div>
          <h3>Investigue o sistema.</h3>
          <p>
            Uma hipótese abre a conversa.
            <br />A evidência orienta a decisão.
          </p>
          <a
            href="https://claude.ai/artifact/QK7mpBWaLFAPhvVUiPRw7c"
            target="_blank"
            rel="noreferrer"
          >
            Material do método <ArrowRight size={14} />
          </a>
        </div>
        <div className="profile">
          <span className="avatar">AM</span>
          <div>
            Agile Master
            <small>
              {demo
                ? "Demonstração"
                : authenticated
                  ? "Acesso pessoal"
                  : "Acesso restrito"}
            </small>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Meu laboratório <span>/</span>{" "}
            <strong>{nav.find((n) => n.id === view)?.name}</strong>
          </div>
          <div className="toolbar">
            {usable ? (
              <span className="connection">
                <span className="online-dot" />
                {demo ? "Dados de exemplo" : "Neon conectado"}
              </span>
            ) : null}
            {configured && !demo ? (
              <Button aria-label="Sair da conta" onClick={() => void signOut()}>
                <LogOut size={18} />
              </Button>
            ) : null}
            <Button
              aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
              onClick={() => setDark((d) => !d)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            {usable ? (
              <Button
                onClick={() => (demo ? setLogout(true) : void reload())}
                aria-label={demo ? "Sair da demonstração" : "Atualizar dados"}
              >
                {demo ? <LogOut size={18} /> : <RefreshCw size={18} />}
              </Button>
            ) : null}
          </div>
        </header>
        <main id="content" tabIndex={-1}>
          {demo ? (
            <div className="demo-banner">
              <FlaskConical size={17} />
              <span>
                <strong>Modo demonstração.</strong> Dados fictícios; alterações
                ficam apenas nesta sessão.
              </span>
              <Button onClick={() => setLogout(true)}>Sair</Button>
            </div>
          ) : null}
          {header}
          {loading ? (
            <div className="loading" role="status">
              <LoaderCircle size={26} className="spin" />
              <p>Carregando o laboratório…</p>
            </div>
          ) : loadError ? (
            <Empty
              title={
                loadError.includes("autorizada")
                  ? "Acesso não autorizado"
                  : "Não foi possível carregar"
              }
              action={
                <Button tone="primary" onClick={() => void reload()}>
                  Tentar novamente
                </Button>
              }
            >
              {loadError}
            </Empty>
          ) : !usable ? (
            <section className="welcome panel">
              <div>
                <span className="eyebrow">HIPÓTESE ≠ EVIDÊNCIA</span>
                <h2>
                  Troque suposições por
                  <br />
                  investigações melhores.
                </h2>
                <p>
                  Do desvio observado ao plano de ação: organize causas, teste
                  hipóteses e acompanhe o que mudou.
                </p>
                <div className="actions">
                  {configured ? (
                    <Button tone="primary" onClick={() => setShowLogin(true)}>
                      <Mail size={18} />
                      Entrar no laboratório
                    </Button>
                  ) : null}
                  <Button
                    tone={configured ? "neutral" : "primary"}
                    onClick={startDemo}
                  >
                    Explorar demonstração <ArrowRight size={18} />
                  </Button>
                </div>
                <p className="setup-note">
                  {configured
                    ? "Acesso pessoal protegido pelo Neon Auth."
                    : "O ambiente de produção aguarda a conexão com Neon e a configuração de acesso."}
                </p>
              </div>
              <div className="welcome-diagram" aria-hidden="true">
                <GitBranch size={116} strokeWidth={1} />
                <span>Desvio → Hipóteses → Evidências → Ações</span>
              </div>
            </section>
          ) : (
            <>
              {view === "dashboard" ? (
                <>
                  <section
                    className="metrics"
                    aria-label="Indicadores do laboratório"
                  >
                    {[
                      {
                        label: "Análises ativas",
                        value: data.analises.filter(
                          (a) => a.status !== "concluida",
                        ).length,
                        icon: FileText,
                        detail: "Investigações em curso",
                      },
                      {
                        label: "Hipóteses validadas",
                        value: data.hipoteses.length
                          ? format(
                              (data.hipoteses.filter(
                                (h) => h.estado === "validada",
                              ).length /
                                data.hipoteses.length) *
                                100,
                            ) + "%"
                          : "—",
                        icon: CheckCircle2,
                        detail: `${data.hipoteses.filter((h) => h.estado === "validada").length} de ${data.hipoteses.length} hipóteses`,
                      },
                      {
                        label: "Ações atrasadas",
                        value: data.acoes.filter(isOverdue).length,
                        icon: Clock3,
                        detail: "Prazo vencido e em aberto",
                      },
                      {
                        label: "Riscos altos ou críticos",
                        value: data.riscos.filter(
                          (r) =>
                            r.status !== "encerrado" &&
                            ["Alto", "Crítico"].includes(riskPriority(r).level),
                        ).length,
                        icon: ShieldAlert,
                        detail: "Precisam de atenção",
                      },
                      {
                        label: "Com medição comparável",
                        value: data.efeitos.filter(
                          (e) => e.melhora_percentual !== null,
                        ).length,
                        icon: Activity,
                        detail: "Antes e depois registrados",
                      },
                    ].map((m, i) => (
                      <article className="metric" key={m.label}>
                        <div>
                          <span>{m.label}</span>
                          <m.icon size={18} />
                        </div>
                        <strong className={i === 3 ? "risk-text" : ""}>
                          {m.value}
                        </strong>
                        <small>{m.detail}</small>
                      </article>
                    ))}
                  </section>
                  <div className="dashboard-grid">
                    <section className="panel comparison">
                      <div className="panel-heading">
                        <div>
                          <div className="eyebrow">APRENDIZADO COM DADOS</div>
                          <h2>O que mudou no processo?</h2>
                          <p>Comparação por indicador · efeito observado</p>
                        </div>
                        <BarChart3 size={21} />
                      </div>
                      {data.analises.length ? (
                        data.analises.slice(0, 4).map((a) => {
                          const e = data.efeitos.find(
                            (e) => e.analise_id === a.id,
                          );
                          const max = Math.max(
                            Math.abs(Number(e?.valor_antes ?? 0)),
                            Math.abs(Number(e?.valor_depois ?? 0)),
                            Math.abs(Number(a.meta_valor)),
                            1,
                          );
                          return (
                            <div className="comparison-item" key={a.id}>
                              <div className="comparison-title">
                                <strong>{a.titulo}</strong>
                                <span>
                                  {a.indicador} · {a.unidade}
                                </span>
                              </div>
                              {["antes", "depois"].map((m, i) => {
                                const val =
                                    e?.[i ? "valor_depois" : "valor_antes"],
                                  sample =
                                    e?.[i ? "amostra_depois" : "amostra_antes"];
                                return (
                                  <div className="bar-row" key={m}>
                                    <span>{name(m)}</span>
                                    <div className="bar-track">
                                      <div
                                        className={`bar ${i ? "after" : ""}`}
                                        style={{
                                          width:
                                            val !== null && val !== undefined
                                              ? Math.max(
                                                  2,
                                                  (Math.abs(Number(val)) /
                                                    max) *
                                                    100,
                                                ) + "%"
                                              : "0%",
                                        }}
                                      />
                                    </div>
                                    <strong>
                                      {val !== null && val !== undefined
                                        ? format(val) + a.unidade
                                        : "—"}
                                    </strong>
                                    <small>
                                      {sample
                                        ? `n=${sample}${sample < 10 ? " · baixa confiança" : ""}`
                                        : "Sem amostra"}
                                    </small>
                                  </div>
                                );
                              })}
                              <div className="effect-summary">
                                {e?.melhora_percentual !== null &&
                                e?.melhora_percentual !== undefined ? (
                                  <>
                                    <ArrowDownRight size={17} />
                                    <strong>
                                      {format(e.melhora_percentual)}% de{" "}
                                      {Number(e.melhora_percentual) >= 0
                                        ? "melhora"
                                        : "piora"}{" "}
                                      observada
                                    </strong>
                                    <span>
                                      Meta: {format(a.meta_valor)}
                                      {a.unidade}
                                    </span>
                                  </>
                                ) : (
                                  <span>
                                    Aguardando medições antes e depois.
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <Empty
                          title="Ainda não há medições"
                          action={
                            <Button onClick={() => add("analises")}>
                              Criar análise
                            </Button>
                          }
                        >
                          As comparações aparecem quando você registra as
                          amostras antes e depois.
                        </Empty>
                      )}
                      <p className="data-note">
                        A variação observada não comprova causalidade. Considere
                        amostra, período e mudanças simultâneas.
                      </p>
                    </section>
                    <section className="panel next-steps">
                      <div className="panel-heading">
                        <div className="eyebrow">FOCO DA INVESTIGAÇÃO</div>
                        <Target size={20} />
                      </div>
                      <h2>
                        O próximo passo
                        <br />é fazer a pergunta certa.
                      </h2>
                      <p>
                        Observe o processo, registre o desvio e procure
                        evidências que também possam refutar sua hipótese.
                      </p>
                      <ol>
                        <li>
                          <span>1</span>
                          <div>
                            <strong>Defina o desvio</strong>
                            <small>Qual indicador saiu do esperado?</small>
                          </div>
                        </li>
                        <li>
                          <span>2</span>
                          <div>
                            <strong>Investigue as conexões</strong>
                            <small>Sete dimensões, sem culpabilização.</small>
                          </div>
                        </li>
                        <li>
                          <span>3</span>
                          <div>
                            <strong>Teste antes de agir</strong>
                            <small>
                              Uma contramedida exige uma causa validada.
                            </small>
                          </div>
                        </li>
                      </ol>
                      <Button
                        onClick={() =>
                          setView(analysis ? "diagrama" : "analises")
                        }
                      >
                        Abrir investigação <ArrowRight size={17} />
                      </Button>
                    </section>
                  </div>
                  {table}
                  <div className="dashboard-grid bottom-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Dimensões mais recorrentes</h2>
                          <p>
                            Pareto por ocorrências registradas nas hipóteses
                          </p>
                        </div>
                      </div>
                      <Pareto data={data} />
                    </section>
                    <section className="panel">
                      <h2>Qualidade do plano</h2>
                      <p className="muted">Distribuição de contramedidas</p>
                      {["contencao", "corretiva", "preventiva"].map((t) => (
                        <div className="profile-row" key={t}>
                          <span>{name(t)}</span>
                          <div className="bar-track">
                            <div
                              className="bar"
                              style={{
                                width: data.acoes.length
                                  ? (data.acoes.filter((a) => a.tipo === t)
                                      .length /
                                      data.acoes.length) *
                                      100 +
                                    "%"
                                  : "0%",
                              }}
                            />
                          </div>
                          <strong>
                            {data.acoes.filter((a) => a.tipo === t).length}
                          </strong>
                        </div>
                      ))}
                      <div className="recurrence">
                        <strong>Recorrência</strong>
                        <span>
                          {recurrenceClosed.size
                            ? format(
                                (recurrenceReopened.size /
                                  recurrenceClosed.size) *
                                  100,
                              ) + "%"
                            : "Aguardando ciclos concluídos"}
                        </span>
                      </div>
                      <p className="data-note">
                        Análises reabertas entre as que já foram concluídas.
                      </p>
                    </section>
                  </div>
                </>
              ) : null}
              {view === "analises" ? table : null}
              {["diagrama", "riscos", "acoes"].includes(view) ? (
                <>
                  <section className="analysis-selector">
                    <label htmlFor="active-analysis">INVESTIGAÇÃO ATIVA</label>
                    <select
                      id="active-analysis"
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      <option value="" disabled>
                        Selecione uma análise
                      </option>
                      {data.analises.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.titulo}
                        </option>
                      ))}
                    </select>
                    {analysis ? <Status value={analysis.status} /> : null}
                  </section>
                  {!analysis ? (
                    <Empty
                      title="Selecione ou crie uma análise"
                      action={
                        <Button tone="primary" onClick={() => add("analises")}>
                          Criar análise
                        </Button>
                      }
                    >
                      Causas, hipóteses, riscos e ações ficam vinculados a uma
                      investigação.
                    </Empty>
                  ) : (
                    <>
                      {view === "diagrama" ? (
                        <>
                          <section className="problem-brief">
                            <span className="brief-icon">
                              <Target size={24} />
                            </span>
                            <div>
                              <div className="eyebrow">
                                O DESVIO QUE ESTAMOS INVESTIGANDO
                              </div>
                              <h2>{analysis.titulo}</h2>
                              <p>{analysis.desvio}</p>
                              <small>
                                {analysis.indicador}:{" "}
                                {format(analysis.baseline_valor)}
                                {analysis.unidade} → meta{" "}
                                {format(analysis.meta_valor)}
                                {analysis.unidade} ·{" "}
                                {dateLabel(analysis.baseline_inicio)} a{" "}
                                {dateLabel(analysis.baseline_fim)}
                              </small>
                            </div>
                            <Button
                              aria-label="Editar análise ativa"
                              onClick={() => edit("analises", analysis)}
                            >
                              <Pencil size={17} />
                            </Button>
                          </section>
                          <section className="panel">
                            <div className="panel-heading">
                              <div>
                                <h2>Mapa de causas e conexões</h2>
                                <p>
                                  Selecione uma causa para explorar os porquês e
                                  as evidências.
                                </p>
                              </div>
                              <span className="subtle-chip">7 dimensões</span>
                            </div>
                            <Fishbone
                              analysis={analysis}
                              causes={children("causas")}
                              hypotheses={children("hipoteses")}
                              onCause={setCause}
                              onDimension={(d) =>
                                setEditor({
                                  entity: "causas",
                                  seed: { dimensao: d },
                                })
                              }
                            />
                          </section>
                          <section className="panel">
                            <div className="panel-heading">
                              <div>
                                <h2>Hipóteses e evidências</h2>
                                <p>
                                  A pontuação orienta a investigação; a
                                  evidência decide a validação.
                                </p>
                              </div>
                              <Button
                                onClick={() => add("hipoteses")}
                                disabled={!children("causas").length}
                              >
                                <Plus size={16} />
                                Nova hipótese
                              </Button>
                            </div>
                            {children("hipoteses").length ? (
                              children("hipoteses")
                                .sort((a, b) => b.score - a.score)
                                .map((h) => (
                                  <article className="hypothesis" key={h.id}>
                                    <div className="score">
                                      <strong>{h.score}</strong>
                                      <small>de 125</small>
                                    </div>
                                    <div>
                                      <div className="hypothesis-top">
                                        <Status value={h.estado} />
                                        <span className="muted">
                                          {name(
                                            data.causas.find(
                                              (c) => c.id === h.causa_id,
                                            )?.dimensao ?? "",
                                          )}
                                        </span>
                                      </div>
                                      <h3>{h.enunciado}</h3>
                                      <p>{h.evidencia_necessaria}</p>
                                      <small>
                                        Fonte: {h.fonte_evidencia} · Impacto{" "}
                                        {h.impacto} × Evidência{" "}
                                        {h.forca_evidencia} × Viabilidade{" "}
                                        {h.viabilidade}
                                      </small>
                                      {h.resultado_teste ? (
                                        <blockquote>
                                          {h.resultado_teste}
                                        </blockquote>
                                      ) : null}
                                    </div>
                                    <Button
                                      aria-label={
                                        "Editar hipótese: " + h.enunciado
                                      }
                                      onClick={() => edit("hipoteses", h)}
                                    >
                                      <Pencil size={17} />
                                    </Button>
                                  </article>
                                ))
                            ) : (
                              <Empty title="O que poderia explicar o desvio?">
                                Adicione uma causa no diagrama e formule uma
                                hipótese testável.
                              </Empty>
                            )}
                          </section>
                          <section className="panel">
                            <div className="panel-heading">
                              <div>
                                <h2>Medições antes e depois</h2>
                                <p>
                                  Todo valor precisa de amostra e data de
                                  referência.
                                </p>
                              </div>
                              <Button onClick={() => add("medicoes")}>
                                <Plus size={16} />
                                Registrar medição
                              </Button>
                            </div>
                            <div className="record-grid">
                              {children("medicoes").map((m) => (
                                <article className="measurement" key={m.id}>
                                  <div>
                                    <Status value={m.momento} />
                                    <Button
                                      aria-label={
                                        "Editar medição " +
                                        name(m.momento) +
                                        " " +
                                        dateLabel(m.data_ref)
                                      }
                                      onClick={() => edit("medicoes", m)}
                                    >
                                      <Pencil size={15} />
                                    </Button>
                                  </div>
                                  <strong>
                                    {format(m.valor)}
                                    <small>{analysis.unidade}</small>
                                  </strong>
                                  <p>
                                    n={m.amostra} · {dateLabel(m.data_ref)}
                                  </p>
                                  <small>
                                    P50: {format(m.p50)} · P85: {format(m.p85)}
                                  </small>
                                  {Number(m.amostra) < 10 ? (
                                    <p className="warning-text">
                                      Baixa confiança: amostra menor que 10.
                                    </p>
                                  ) : null}
                                </article>
                              ))}
                            </div>
                            {!children("medicoes").length ? (
                              <Empty title="Registre o ponto de partida">
                                Uma medição antes permite comparar o resultado
                                futuro.
                              </Empty>
                            ) : null}
                          </section>
                          <section className="panel">
                            <h2>Histórico da investigação</h2>
                            {data.historico
                              .filter((h) => h.analise_id === selected)
                              .slice(-12)
                              .reverse()
                              .map((h) => (
                                <p className="history-row" key={h.id}>
                                  {name(h.entidade)}:{" "}
                                  {name(h.anterior ?? "criado")} →{" "}
                                  {name(h.atual)}
                                  <small>
                                    {new Intl.DateTimeFormat("pt-BR", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                      timeZone: "America/Sao_Paulo",
                                    }).format(new Date(h.criado_em))}{" "}
                                    · Brasília
                                  </small>
                                </p>
                              ))}
                            {!data.historico.some(
                              (h) => h.analise_id === selected,
                            ) ? (
                              <p className="muted">
                                Mudanças de estado aparecerão aqui.
                              </p>
                            ) : null}
                          </section>
                        </>
                      ) : null}
                      {view === "riscos" ? (
                        <>
                          <div className="risk-layout">
                            <section className="panel">
                              <h2>Matriz de exposição</h2>
                              <p className="muted">
                                Severidade ↑ · Probabilidade →
                              </p>
                              <div className="risk-matrix">
                                {[5, 4, 3, 2, 1].flatMap((s) =>
                                  [1, 2, 3, 4, 5].map((p) => {
                                    const count = children("riscos").filter(
                                      (r) =>
                                        r.status !== "encerrado" &&
                                        r.severidade === s &&
                                        r.probabilidade === p,
                                    ).length;
                                    return (
                                      <div
                                        key={`${s}-${p}`}
                                        className={`risk-cell risk-${s * p >= 20 ? "critical" : s * p >= 12 ? "high" : s * p >= 6 ? "medium" : "low"}`}
                                        title={`Severidade ${s}, probabilidade ${p}, exposição ${s * p}: ${count} riscos`}
                                      >
                                        <small>
                                          {s} × {p}
                                        </small>
                                        <strong>{count || "·"}</strong>
                                      </div>
                                    );
                                  }),
                                )}
                              </div>
                              <p className="data-note">
                                Categorias críticas com severidade 5 são
                                promovidas a crítico, mesmo com exposição baixa.
                              </p>
                            </section>
                            <section className="panel">
                              <h2>Riscos da investigação</h2>
                              {children("riscos")
                                .sort((a, b) => b.exposicao - a.exposicao)
                                .map((r) => {
                                  const priority = riskPriority(r);
                                  return (
                                    <article className="risk-card" key={r.id}>
                                      <div className="risk-card-top">
                                        <span
                                          className={`priority ${priority.level === "Crítico" ? "critical" : ""}`}
                                        >
                                          {priority.level} · {r.exposicao}/25
                                        </span>
                                        <Button
                                          aria-label={
                                            "Editar risco: " + r.descricao
                                          }
                                          onClick={() => edit("riscos", r)}
                                        >
                                          <Pencil size={16} />
                                        </Button>
                                      </div>
                                      <h3>{r.descricao}</h3>
                                      <p>
                                        {name(r.categoria)} · {name(r.resposta)}{" "}
                                        · {name(r.status)}
                                      </p>
                                      <small>Responsável: {r.dono}</small>
                                      {priority.promoted ? (
                                        <p className="warning-text">
                                          Promovido pela categoria crítica e
                                          severidade máxima.
                                        </p>
                                      ) : null}
                                      {r.gatilho ? (
                                        <p className="data-note">
                                          Gatilho / justificativa: {r.gatilho}
                                        </p>
                                      ) : null}
                                    </article>
                                  );
                                })}
                              {!children("riscos").length ? (
                                <Empty title="Nenhum risco registrado">
                                  Considere o que poderia inviabilizar a
                                  investigação ou o experimento.
                                </Empty>
                              ) : null}
                            </section>
                          </div>
                        </>
                      ) : null}
                      {view === "acoes" ? (
                        <>
                          <div className="action-tip">
                            <CheckCircle2 size={20} />
                            <span>
                              Contramedidas só podem apontar para hipóteses
                              validadas por evidência.
                            </span>
                          </div>
                          {children("acoes").length ? (
                            <div className="action-grid">
                              {children("acoes").map((a) => (
                                <article
                                  className="panel action-card"
                                  key={a.id}
                                >
                                  <div className="action-card-top">
                                    <Status value={a.status} />
                                    <Button
                                      aria-label={"Editar ação: " + a.o_que}
                                      onClick={() => edit("acoes", a)}
                                    >
                                      <Pencil size={17} />
                                    </Button>
                                  </div>
                                  <small className="eyebrow">
                                    {name(a.tipo).toUpperCase()}
                                  </small>
                                  <h2>{a.o_que}</h2>
                                  <dl>
                                    <dt>Por quê</dt>
                                    <dd>{a.por_que}</dd>
                                    <dt>Quem</dt>
                                    <dd>{a.quem}</dd>
                                    <dt>Onde</dt>
                                    <dd>{a.onde}</dd>
                                    <dt>Como</dt>
                                    <dd>{a.como}</dd>
                                    <dt>Quanto</dt>
                                    <dd>{a.quanto}</dd>
                                    <dt>Prazo</dt>
                                    <dd className={isOverdue(a) ? "bad" : ""}>
                                      {dateLabel(a.quando)}
                                      {isOverdue(a) ? " · Atrasada" : ""}
                                    </dd>
                                  </dl>
                                  <p className="data-note">
                                    Causa validada:{" "}
                                    {
                                      data.hipoteses.find(
                                        (h) => h.id === a.hipotese_id,
                                      )?.enunciado
                                    }
                                  </p>
                                  {a.efeito_observado ? (
                                    <blockquote>
                                      {a.efeito_observado}
                                    </blockquote>
                                  ) : null}
                                </article>
                              ))}
                            </div>
                          ) : (
                            <Empty
                              title="Da causa validada à contramedida"
                              action={
                                <Button
                                  tone="primary"
                                  onClick={() => add("acoes")}
                                >
                                  Criar ação 5W2H
                                </Button>
                              }
                            >
                              Valide uma hipótese e defina o que fazer, por quê,
                              quem, onde, quando, como e quanto.
                            </Empty>
                          )}
                        </>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}
              <footer className="page-footer">
                <span>
                  Causa Raiz La <span>·</span> Investigar. Aprender. Evoluir.
                </span>
                {usable ? (
                  <div>
                    <Button onClick={exportData}>
                      <Download size={15} />
                      Exportar dados
                    </Button>
                    <Button onClick={() => window.print()}>
                      <FileText size={15} />
                      Imprimir relatório
                    </Button>
                  </div>
                ) : null}
              </footer>
            </>
          )}
        </main>
      </div>
      {notification ? (
        <Notice {...notification} onClose={() => setNotification(null)} />
      ) : null}
      {editor ? (
        <Editor
          entity={editor.entity}
          row={editor.row}
          seed={editor.seed}
          data={data}
          analysis={selected}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      ) : null}
      {cause ? (
        <Modal title="Causa e cadeia de porquês" onClose={() => setCause(null)}>
          <div className="form-body">
            <span className="eyebrow">{name(cause.dimensao)}</span>
            <h3>{cause.causa}</h3>
            <ol className="why-list">
              {cause.porques.map((p: string, i: number) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
            {!cause.porques.length ? (
              <p className="muted">Nenhum porquê registrado ainda.</p>
            ) : null}
            <h4>Subcausas</h4>
            {data.causas
              .filter((c) => c.parent_id === cause.id)
              .map((c) => (
                <p key={c.id}>{c.causa}</p>
              ))}
            <p className="muted">Origem: {name(cause.origem)}</p>
          </div>
          <footer className="modal-footer">
            <Button
              onClick={() => {
                setCause(null);
                edit("causas", cause);
              }}
            >
              Editar causa
            </Button>
          </footer>
        </Modal>
      ) : null}
      {showLogin ? (
        <Login
          onClose={() => setShowLogin(false)}
          onDone={() => {
            setShowLogin(false);
            void reload();
          }}
        />
      ) : null}
      {logout ? (
        <Modal title="Sair da demonstração?" onClose={() => setLogout(false)}>
          <div className="form-body">
            <p>
              Os registros desta demonstração serão descartados. Exporte os
              dados antes de sair se quiser guardar o exercício.
            </p>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setLogout(false)}>
              Continuar explorando
            </Button>
            <Button
              tone="warning"
              onClick={() => {
                setLogout(false);
                setDemo(false);
                setData(emptyData());
                setSelected("");
                void reload();
              }}
            >
              Sair da demonstração
            </Button>
          </footer>
        </Modal>
      ) : null}
    </div>
  );
}

function Pareto({ data }: { data: Data }) {
  const rows = dimensions
    .map((d) => ({
      name: name(d),
      freq: data.hipoteses
        .filter((h) =>
          data.causas.some((c) => c.id === h.causa_id && c.dimensao === d),
        )
        .reduce((s, h) => s + Number(h.frequencia), 0),
    }))
    .sort((a, b) => b.freq - a.freq);
  const total = rows.reduce((s, r) => s + r.freq, 0);
  let accumulated = 0;
  if (!total)
    return (
      <p className="muted">
        Registre ocorrências nas hipóteses para construir o Pareto.
      </p>
    );
  return (
    <div className="pareto">
      {rows.map((r) => {
        accumulated += r.freq;
        return (
          <div className="pareto-row" key={r.name}>
            <span>{r.name}</span>
            <div className="bar-track">
              <div
                className="bar"
                style={{ width: (r.freq / rows[0].freq) * 100 + "%" }}
              />
            </div>
            <strong>{r.freq}</strong>
            <small>{format((accumulated / total) * 100)}% acum.</small>
          </div>
        );
      })}
      <p className="data-note">
        Referência de concentração: 80% acumulado. Frequência descreve
        ocorrências, sem comprovar causalidade.
      </p>
    </div>
  );
}
function Login({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const client = useRef(createAuthClient());
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (sent && !/^\d{6}$/.test(code))
    ) {
      setError(
        sent ? "Informe o código de seis dígitos." : "Informe um email válido.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = sent
        ? await client.current.signIn.emailOtp({ email, otp: code })
        : await client.current.emailOtp.sendVerificationOtp({
            email,
            type: "sign-in",
          });
      if (result.error)
        throw Error(
          "Não foi possível concluir o acesso. Confira seu email e tente novamente.",
        );
      if (sent) onDone();
      else setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Entrar no laboratório" onClose={onClose} busy={busy}>
      <form noValidate onSubmit={submit}>
        <div className="form-body">
          <p>Use o email autorizado para acessar suas investigações.</p>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={sent}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="login-error"
          />
          {sent ? (
            <>
              <label htmlFor="login-code">Código enviado por email</label>
              <input
                id="login-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />
              <Button
                onClick={() => {
                  setSent(false);
                  setCode("");
                }}
              >
                Usar outro email
              </Button>
            </>
          ) : null}
          <p id="login-error" role="alert" className="field-error">
            {error}
          </p>
        </div>
        <footer className="modal-footer">
          <Button type="submit" tone="primary" busy={busy}>
            {sent ? "Verificar e entrar" : "Enviar código de acesso"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
