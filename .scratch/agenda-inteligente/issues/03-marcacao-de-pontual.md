# 03: Marcação de Pontual com Confirmação

**What to build:** O Dono escreve "reunião com a Ana amanhã às 15h", vê a Confirmação do que o sistema entendeu e só depois do sim o Compromisso é gravado no Calendário. Sem o sim, o Calendário não muda. Este ticket cria o ciclo propor-confirmar-gravar que todas as mutações seguintes reaproveitam.

**Blocked by:** 01 (Consulta de um dia)

**Status:** done

- [x] A Mensagem de marcar produz uma Confirmação com título, data e horário de início e fim
- [x] Pontual sem duração na Mensagem termina uma hora depois do início
- [x] Duração dita na Mensagem ("das 15h às 16h30", "por 30 minutos") é respeitada
- [x] O sim grava o Compromisso e a Conversa avisa que ficou marcado
- [x] Enquanto o Dono não confirma, nada é gravado
- [x] A Confirmação pendente atravessa os turnos explicitamente, sem estado global no servidor
- [x] Se o Dono manda outro pedido em vez de responder, a proposta é descartada e o novo pedido é atendido
- [x] Depois de gravado, consultar aquele dia mostra o Compromisso novo
