# Agenda Inteligente

Ferramenta pessoal do **Dono**: uma Conversa em português do Brasil que consulta Disponibilidade no Calendário e, depois de Confirmação, cria, altera ou cancela um Compromisso.

Na v1 a Conversa responde a Consulta, Marcação, “não” na Confirmação, Alteração e Cancelamento. O Dono escreve ou **dita no campo** (ditado nativo do iPhone, sem chave). O app é instalável na tela inicial e abre direto na Conversa. Sem credencial do Google o Calendário em memória (demonstração) continua no ar. Com OAuth configurado, o Dono conecta a conta uma vez; a Consulta lê as agendas visíveis e a Marcação grava só na principal.

## Rodar localmente

Requisitos: Node.js 22+ e npm.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). No iPhone, use o Safari na mesma rede ou o Tunel que preferir; a tela é pensada para viewport estreita.

Não é preciso configurar Google OAuth para desenvolver: o adaptador em memória já vem com Compromissos de demonstração alinhados à data atual (Cirurgia no próximo 7 de setembro, reunião com a Ana no próximo 15 de novembro). A tela avisa **modo demonstração** quando não há credencial Google.

### Calendário do celular (não é automático)

- O app **não** lê o Calendário nativo do iPhone (Apple Calendar / EventKit). A v1 usa **Google Calendar** via OAuth.
- No iPhone, se você já usa o Google Calendar (app ou conta sincronizada), conectar a conta Google aqui reflete no mesmo lugar.
- **Local / Vercel:** nada grava no seu calendário real até você configurar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no servidor **e** tocar em **Conectar conta Google** (aparece só quando a credencial existe). Cada pessoa autoriza a própria conta; o deploy não ganha acesso sozinho.
- **PWA na tela inicial** não muda isso: continua sendo web + Google OAuth, não vira app da App Store com permissão de Calendário da Apple.

Para o Calendário de verdade, copie `.env.example` para `.env.local`, preencha as variáveis (escopo `https://www.googleapis.com/auth/calendar`, URI de redirecionamento `https://<seu-dominio>/api/auth/google/callback` no Google Cloud Console) e use **Conectar conta Google** na Conversa. A sessão fica no cookie; a suíte automática não fala com a conta real.

**Datas na Conversa:** aceita `15/10`, `15 de outubro` e `15 de outubro de 2027`. Sem ano, usa a **próxima ocorrência futura** desse dia/mês (horário de Brasília).

**Marcação:** diga o horário (`15h`, `5:30`, `5:30h`, `5 horas`, `5 da manhã`) ou só o dia (`marcar reunião dia 20 de dezembro`) — sem horário a Conversa pede; depois da Confirmação, diga **sim** para gravar. Intervalos numéricos (`29/11 a 01/12`) cobrem só esses dias. No modo demonstração a gravação fica no calendário de exemplo.

**Alterar / apagar:** `alterar viagem do dia 29/11` (a Conversa pede o novo dia/horário) ou `alterar a viagem para os dias 29 a 31 de novembro`; `apagar viagem 29/11` ou `cancela a reunião da Ana` pedem Confirmação antes de remover.

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
- `src/adapters/transcritor-ditado-nativo.ts` — porta Transcritor (ditado nativo)
- `src/app/manifest.ts` — PWA: nome, ícones, `start_url` na Conversa
- `src/app/api/conversa/route.ts` — única entrada HTTP da Conversa
- `src/app/api/auth/google/` — OAuth e status da sessão
- `src/app/page.tsx` — tela da Conversa

Vocabulário e ADRs: `CONTEXT.md` e `docs/adr/`.
