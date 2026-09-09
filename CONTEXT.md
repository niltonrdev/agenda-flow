# Agenda Inteligente

Ferramenta pessoal do Dono: uma Conversa (texto ou Áudio) que consulta Disponibilidade no Calendário e, depois de Confirmação, cria, altera ou cancela um Compromisso.

## Language

**Dono**:
A única pessoa que fala com o sistema e cujo Calendário é lido e escrito.
_Avoid_: usuário, cliente, account

**Conversa**:
O fio de mensagens em que o Dono pede consultas e mutações. Na v1 é um chat estilo conversa, não WhatsApp.
_Avoid_: WhatsApp (canal da v1), inbox, thread

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
Pedido para saber se um dia (ou intervalo) está livre ou ocupado, sem gravar nada.
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
Aviso de que a data/hora pedida já tem Compromisso. Não grava por cima em silêncio.
_Avoid_: overlap, collision (como nome de produto)

**Disponibilidade**:
O estado livre/ocupado de um dia no Calendário, do ponto de vista do Dono.
_Avoid_: free/busy (como nome nosso)
