# 09: Áudio por ditado e app na tela inicial

**What to build:** O Dono fala em vez de digitar e a Conversa trata isso como qualquer Mensagem. Na v1 o ditado é o nativo do iPhone, no próprio campo da Conversa: sem chave, sem serviço externo. E o app fica instalável na tela inicial, abrindo direto na Conversa.

**Blocked by:** 01 (Consulta de um dia)

**Status:** done

- [x] O campo da Conversa deixa claro que dá para ditar, com dica ou affordance de microfone
- [x] Texto ditado segue exatamente o mesmo caminho do texto digitado
- [x] A porta Transcritor existe, com o ditado nativo como adaptador padrão, para um adaptador de servidor entrar depois sem tocar no núcleo
- [x] A Confirmação mostra o Compromisso entendido, nunca a transcrição crua
- [x] Transcrição errada aparece como Confirmação errada, e o não abre a correção
- [x] A aplicação é instalável na tela inicial do iPhone, com manifest, nome e ícone
- [x] Aberta pela tela inicial, ela cai direto na Conversa
