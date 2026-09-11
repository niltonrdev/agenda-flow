# 01: Consulta de um dia

**What to build:** O Dono abre a Conversa, escreve "15 de novembro" e recebe, em português, se o dia está livre ou quais Compromissos existem nele. É o primeiro caminho completo: tela da Conversa, entrada de conversa, porta Calendário com adaptador em memória semeado, e a primeira suíte de testes. O padrão de teste que este ticket estabelecer (runner, organização, nomes) vale para todos os seguintes.

**Blocked by:** None (can start immediately)

**Status:** claimed

- [ ] A aplicação sobe em desenvolvimento sem nenhuma credencial do Google e a Conversa responde
- [ ] Uma data solta sem Compromisso responde que o dia está livre
- [ ] Um dia ocupado lista cada Compromisso com título e horário
- [ ] Um Período que cobre o dia consultado aparece na resposta desse dia
- [ ] Mensagem que o interpretador não entende recebe resposta dizendo isso, e nada é gravado
- [ ] A porta Calendário existe com listar, criar, alterar e cancelar; só listar é usada aqui
- [ ] O adaptador em memória é semeado com Compromissos de demonstração, incluindo a cirurgia no feriado de 7 de setembro
- [ ] Existe teste da entrada de conversa com o Calendário em memória e "agora" passado explicitamente
- [ ] Datas e horas são interpretadas em `America/Sao_Paulo`; nenhum teste depende do dia em que roda
- [ ] A tela funciona no iPhone e no desktop, com estado de carregando e mensagem de erro em português
- [ ] README explica o que é o projeto e como rodar e testar localmente
