# Spec: Agenda Inteligente (v1)

**Status:** ready-for-agent

## Problem Statement

O Dono vive corrido e com a cabeça cheia. Ele combina compromissos falando ("pescaria do dia 4 ao 7", "reunião com a Ana amanhã às 15h") e só depois — às vezes tarde demais — confere o Calendário. Foi assim que ele fechou uma pescaria de feriado e, perto da data, descobriu que a cirurgia da esposa já estava lá: furou com a turma. A informação estava no Calendário dele o tempo todo; abrir o app, achar o dia e ler a agenda é exatamente o passo que ele não dá.

Ele também não tem uma forma rápida de perguntar "como está o dia 15 de novembro?" sem parar o que está fazendo e navegar por um calendário.

## Solution

Um chat pessoal no iPhone do Dono. Ele escreve ou fala uma Mensagem e recebe, em uma frase, o que precisa saber ou uma Confirmação do que será gravado.

- **Consulta**: "dia 15 de novembro" responde se o dia está livre ou quais Compromissos existem. "Feriado de 7 de setembro" ou "pescaria do dia 4 ao 7" resume o intervalo inteiro.
- **Marcação, Alteração e Cancelamento**: o sistema mostra o que entendeu, avisa se há sobreposição, e só grava no Calendário depois do sim.

O ganho não é automação: é o Dono **ver** o que já existe no momento em que se compromete, sem sair da conversa.

## User Stories

1. Como Dono, quero abrir a Conversa direto da tela inicial do iPhone, para pedir algo à agenda em segundos.
2. Como Dono, quero escrever "15 de novembro" e saber se o dia está livre, para responder a um convite na hora.
3. Como Dono, quero que um dia sem nada responda "livre", para não precisar interpretar uma lista vazia.
4. Como Dono, quero que um dia ocupado liste os Compromissos com horário, para saber o que me prende.
5. Como Dono, quero perguntar "feriado de 7 de setembro" e receber o resumo do intervalo, para avaliar uma viagem.
6. Como Dono, quero que "pescaria do dia 4 ao 7" consulte os quatro dias, para enxergar a cirurgia que já estava marcada antes de me comprometer.
7. Como Dono, quero que uma data solta consulte só aquele dia, para não receber ruído sobre o fim de semana.
8. Como Dono, quero que a Consulta enxergue todas as agendas visíveis da minha conta Google, para não perder um Compromisso que não está na principal.
9. Como Dono, quero que a Consulta inclua Compromissos recorrentes já existentes no Google, para que uma reunião semanal apareça no dia consultado.
10. Como Dono, quero dizer "reunião com a Ana amanhã às 15h" e ver a Confirmação, para conferir antes de gravar.
11. Como Dono, quero que um Pontual sem duração vire uma hora, para não precisar ditar o fim.
12. Como Dono, quero que "pescaria do dia 4 ao 7" vire um Período de dias inteiros, para não virar quatro Compromissos separados.
13. Como Dono, quero dizer sim e ter o Compromisso gravado no Calendário, para confiar que está lá.
14. Como Dono, quero que a gravação vá para a minha agenda principal, para saber onde procurar depois.
15. Como Dono, quero ser avisado quando o horário pedido se sobrepõe a um Pontual existente, para não marcar duas coisas às 15h.
16. Como Dono, quero ser avisado quando o Pontual cai dentro de um Período, para não marcar reunião no meio da pescaria.
17. Como Dono, quero ser avisado quando dois Períodos compartilham um dia, para não viajar por cima de uma cirurgia.
18. Como Dono, quero poder gravar mesmo assim depois de ver o Alerta de conflito, para decidir eu mesmo quando a sobreposição é aceitável.
19. Como Dono, quero dizer não na Confirmação e ouvir "o que mudar?", para corrigir sem repetir o pedido inteiro.
20. Como Dono, quero corrigir só o dia ("não, é dia 5") e receber a Confirmação nova, para não recomeçar a Conversa.
21. Como Dono, quero pedir "muda a pescaria para o dia 5" e ver a Confirmação da Alteração, para remarcar falando.
22. Como Dono, quero que a Alteração de um Período mude os dias inteiros, para esticar ou encurtar a viagem.
23. Como Dono, quero pedir "cancela a reunião da Ana" e confirmar antes de sumir, para não perder um Compromisso por engano.
24. Como Dono, quero que a Conversa liste os candidatos quando meu pedido é ambíguo, para escolher qual Compromisso alterar ou cancelar.
25. Como Dono, quero escolher da lista pelo que ela mostra ("a de sexta"), para não lidar com identificador.
26. Como Dono, quero falar em vez de digitar, para usar o sistema com as mãos ocupadas.
27. Como Dono, quero que o Áudio vire texto e siga o mesmo caminho da Mensagem escrita, para ter o mesmo resultado.
28. Como Dono, quero que a Confirmação mostre o Compromisso entendido e não a transcrição, para conferir o que importa.
29. Como Dono, quero que uma transcrição errada apareça como Confirmação errada, para poder dizer não e corrigir.
30. Como Dono, quero que "amanhã" e "às 15h" sejam sempre horário de Brasília, para a mesma frase valer quando eu viajo.
31. Como Dono, quero conversar em português do Brasil, para falar do meu jeito.
32. Como Dono, quero conectar minha conta Google uma vez, para não repetir login a cada Conversa.
33. Como Dono, quero uma mensagem clara quando o Calendário não responde, para saber que não foi gravado.
34. Como Dono, quero saber quando o sistema não entendeu o pedido, para reformular em vez de achar que gravou.
35. Como Dono, quero ver a Conversa recente ao reabrir o chat, para retomar o assunto.
36. Como Dono, quero que a tela funcione bem no iPhone (e aceitável no desktop), para usar onde estiver.
37. Como Dono, quero ver que a resposta está sendo preparada, para não mandar a Mensagem duas vezes.
38. Como Dono, quero que nada seja gravado enquanto eu não confirmo, para o Calendário nunca ganhar lixo.

