# Causa Raiz La

App web pessoal para investigar causas raiz com Ishikawa, evidências, riscos e contramedidas 5W2H. Baseado no [material Causa Raiz Lab](https://claude.ai/artifact/QK7mpBWaLFAPhvVUiPRw7c). Next.js App Router, React, PostgreSQL no **Neon**, Neon Auth e deploy na **Vercel**. A migração para Neon foi solicitada durante a construção; o app não depende do Supabase.

## Funcionalidades

- Dashboard com análises ativas, validação, atrasos, riscos, antes/depois, amostras, Pareto e perfil de contramedidas.
- Análises com desvio, indicador, baseline, meta, direção e período.
- Ishikawa SVG com sete dimensões, causas, subcausas, porquês e alternativa em lista acessível.
- Hipóteses priorizadas, validação/refutação com evidências e score gerado no banco.
- Riscos 5×5, promoção por categoria crítica, aceite justificado e responsável.
- Plano 5W2H apenas em hipóteses validadas, com efeito obrigatório para concluir.
- Medições com amostras, P50/P85, efeito observado e histórico de estados.
- Controle de versão para evitar sobrescrita, RLS, tema claro/escuro, exportação JSON e impressão da área atual.
- Demonstração explícita em memória: dados fictícios e descartáveis, sem gravação na nuvem.

## Rodar localmente

Requer Node 22+ e pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://localhost:3000`. Sem variáveis de ambiente a interface informa que a produção ainda não está conectada e oferece a demonstração. Isso não representa um banco criado nem um deploy.

## Neon e acesso pessoal

1. Na conta do proprietário, crie o projeto **Causa-Raiz-La** e o banco **Causa-Raiz-La** no Neon. Escolha região próxima ao uso e à região de funções da Vercel.
2. Ative Neon Auth no branch de produção. Habilite login por código de email e cadastre/verifique o email do proprietário no provedor. Cadastros de outras contas não dão acesso aos dados: a API exige email verificado igual a `ALLOWED_EMAIL`.
3. Copie `.env.example` para `.env.local` e configure em ambiente seguro. Não envie credenciais em chats ou versionamento.

| Variável                | Uso                                                                |
| ----------------------- | ------------------------------------------------------------------ |
| DATABASE_URL            | URL com pooler do Neon, apenas no servidor                         |
| DIRECT_URL              | Conexão direta para migrações; não necessária no runtime da Vercel |
| NEON_AUTH_BASE_URL      | Endpoint do Neon Auth do branch                                    |
| NEON_AUTH_COOKIE_SECRET | Segredo aleatório com pelo menos 32 caracteres                     |
| ALLOWED_EMAIL           | Email verificado do proprietário                                   |

Gere o segredo com um gerenciador seguro ou `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e configure diretamente no ambiente. Não o coloque no código.

```sh
node --env-file=.env.local scripts/migrate.mjs
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Migrações estão em `db/migrations`, ordenadas e transacionais. `0004_neon_security.sql` cria `causa_raiz_app` sem login e sem bypass de RLS, concedendo essa role à identidade usada pelas migrações. Se a conexão de runtime usar outro usuário, conceda essa role especificamente a esse usuário no console. A API abre uma transação, assume essa role e aplica a identidade validada por Neon Auth via `set_config(..., true)`; consultas sem WHERE continuam sujeitas a RLS. A URL administrativa nunca chega ao navegador. `meus_times` e `criar_meu_espaco` têm privilégios restritos e search_path fixo.

## GitHub e Vercel

Crie o repositório privado **Causa-Raiz-La** na conta escolhida e envie esta pasta como raiz. `.env.local`, `node_modules`, `.next` e `.vercel` estão ignorados. O workflow verifica tipos, testes de banco, formatação e build.

Importe o repositório na Vercel, escolha Next.js e Node 22+, configure as variáveis de runtime e autorize a URL de produção como origem confiável no Neon Auth. Use a URL de produção no teste de login. Não configure DIRECT_URL no cliente ou com prefixo NEXT_PUBLIC. As migrações são aplicadas explicitamente, nunca ao atender uma requisição.

Previews devem usar outro branch do Neon com as migrações e endpoint de Auth correspondentes. Nenhum preview deve apontar ao branch de produção. A criação automática de branches por PR não está implementada: depende de conexão real das contas e configuração da integração Neon/Vercel.

## Verificação e limites

`pnpm test` executa as migrações completas em PostgreSQL local via PGlite e testa constraints, triggers, RLS, views e recuperação do contexto da transação. Isso não substitui os testes no Neon real, autenticação por email, carga concorrente e produção Vercel. Consulte `VERIFICATION.md` para os resultados desta entrega.

O efeito observado não é prova de causalidade. Amostras menores que 10 recebem sinalização de baixa confiança, uma heurística da aula, sem alegação de significância estatística. Não há copiloto de IA, importação Jira ou alerta automático de recorrência nesta versão. A recorrência mostrada usa histórico de mudanças explícitas; não inventa eventos anteriores ao uso do app.
