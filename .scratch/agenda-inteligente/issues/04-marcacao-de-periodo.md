# 04: Marcação de Período

**What to build:** O Dono escreve "pescaria do dia 4 ao 7" e, depois da Confirmação, isso vira um único Compromisso de dias inteiros cobrindo 4, 5, 6 e 7. Não são quatro Compromissos, e a duração padrão de uma hora não se aplica.

**Blocked by:** 02 (Consulta de intervalo), 03 (Marcação de Pontual com Confirmação)

**Status:** ready-for-agent

- [ ] A Mensagem com intervalo de dias produz Confirmação de Período, com primeiro e último dia
- [ ] O sim grava um único Compromisso de dias inteiros, inclusive nos extremos
- [ ] O Período não é gravado como vários Compromissos, um por dia
- [ ] A duração padrão de uma hora não é aplicada ao Período
- [ ] Consultar qualquer dia coberto encontra o Período
- [ ] Consultar o intervalo mostra o Período uma vez só, não repetido por dia
- [ ] A Conversa distingue Pontual de Período pela Mensagem, sem o Dono precisar dizer o tipo
