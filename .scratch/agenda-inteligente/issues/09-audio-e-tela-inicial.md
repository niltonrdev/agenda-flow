# 09: Áudio por ditado e app na tela inicial

**What to build:** O Dono fala em vez de digitar e a Conversa trata isso como qualquer Mensagem. Na v1 o ditado é o nativo do iPhone, no próprio campo da Conversa: sem chave, sem serviço externo. E o app fica instalável na tela inicial, abrindo direto na Conversa.

**Blocked by:** 01 (Consulta de um dia)

**Status:** ready-for-agent

- [ ] O campo da Conversa deixa claro que dá para ditar, com dica ou affordance de microfone
- [ ] Texto ditado segue exatamente o mesmo caminho do texto digitado
- [ ] A porta Transcritor existe, com o ditado nativo como adaptador padrão, para um adaptador de servidor entrar depois sem tocar no núcleo
- [ ] A Confirmação mostra o Compromisso entendido, nunca a transcrição crua
- [ ] Transcrição errada aparece como Confirmação errada, e o não abre a correção
- [ ] A aplicação é instalável na tela inicial do iPhone, com manifest, nome e ícone
- [ ] Aberta pela tela inicial, ela cai direto na Conversa
