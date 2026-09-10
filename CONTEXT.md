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
O Google Calendar do Dono, a fonte da verdade dos Compromissos. O Dono usa iPhone; o Google Calendar no iOS é aceitável. Datil e horas da Conversa são as de Brasília, em português do Brasil.
_Avoid_: Agenda (nome do produto), Apple Calendar (não é o destino da v1), Outlook

**Compromisso**:
O que o Dono marca no Calendário. Ou é Pontual ou é Período. Não leva convidados.
_Avoid_: evento (palavra do Google, não a nossa), meeting, appointment, convite

**Pontual**:
Compromisso com hora de início e fim. Se a Mensagem não disser quanto tempo, o fim é uma hora depois do início.
_Avoid_: slot, meeting

**Período**:
Compromisso que ocupa um ou mais dias corridos (pescaria do dia 4 ao 7, cirurgia, viagem). Não usa a duração padrão de uma hora.
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
Remover um Compromisso do Calendário, só depois da Confirmação. Sem convidados. Se a fala for ambígua, a Conversa lista e o Dono escolhe.
_Avoid_: delete, unbook

**Confirmação**:
O sistema mostra o que entendeu; o Dono diz sim (ou equivalente) e só então a mutação vai para o Calendário.
_Avoid_: dry-run, preview (como nome de domínio)

**Alerta de conflito**:
Na Marcação ou Alteração, aviso de sobreposição com um Compromisso já existente. Não grava por cima em silêncio. Consulta não usa este termo: ela resume o recorte.
_Avoid_: overlap, collision (como nome de produto)

**Disponibilidade**:
O estado livre/ocupado de um recorte do Calendário (um dia ou um Período), do ponto de vista do Dono.
_Avoid_: free/busy (como nome nosso)
