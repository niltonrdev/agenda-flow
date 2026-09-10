# Agenda Inteligente

Ferramenta pessoal do Dono: uma Conversa (texto ou Áudio) que consulta Disponibilidade no Calendário e, depois de Confirmação, cria, altera ou cancela um Compromisso. A turma, a esposa e qualquer outra pessoa não existem no sistema; só o Calendário do Dono.

## Language

**Dono**:
A única pessoa que fala com o sistema e cujo Calendário é lido e escrito. O problema que o produto ataca é ele comprometer um Período sem ter conferido o que já estava no Calendário.
_Avoid_: usuário, cliente, account, esposa, turma

**Conversa**:
O fio de mensagens no iPhone do Dono (texto e microfone) em que ele pede Consulta ou mutação. Não é WhatsApp.
_Avoid_: WhatsApp (canal da v1), Telegram, inbox, thread

**Mensagem**:
Um turno do Dono na Conversa, em texto ou Áudio já transcrito para texto.
_Avoid_: prompt, comando, input

**Áudio**:
Uma Mensagem falada que vira texto antes de ser interpretada.
_Avoid_: voice note, podcast

**Calendário**:
O Google Calendar do Dono, a fonte da verdade dos Compromissos. A Consulta lê todas as agendas visíveis da conta; a Marcação grava só na agenda principal. Datas e horas da Conversa são as de Brasília, em português do Brasil.
_Avoid_: Agenda (nome do produto), Apple Calendar (não é o destino da v1), Outlook

**Compromisso**:
O que o Dono marca no Calendário. Ou é Pontual ou é Período. Não leva convidados.
_Avoid_: evento (palavra do Google, não a nossa), meeting, appointment, convite

**Pontual**:
Compromisso com hora de início e fim. Se a Mensagem não disser quanto tempo, o fim é uma hora depois do início.
_Avoid_: slot, meeting

**Período**:
Compromisso de dias inteiros, do primeiro ao último dia inclusive (pescaria do dia 4 ao 7 = 4, 5, 6 e 7). Na Conversa é um só Compromisso, não um por dia. Não usa a duração padrão de uma hora.
_Avoid_: all-day (como nome nosso), viagem (é um exemplo, não o tipo), bloco

**Consulta**:
Pedido para saber se um dia ou um Período está livre ou ocupado, sem gravar nada. Uma data solta (“15 de novembro”) é só aquele dia. Fala de feriado, fim de semana, viagem ou pescaria consulta o intervalo desse recorte.
_Avoid_: search, listagem, report

**Marcação**:
Criar um Compromisso novo no Calendário, só depois da Confirmação.
_Avoid_: booking, schedule (verbo inglês)

**Alteração**:
Mudar a data/hora de um Pontual, ou os dias de um Período, só depois da Confirmação. Se a fala for ambígua, a Conversa lista os Compromissos candidatos e o Dono escolhe.
_Avoid_: update genérico, edit, reschedule (como nome de produto)

**Cancelamento**:
Remover o Compromisso inteiro do Calendário, só depois da Confirmação. Um Período não se recorta num dia: para soltar um dia, é Alteração dos extremos. Se a fala for ambígua, a Conversa lista e o Dono escolhe.
_Avoid_: delete, unbook

**Confirmação**:
O sistema mostra o que entendeu (título, Pontual ou Período, datas/horas, Alerta de conflito se houver), não a transcrição crua do Áudio. O Dono diz sim e a mutação vai ao Calendário; diz não e a Conversa pergunta o que mudar, na mesma mutação.
_Avoid_: dry-run, preview (como nome de domínio)

**Alerta de conflito**:
Na Marcação ou Alteração, aviso de sobreposição: Pontual×Pontual no horário, Pontual dentro de um Período, ou dois Períodos que compartilham um dia. Não grava por cima em silêncio; o Dono ainda pode mandar gravar depois de ver o aviso. Consulta não usa este termo: ela resume o recorte.
_Avoid_: overlap, collision (como nome de produto)

**Disponibilidade**:
O estado livre/ocupado de um recorte do Calendário. Dia livre = nenhum Pontual e nenhum Período cobrindo aquele dia, nas agendas visíveis.
_Avoid_: free/busy (como nome nosso)
