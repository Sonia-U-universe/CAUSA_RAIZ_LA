# Verificação da entrega local

Data: 15/10/2026. Produção externa ainda não configurada.

| Verificação                                                         | Resultado                                  |
| ------------------------------------------------------------------- | ------------------------------------------ |
| TypeScript, `tsc --noEmit`                                          | Passou                                     |
| Testes, `node --test --test-isolation=none tests/*.test.mjs`        | 30 passaram, 0 falhas                      |
| Compilação, `next build`                                            | Passou com verificação de tipos habilitada |
| Auditoria Premium, modo strict                                      | 0 erros, 0 avisos, 0 pendências            |
| DESIGN.md, CLI oficial designmd lint                                | 0 erros, 0 avisos                          |
| Inspeção de diálogos nativos JS, HTML injetado e div/span clicáveis | Nenhuma ocorrência                         |

Os testes de banco aplicam **todas as migrações do zero** em PGlite (PostgreSQL local). Verificam triggers, constraints, score, views com RLS, acesso indevido entre dois usuários, permissões de escrita, versões, contexto restrito à transação e invariantes de hipótese/ação. Incluem caminhos válidos e inválidos por SQL direto. O teste de domínio cobre direção da meta, datas reais, campos numéricos vazios, campos derivados e promoção de risco por categoria.

## Navegador real, demonstração

- Abertura sem banco configurado, estado de carregamento e convite explícito à demonstração.
- Criação de análise com datas DD/MM/AAAA; erros por campo e foco no primeiro campo inválido.
- Sete dimensões vazias, criação pela dimensão Requisitos e causa com porquês.
- Hipótese validada sem resultado recusada; gravação permitida após informar evidência.
- Criação de ação 5W2H vinculada à hipótese validada.
- Edição da ação: concluir sem efeito recusado, conclusão com efeito permitida.
- Risco aceito sem justificativa recusado; permitido com justificativa e gatilho.
- Medições antes/depois, comparação e marcação de baixa confiança com amostra 8.
- Encerramento de análise com medição depois registrada.
- Busca sem resultados, limpar busca e retorno de foco ao campo.
- Proteção de formulário com alterações, continuar editando e descarte.
- Temas claro/escuro e inspeção visual de capturas.
- Layout em desktop e largura efetiva de 668px, sem expansão horizontal do documento; diagrama rolando dentro do próprio painel. O navegador não aplicou a largura solicitada de 400px: 400px permanece pendente de verificação real.

## Limites e próximas verificações

Não foram executados login por email, migrações no Neon real, testes de API com sessão real, carga/conflitos em conexões concorrentes, envio ao GitHub ou deploy Vercel. Nenhuma credencial de produção foi fornecida nem persistida no projeto. Fluxos no navegador usaram dados fictícios em memória e não provam persistência externa.

Neon: o navegador recusou o acesso por permissão salva/política, inclusive após autorização textual do usuário. É necessário liberar o domínio nas permissões do navegador do Codex e autenticar a conta. GitHub exige login. Vercel e os vínculos das contas ainda precisam ser configurados. Não existe URL de produção nesta entrega.

Também permanecem pendentes impressão visual completa em papel/PDF, auditoria automatizada WCAG/screen reader, 200% de zoom, movimento reduzido e teste físico em celular. O código inclui as adaptações, sem alegar certificação de acessibilidade.
