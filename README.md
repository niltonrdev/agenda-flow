# Agenda Inteligente

Ferramenta pessoal do **Dono**: uma Conversa em português do Brasil que consulta Disponibilidade no Calendário e, depois de Confirmação, cria, altera ou cancela um Compromisso.

Na v1 a Conversa responde a Consulta, Marcação, “não” na Confirmação, Alteração e Cancelamento. O Dono escreve ou **dita no campo** (ditado nativo do iPhone). O app é instalável na tela inicial e abre direto na Conversa (`/conversa`). Sem credencial Google usa Calendário em memória (demonstração); com OAuth, a Consulta lê as agendas visíveis e a Marcação grava na principal.

Páginas públicas (abrem sem login, exigidas na verificação OAuth do Google):

- `/` — homepage
- `/privacidade` — política de privacidade
- `/termos` — termos de uso
- `/conversa` — o app (Google ou demonstração só consulta)

Origem canônica de produção: `https://agendainteligente.net.br` (apex; `www` deve redirecionar para o apex no painel da Vercel/DNS). Variáveis: `.env.example`. E-mail de contato: constante `CONTATO_EMAIL` em `src/lib/contato.ts` (`niltonrdonascimento@gmail.com`); `NEXT_PUBLIC_CONTATO_EMAIL` só se quiser sobrescrever.

## Rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) (homepage) ou [http://localhost:3000/conversa](http://localhost:3000/conversa). Variáveis opcionais: `.env.example` → `.env.local`.

## Testar

```bash
npm test
```

## Scripts

| Comando         | O que faz                         |
| --------------- | --------------------------------- |
| `npm run dev`   | Sobe o Next.js em desenvolvimento |
| `npm test`      | Roda a suíte Vitest uma vez       |
| `npm run build` | Build de produção                 |
| `npm run lint`  | ESLint                            |

## Estrutura

- `src/domain/` — núcleo (interpretador, entrada de conversa, Compromisso)
- `src/adapters/` — Calendário em memória, Google e Transcritor
- `src/app/` — homepage pública, Conversa, PWA e rotas da API

Vocabulário e ADRs: `CONTEXT.md` e `docs/adr/`.
