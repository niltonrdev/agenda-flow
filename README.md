# Agenda Inteligente

Ferramenta pessoal do **Dono**: uma Conversa em português do Brasil que consulta Disponibilidade no Calendário e, depois de Confirmação, cria, altera ou cancela um Compromisso.

A Conversa consulta Disponibilidade e, depois da Confirmação, marca, altera ou cancela Compromissos. Sem credencial do Google o Calendário em memória (demonstração) continua no ar. Com OAuth configurado, o Dono conecta a conta uma vez; a Consulta lê as agendas visíveis e a Marcação grava só na principal.

## Rodar localmente

Requisitos: Node.js 22+ e npm.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). No iPhone, use o Safari na mesma rede ou o Tunel que preferir; a tela é pensada para viewport estreita.

Não é preciso configurar Google OAuth para desenvolver: o adaptador em memória já vem com Compromissos de demonstração alinhados à data atual (Cirurgia no próximo 7 de setembro, reunião com a Ana no próximo 15 de novembro).

Para o Calendário de verdade, copie `.env.example` para `.env.local`, preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (escopo `https://www.googleapis.com/auth/calendar`, URI de redirecionamento `/api/auth/google/callback`) e use **Conectar conta Google** na tela da Conversa. A sessão fica no cookie; a suíte automática não fala com a conta real.

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
- `src/adapters/calendario-google.ts` — adaptador Google (fora da suíte automática)
- `src/app/api/conversa/route.ts` — única entrada HTTP da Conversa
- `src/app/api/auth/google/` — OAuth e status da sessão
- `src/app/page.tsx` — tela da Conversa

Vocabulário e ADRs: `CONTEXT.md` e `docs/adr/`.
