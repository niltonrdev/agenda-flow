# Agenda Inteligente

Ferramenta pessoal do Dono: uma Conversa (texto ou Áudio) que consulta Disponibilidade no Calendário e, depois de Confirmação, cria, altera ou cancela um Compromisso.

## Language

**Dono**:
A única pessoa que fala com o sistema e cujo Calendário é lido e escrito.
_Avoid_: usuário, cliente, account

**Conversa**:
O fio de mensagens no iPhone do Dono (texto e microfone) em que ele pede Consulta ou mutação. Não é WhatsApp.
_Avoid_: WhatsApp (canal da v1), Telegram, inbox, thread

**Mensagem**:
Um turno do Dono na Conversa, em texto ou Áudio já transcrito para texto.
_Avoid_: prompt, comando, input

**Áudio**:
Uma Mensagem falada que vira texto antes de ser interpretada. O Dono não tem WhatsApp Business.
_Avoid_: voice note, podcast

**Calendário**:
O Google Calendar do Dono, a fonte da verdade dos Compromissos. O Dono usa iPhone; o Google Calendar no iOS é aceitável.
_Avoid_: Agenda (nome do produto), Apple Calendar (não é o destino da v1), Outlook

**Compromisso**:
Um bloco de tempo no Calendário, com título, início e fim. Não leva convidados.
_Avoid_: evento (palavra do Google, não a nossa), meeting, appointment, convite

**Consulta**:
Pedido para saber se um dia ou um intervalo está livre ou ocupado, sem gravar nada. Responde com o resumo dos Compromissos daquele recorte; não é um Alerta de conflito.
_Avoid_: search, listagem, report

**Marcação**:
Criar um Compromisso novo no Calendário, só depois da Confirmação.
_Avoid_: booking, schedule (verbo inglês)

**Alteração**:
Mudar a data/hora de um Compromisso já existente, só depois da Confirmação.
_Avoid_: update genérico, edit, reschedule (como nome de produto)

**Cancelamento**:
Remover um Compromisso do Calendário, só depois da Confirmação. Não é convite recusado: não há convidados.
_Avoid_: delete, unbook

**Confirmação**:
O sistema mostra o que entendeu; o Dono diz sim (ou equivalente) e só então a mutação vai para o Calendário.
_Avoid_: dry-run, preview (como nome de domínio)

**Alerta de conflito**:
Na Marcação ou Alteração, aviso de que o horário pedido se sobrepõe a um Compromisso já existente. Não grava por cima em silêncio. Consulta de um dia não usa este termo: ela resume o dia.
_Avoid_: overlap, collision (como nome de produto)

**Disponibilidade**:
O estado livre/ocupado de um recorte do Calendário (um dia ou um intervalo), do ponto de vista do Dono.
_Avoid_: free/busy (como nome nosso)
