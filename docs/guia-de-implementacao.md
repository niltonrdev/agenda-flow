# Guia de implementação — Agenda Inteligente v1

Como seguir depois do grill / spec / tickets. Cada ticket = **uma conversa nova** de Cloud Agent. Não implemente dois tickets na mesma janela.

## Onde estamos

| Ticket | Status | Onde |
| --- | --- | --- |
| 01 Consulta de um dia | **feito** (na `main`) | mergeado |
| 02 Consulta de intervalo | **próximo** | branch `cursor/consulta-de-intervalo-3cf7` já tem o código; ainda **não** está na `main` |
| 03–10 | prontos, bloqueados conforme a tabela abaixo | ainda não começados |

Se você achou que o 02 já tinha entrado: revise o PR/merge dessa branch, ou rode `/implement` de novo (o agente parte da `main` atual).

## Como pedir o próximo ticket

1. Abra um **Cloud Agent novo** neste repo (`agenda-flow`), na branch `main`.
2. Cole **só um** dos blocos abaixo (referência completa do arquivo — não use só `#03`).
3. Deixe o agente fazer TDD, commit e push na branch dele.
4. **Você** revisa o diff, faz o merge na `main` e marca o ticket (`Status: done`). O skill `/implement` **não** fecha o ticket.

## Ordem e comandos (cole na conversa nova)

### Próximo agora → 02

```
/implement .scratch/agenda-inteligente/issues/02-consulta-de-intervalo.md
```

*(Alternativa: se a branch `cursor/consulta-de-intervalo-3cf7` ainda existir com o trabalho completo, abra o PR e mergeie na `main` em vez de reimplementar.)*

### Depois do 02 → 03 e 09 em paralelo (conversas **separadas**)

```
/implement .scratch/agenda-inteligente/issues/03-marcacao-de-pontual.md
```

```
/implement .scratch/agenda-inteligente/issues/09-audio-e-tela-inicial.md
```

### Cadeia linear depois do 03 (+ 02 já na main)

```
/implement .scratch/agenda-inteligente/issues/04-marcacao-de-periodo.md
```

```
/implement .scratch/agenda-inteligente/issues/05-alerta-de-conflito.md
```

```
/implement .scratch/agenda-inteligente/issues/06-nao-na-confirmacao.md
```

*(O 06 só depende do 03; pode começar assim que o 03 estiver na `main`, em paralelo com 04/05 se quiser.)*

```
/implement .scratch/agenda-inteligente/issues/07-alteracao.md
```

```
/implement .scratch/agenda-inteligente/issues/08-cancelamento.md
```

```
/implement .scratch/agenda-inteligente/issues/10-conta-google.md
```

## Dependências (quem libera quem)

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
3. Atualize a tabela “Onde estamos” neste guia (opcional, mas evita se perder de novo).

## Artefatos do fluxo (não são código)

| Caminho | O que é |
| --- | --- |
| `CONTEXT.md` | Glossário do domínio |
| `docs/adr/` | Decisões duras |
| `.scratch/agenda-inteligente/spec.md` | Spec da v1 |
| `.scratch/agenda-inteligente/issues/` | Tickets |
| `docs/agents/issue-tracker.md` | Como o tracker local funciona |

Dúvida de qual skill usar: `/ask-matt`. Trabalho grande demais para uma sessão: `/wayfinder`.
