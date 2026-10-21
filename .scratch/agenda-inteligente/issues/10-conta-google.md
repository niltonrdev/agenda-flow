# 10: Conta Google de verdade

**What to build:** O Dono conecta a conta Google uma vez e a Conversa passa a ler e escrever no Calendário real: lê todas as agendas visíveis, grava só na principal. A porta Calendário não muda — entra um segundo adaptador ao lado do adaptador em memória, que continua sendo o da suíte de testes e o de quem roda sem credencial.

**Blocked by:** 08 (Cancelamento com desambiguação)

**Status:** done

- [x] O Dono autoriza a conta Google uma vez e a sessão persiste entre visitas
- [x] A Consulta lê os Compromissos de todas as agendas visíveis da conta
- [x] Compromissos recorrentes já existentes no Google aparecem nas ocorrências que caem no recorte consultado
- [x] A Marcação grava na agenda principal
- [x] Alteração e Cancelamento agem no Compromisso certo do Google
- [x] Período é gravado como evento de dia inteiro, com a conversão da data final exclusiva contida no adaptador
- [x] O calendário de feriados nacionais da conta não vira Compromisso do Dono
- [x] Sem credencial configurada, a aplicação continua subindo com o adaptador em memória
- [x] Falha ou indisponibilidade do Google gera mensagem clara em português dizendo que não foi gravado
- [x] A suíte automática continua rodando com o adaptador em memória; a verificação contra a conta real é manual
