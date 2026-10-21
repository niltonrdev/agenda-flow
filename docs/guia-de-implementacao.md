# Guia de implementação — Agenda Inteligente v1

Como seguir depois do grill / spec / tickets. Cada ticket = **uma conversa nova** de Cloud Agent. Não implemente dois tickets na mesma janela.

## Onde estamos

**v1 completa na `main`.** Os dez tickets foram mergeados (PRs #1–#10). Suíte: 105 testes passando.

| Ticket | Status | Onde |
| --- | --- | --- |
| 01 Consulta de um dia | **feito** | `main` |
| 02 Consulta de intervalo | **feito** | `main` |
| 03 Marcação de Pontual | **feito** | `main` |
| 04 Marcação de Período | **feito** | `main` |
| 05 Alerta de conflito | **feito** | `main` (#5) |
| 06 “Não” na Confirmação | **feito** | `main` (#6) |
| 07 Alteração | **feito** | `main` (#7) |
| 08 Cancelamento | **feito** | `main` (#9) |
| 09 Áudio e tela inicial | **feito** | `main` (#8) |
| 10 Conta Google | **feito** | `main` (#10) |

Não há próximo `/implement` da v1. Trabalho novo = novo grill / spec / tickets, ou correção pontual.

## Como pedir um ticket (referência)

1. Abra um **Cloud Agent novo** neste repo (`agenda-flow`), na branch `main`.
2. Cole a referência completa: `/implement .scratch/agenda-inteligente/issues/NN-slug.md`
3. Deixe o agente fazer TDD, commit e push na branch dele.
4. **Você** revisa o diff, faz o merge na `main` e marca o ticket (`Status: done`). O skill `/implement` **não** fecha o ticket.

## Dependências (quem liberou quem)

```
01 ──┬── 02 ──┐
     │        ├── 04 ── 05 ──┐
     ├── 03 ──┤              ├── 07 ── 08 ── 10
     │        └── 06 ────────┘
     └── 09
```

| Ticket | Bloqueado por | Entrega |
| --- | --- | --- |
| 01 | — | Consulta de um dia + esqueleto do app |
| 02 | 01 | Consulta de intervalo (caso pescaria × cirurgia) |
| 03 | 01 | Marcação de Pontual + Confirmação |
| 04 | 02, 03 | Marcação de Período |
| 05 | 04 | Alerta de conflito |
| 06 | 03 | “Não” na Confirmação e correção |
| 07 | 05, 06 | Alteração com desambiguação |
| 08 | 07 | Cancelamento |
| 09 | 01 | Áudio (ditado) + app na tela inicial |
| 10 | 08 | Conta Google de verdade |

## Depois do merge de cada ticket

No arquivo do ticket em `.scratch/agenda-inteligente/issues/`:

1. Troque `Status:` para `done`.
2. Confirme os critérios com `[x]`.
3. Atualize a tabela “Onde estamos” neste guia.

## Artefatos do fluxo (não são código)

| Caminho | O que é |
| --- | --- |
| `CONTEXT.md` | Glossário do domínio |
| `docs/adr/` | Decisões duras |
| `.scratch/agenda-inteligente/spec.md` | Spec da v1 |
| `.scratch/agenda-inteligente/issues/` | Tickets |
| `docs/agents/issue-tracker.md` | Como o tracker local funciona |

Dúvida de qual skill usar: `/ask-matt`. Trabalho grande demais para uma sessão: `/wayfinder`.
