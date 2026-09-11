# 03: Marcação de Pontual com Confirmação

**What to build:** O Dono escreve "reunião com a Ana amanhã às 15h", vê a Confirmação do que o sistema entendeu e só depois do sim o Compromisso é gravado no Calendário. Sem o sim, o Calendário não muda. Este ticket cria o ciclo propor-confirmar-gravar que todas as mutações seguintes reaproveitam.

**Blocked by:** 01 (Consulta de um dia)

**Status:** ready-for-agent

- [ ] A Mensagem de marcar produz uma Confirmação com título, data e horário de início e fim
- [ ] Pontual sem duração na Mensagem termina uma hora depois do início
- [ ] Duração dita na Mensagem ("das 15h às 16h30", "por 30 minutos") é respeitada
- [ ] O sim grava o Compromisso e a Conversa avisa que ficou marcado
- [ ] Enquanto o Dono não confirma, nada é gravado
- [ ] A Confirmação pendente atravessa os turnos explicitamente, sem estado global no servidor
- [ ] Se o Dono manda outro pedido em vez de responder, a proposta é descartada e o novo pedido é atendido
- [ ] Depois de gravado, consultar aquele dia mostra o Compromisso novo
