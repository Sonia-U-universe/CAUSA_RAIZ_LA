---
version: alpha
colors:
  primary: "#2948A6"
  ink: "#172842"
  background: "#F3F6FA"
  surface: "#FFFFFF"
  success: "#18745C"
  warning: "#975A16"
typography:
  display:
    fontFamily: "Bahnschrift, Arial, sans-serif"
  body:
    fontFamily: "Segoe UI, Arial, sans-serif"
  data:
    fontFamily: "Consolas, monospace"
rounded:
  panel: "16px"
  control: "8px"
spacing:
  unit: "6px"
  panel: "24px"
---

## Overview

Laboratório de investigação para um Agile Master. Registro produto: clareza e densidade moderada. A assinatura é a espinha de peixe azul com sete dimensões, acompanhada de um painel de evidências. Evitar gamificação, culpabilização, aparência de slide ou landing page.

## Colors

CSS `src/app/globals.css` é a fonte canônica dos tokens (modelo B); os valores acima documentam os valores aceitos. `primary` → `--primary`, `ink` → `--ink`, `background` → `--bg`, `surface` → `--surface`, `success` → `--success`, `warning` → `--warning`. Componentes consomem variáveis. Vermelho significa erro/risco, nunca marca. Temas remapeiam sem alterar semântica.

## Typography

Display Bahnschrift com fallback Arial para títulos compactos; corpo Segoe UI para leitura; dados Consolas e números tabulares. Fontes locais evitam salto e dependência remota.

## Layout

Sidebar 230px, conteúdo fluido com máximo de 1600px. Painéis separados por 24px, escala de 6px. Abaixo de 900px, navegação horizontal e coluna única. Documento controla rolagem vertical; tabelas e diagrama possuem overflow horizontal interno. Formulários crescem naturalmente.

## Elevation & Depth

Painéis com borda discreta; sombra somente para diálogos e notificações.

## Shapes

Painéis 16px; controles 8px. Marcadores de hipótese usam forma e texto além de cor.

## Components

Button, Field, Modal e Notice em `src/components/ui.tsx` são os donos compartilhados de estados e acessibilidade. Scrollbars globais: thumb, track, hover e active em CSS, forced-colors nativo. Tokens de tipografia → `--font-display`, `--font-body`, `--font-data`; raios → `--radius-panel`, `--radius-control`; espaçamento → `--space-unit`, `--space-panel`.

## Do's and Don'ts

Mostrar amostra, lacunas e origem do dado. Nunca chamar observação de prova causal. Sem animação no diagrama. Respeitar movimento reduzido, foco visível e contraste nos dois temas.
