# 02: Consulta de intervalo

**What to build:** O Dono pergunta por um recorte de vários dias — "feriado de 7 de setembro", "pescaria do dia 4 ao 7", "esse fim de semana" — e recebe o resumo do intervalo inteiro. Uma data solta continua consultando só aquele dia. Este ticket entrega o caso que originou o produto na forma de leitura: com a cirurgia no Calendário, perguntar pela pescaria mostra a cirurgia.

**Blocked by:** 01 (Consulta de um dia)

**Status:** ready-for-agent

- [ ] Fala de feriado, fim de semana, viagem ou pescaria com datas consulta o intervalo correspondente
- [ ] "Do dia 4 ao 7" consulta os quatro dias, inclusive os extremos
- [ ] Data solta continua consultando apenas aquele dia, sem alargar para o fim de semana
- [ ] Intervalo sem nenhum Compromisso responde que está livre
- [ ] Intervalo ocupado lista os Compromissos com o dia de cada um
- [ ] Um Período que começa antes ou termina depois do recorte aparece na resposta
- [ ] Com a cirurgia semeada no dia 7, consultar de 4 a 7 mostra a cirurgia
- [ ] Nada é gravado no Calendário em nenhum caso
