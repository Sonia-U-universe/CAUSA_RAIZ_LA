# Causa Raiz La

App pessoal para um Agile Master investigar desvios de processos. Fonte: [Causa Raiz Lab, módulos 0, 2, 5–11](https://claude.ai/artifact/QK7mpBWaLFAPhvVUiPRw7c), consultada em 15/10/2026. Decisão atual do usuário: Neon substitui Supabase; repositório GitHub Causa-Raiz-La e deploy Vercel. Neon é o único banco de produção e desenvolvimento.

Separar hipótese, evidência e causa validada. Sete dimensões: processos, pessoas, tecnologia, requisitos, dependências, métricas e governança. Análises com desvio mensurável, baseline, meta, direção e período. Causas com subcausas e cadeia de porquês. Hipóteses com fatores 1–5 e score gerado. Validação/refutação exige resultado. Contramedidas apenas em hipóteses validadas; conclusão exige efeito observado. Riscos com exposição gerada, aceite justificado e promoção de categorias críticas. Medições exigem amostra positiva e percentis coerentes. Comparação representa efeito observado, nunca prova causal. Não há ranking de pessoas.

Privacidade: login obrigatório em produção, sem cadastro público na interface. Dados isolados por workspace pessoal e RLS. Usuário autenticado cria seu próprio espaço por função controlada; não há convite ou edição de membros na interface. Cadastro de usuário deve ser feito pelo proprietário do projeto Neon. Nenhum segredo administrativo no código.

Modo demonstração explícito: dados sintéticos em memória, modificações descartadas ao recarregar, nenhuma informação enviada ao Neon. Produção não cai em demo silenciosamente. Exportação JSON e impressão são ações explícitas. Nenhuma exclusão definitiva pela interface. Histórico de alterações no banco, controle de versão para concorrência e atualização explícita para recuperar conflitos.
