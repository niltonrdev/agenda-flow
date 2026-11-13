# Busca por tipo e termo lê título e descrição só localmente

A listagem por tipo (viagens, reuniões) e a busca livre casam o termo no título e na descrição (`buscaInclui = titulo+descricao`, D1). A descrição já vem no `events.list` com o escopo `calendar.events`; não pedimos escopo novo nem outro serviço. Ela fica só em memória para o casamento: a resposta mostra título, data e hora; o cookie guarda o filtro, o offset e os ids+rótulos da página visível, nunca a descrição; nada disso vai para log.
