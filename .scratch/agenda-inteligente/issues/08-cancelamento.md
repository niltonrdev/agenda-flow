# 08: Cancelamento com desambiguação

**What to build:** O Dono pede "cancela a reunião da Ana", confirma, e o Compromisso sai do Calendário. Ambiguidade resolve do mesmo jeito da Alteração: a Conversa lista e ele escolhe. Um Período é cancelado inteiro; soltar um dia dele não é Cancelamento.

**Blocked by:** 07 (Alteração com desambiguação)

**Status:** ready-for-agent

- [ ] Pedido de cancelar produz Confirmação identificando o Compromisso, com dia e horário
- [ ] O sim remove o Compromisso do Calendário e a Conversa avisa
- [ ] O não deixa o Compromisso intacto
- [ ] Pedido ambíguo lista os candidatos e o Dono escolhe pelo que a lista mostra
- [ ] Pedido que não casa com nenhum Compromisso recebe resposta dizendo que não foi encontrado
- [ ] Cancelar um Período remove o Compromisso inteiro
- [ ] Pedido de tirar só um dia de um Período responde que isso é Alteração dos extremos, e não remove nada
- [ ] Depois de cancelado, consultar o dia não mostra mais o Compromisso
