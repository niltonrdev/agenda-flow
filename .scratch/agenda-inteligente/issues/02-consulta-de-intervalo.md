# 02: Consulta de intervalo

**What to build:** O Dono pergunta por um recorte de vários dias — "feriado de 7 de setembro", "pescaria do dia 4 ao 7", "esse fim de semana" — e recebe o resumo do intervalo inteiro. Uma data solta continua consultando só aquele dia. Este ticket entrega o caso que originou o produto na forma de leitura: com a cirurgia no Calendário, perguntar pela pescaria mostra a cirurgia.

**Blocked by:** 01 (Consulta de um dia)

**Status:** in-review

- [x] Fala de feriado, fim de semana, viagem ou pescaria com datas consulta o intervalo correspondente
- [x] "Do dia 4 ao 7" consulta os quatro dias, inclusive os extremos
- [x] Data solta continua consultando apenas aquele dia, sem alargar para o fim de semana
- [x] Intervalo sem nenhum Compromisso responde que está livre
- [x] Intervalo ocupado lista os Compromissos com o dia de cada um
- [x] Um Período que começa antes ou termina depois do recorte aparece na resposta
- [x] Com a cirurgia semeada no dia 7, consultar de 4 a 7 mostra a cirurgia
- [x] Nada é gravado no Calendário em nenhum caso

## Comments

Implementado sobre a Consulta de um dia: o interpretador reconhece intervalo explícito, feriado (com recorte de fim de semana/emenda) e “esse fim de semana”. A entrada de conversa lista o recorte sem gravar. O teste que representa o produto: “pescaria do dia 4 ao 7” com a Cirurgia semeada no dia 7.