## Implementation Decisions

Nada disto existe ainda: o repositório só tem as skills e a documentação de domínio. Todas as escolhas abaixo são de partida.

- **Aplicação**: Next.js com TypeScript, App Router, Tailwind e shadcn/ui para as primitivas. Uma superfície só: a tela da Conversa, instalável na tela inicial do iPhone (manifest + ícones).
- **Uma entrada de conversa**: um único Route Handler recebe o turno do Dono (texto já transcrito, mais o estado da Confirmação pendente) e devolve a resposta da Conversa. A UI não decide nada de domínio: ela mostra a resposta e devolve o próximo turno.
- **Núcleo determinístico**: interpretar a Mensagem, montar a Consulta, detectar o Alerta de conflito e produzir a Confirmação são funções puras, sem I/O. Recebem "agora" como argumento, nunca leem o relógio.
- **Interpretação por regras, não por LLM**: um interpretador PT-BR de datas, horas e intenções (consultar, marcar, alterar, cancelar, confirmar, corrigir). Um modelo tornaria os testes não determinísticos e exigiria chave para rodar a suíte. Se o interpretador se mostrar curto demais, um adaptador de LLM pode entrar atrás da mesma porta.
- **Porta Calendário**: uma interface com listar (intervalo), criar, alterar e cancelar. Dois adaptadores: Google Calendar (OAuth do Dono; lê as agendas visíveis, grava na principal) e um adaptador em memória, com dados semeados, usado nos testes e quando não há credencial configurada.
- **Porta Transcritor**: o Áudio da Conversa vira texto atrás de uma interface. O adaptador padrão usa o ditado nativo do iPhone no próprio campo de texto, o que não exige chave nem serviço. Um adaptador de transcrição no servidor pode entrar depois sem tocar no núcleo.
- **Confirmação pendente**: o turno seguinte precisa saber o que foi proposto. O estado da proposta viaja explicitamente entre os turnos, não em variável global de servidor.
- **Modelo do Compromisso**: Pontual carrega início e fim; Período carrega primeiro e último dia, inclusive, e vira evento de dia inteiro no Google (cuja data final exclusiva é detalhe do adaptador, não do domínio).
- **Fuso**: todo cálculo de data usa `America/Sao_Paulo`, incluindo a conversão para o formato do Google.
- **Sem credencial, ainda roda**: com o adaptador em memória, a aplicação sobe e a Conversa funciona ponta a ponta para demonstração.

## Testing Decisions

- **Um bom teste aqui descreve um turno da Conversa**: entra uma Mensagem em português, sai a resposta que o Dono lê. Nada de asserção sobre estrutura interna do interpretador.
- **Costura principal**: a entrada de conversa, exercitada com o Calendário em memória. Um teste semeia a cirurgia no feriado, manda "pescaria do dia 4 ao 7" e espera que a resposta mostre a cirurgia. Esse é o teste que representa o produto.
- **Costura secundária**: as funções puras do núcleo (interpretação, conflito, formatação da Confirmação), testadas direto quando o caso é combinatório demais para passar pela conversa inteira: variações de frase, virada de mês, dia único vs intervalo.
- **O adaptador do Google não entra na suíte automática**: ele é verificado à mão contra a conta do Dono. O que a suíte cobre é o contrato da porta, com o adaptador em memória.
- **Sem prior art no repositório**: o primeiro ticket que escrever teste define o padrão (runner, organização, nomes em português do domínio) para os seguintes.
- **Relógio congelado**: todo teste passa um "agora" explícito. Nenhum teste depende do dia em que roda.

## Out of Scope

- WhatsApp (oficial ou não), Telegram, Siri e qualquer canal fora do chat no iPhone.
- Convidar pessoas, participantes, link de reunião: a turma da pescaria e a esposa não existem no sistema.
- Ler ou escrever no calendário de outra pessoa.
- Criar Compromisso recorrente pela Conversa (ler os que já existem está dentro).
- Lista própria de feriados nacionais e expressões como "próximo feriado" sem data.
- Tratar o calendário "Feriados no Brasil" da conta Google como Compromisso do Dono.
- Escolher, na interface, quais agendas ler ou onde gravar.
- Recortar um dia de um Período via Cancelamento (isso é Alteração dos extremos).
- Campo de local, anexo, categoria ou cor do Compromisso.
- Notificação e lembrete próprios: quem lembra é o Google.
- Multi-usuário, cadastro, cobrança.
- Apple Calendar e Outlook.

## Further Notes

- O caso de aceite que originou o produto: com a cirurgia já no Calendário, a Mensagem "pescaria do dia 4 ao 7" tem que mostrar a cirurgia antes de qualquer gravação. Se um dia essa frase gravar em silêncio, o produto perdeu a razão de existir.
- Decisões duras registradas em `docs/adr/0001` a `0007`; vocabulário em `CONTEXT.md`. Use os termos do glossário nos nomes de teste e nas mensagens da Conversa.
- A Conversa fala com o Dono em português do Brasil. Mensagens de erro também.
