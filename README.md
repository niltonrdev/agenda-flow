# Agenda Inteligente

Ferramenta pessoal do **Dono**: uma Conversa em português do Brasil que consulta Disponibilidade no Calendário e, depois de Confirmação, cria, altera ou cancela um Compromisso.

Na v1 a Conversa responde a **Consulta de um dia** e a **Consulta de intervalo** — “15 de novembro”, “pescaria do dia 4 ao 7”, “feriado de 7 de setembro”, “esse fim de semana” — usando um Calendário em memória semeado, sem nenhuma credencial do Google.

## Rodar localmente

Requisitos: Node.js 22+ e npm.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). No iPhone, use o Safari na mesma rede ou o Tunel que preferir; a tela é pensada para viewport estreita.

Não é preciso configurar Google OAuth para desenvolver: o adaptador em memória já vem com Compromissos de demonstração alinhados à data atual (Cirurgia no próximo 7 de setembro, reunião com a Ana no próximo 15 de novembro).

## Testar

```bash
npm test
```

Os testes passam um “agora” explícito em `America/Sao_Paulo` e exercitam a **entrada de conversa** com o Calendário em memória. Nomes e asserções usam o vocabulário do domínio (`CONTEXT.md`).

## Scripts

| Comando        | O que faz                          |
| -------------- | ---------------------------------- |
| `npm run dev`  | Sobe o Next.js em desenvolvimento  |
| `npm test`     | Roda a suíte Vitest uma vez        |
| `npm run build`| Build de produção                  |
| `npm run lint` | ESLint                             |

## Estrutura relevante

- `src/domain/` — núcleo determinístico (interpretador, entrada de conversa, Compromisso)
- `src/adapters/calendario-em-memoria.ts` — porta Calendário para testes e demo
- `src/app/api/conversa/route.ts` — única entrada HTTP da Conversa
- `src/app/page.tsx` — tela da Conversa

Vocabulário e ADRs: `CONTEXT.md` e `docs/adr/`.
