# Contrato de interação

Fonte das regras: `PRODUCT.md`, derivada dos módulos 2, 5, 6, 8 e 9 da aula. Identidade visual: `DESIGN.md`. Uso pessoal com workspace privado. Sem faturamento ou exclusão definitiva. Política legal e retenção adicional fora do escopo; não inventar textos legais.

## Canonical UI Map

| Capability     | Canonical owner                             | Source of truth | Allowed variants                             | Verification            |
| -------------- | ------------------------------------------- | --------------- | -------------------------------------------- | ----------------------- |
| Select/Listbox | Field em src/components/ui.tsx              | Este contrato   | native; popup de sistema aceito              | teclado/browser         |
| Date           | Field em src/components/ui.tsx              | Este contrato   | typed; DD/MM/AAAA na interface, ISO no banco | datas e browser         |
| Form           | Editor em src/components/editor.tsx e Field | PRODUCT.md      | criar, editar, validar                       | typecheck e browser     |
| Scrollbar      | src/app/globals.css                         | DESIGN.md       | global                                       | inspeção CSS/browser    |
| Toast          | Notice em src/components/ui.tsx             | Este contrato   | sucesso, erro                                | live region             |
| CRUD           | src/lib/repository.ts                       | PRODUCT.md      | criar/editar, sem exclusão                   | testes de banco/browser |

Listas: paginação local de 8 itens após busca local; visão consolidada do workspace pessoal em uma transação, sem limite artificial da API REST. Busca e seleção mantidas na URL apenas quando não contêm conteúdo de análise; busca é deliberadamente transitória para não vazar descrições em histórico/links. Filtros de navegação persistem em URL. Busca local imediata, limpar devolve foco ao campo. Não há seleção em lote.

Salvar cria/edita, aguarda confirmação do servidor, fecha editor, atualiza lista, mantém análise selecionada e anuncia sucesso. Erro mantém campos e editor abertos; não há retry automático de escrita. UUID de criação gerado uma vez por editor torna repetição identificável. Atualizações com versão anterior; conflito solicita atualizar e preservar texto antes de tentar novamente. Sem serviço administrativo; API no servidor com Neon Auth, identidade por transação e role causa_raiz_app sujeita a RLS. Sessão gerenciada pelo Neon Auth com cookies de servidor; nenhum token de banco no navegador. Expiração mantém editor em memória e permite novo login.

Modal nativo HTML dialog, nome acessível, foco inicial, background inert, foco restaurado; Escape/cancelar com alterações exige confirmação própria de descarte. Fechar janela usa beforeunload apenas com alterações. Campos noValidate, erros associados e foco no primeiro inválido; senha não é solicitada no app, login por código de email. Busy bloqueia duplicatas. Formulários e diálogos com erro persistente e opção de tentar novamente.

Estados: carregando com spinner e espaço reservado, vazio com próximo passo, sem resultados com limpar busca, falha com tentar novamente. Números pt-BR, datas date-only sem conversão UTC, fuso America/Sao_Paulo em registros de horário. Teclado e tema claro/escuro. SVG com alternativa em lista, sete dimensões mesmo vazias. Estado de hipótese usa rótulo e marcador diferente. Impressão com informações completas e sem navegação.

Mudança de status de análise é explícita. Concluir exige medição depois, concluir ação exige efeito. Reabrir não apaga medições e gera evento no histórico. Recorrência = análises alguma vez reabertas / análises alguma vez concluídas, vindo de histórico; não exibir quando denominador zero. Sem automação de recorrência nesta versão.
