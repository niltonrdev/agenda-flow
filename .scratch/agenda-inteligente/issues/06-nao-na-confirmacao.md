# 06: "Não" na Confirmação e correção

**What to build:** O Dono diz não para a Confirmação e a Conversa pergunta o que mudar, em vez de descartar tudo. Ele responde só o que está errado — "é dia 5" — e recebe a Confirmação nova, com o resto preservado. A mesma mutação continua até o sim.

**Blocked by:** 03 (Marcação de Pontual com Confirmação)

**Status:** ready-for-agent

- [ ] O não na Confirmação faz a Conversa perguntar o que mudar
- [ ] Corrigir só a data reapresenta a Confirmação com título e horário preservados
- [ ] Corrigir só o horário reapresenta a Confirmação com título e data preservados
- [ ] Corrigir só o título reapresenta a Confirmação com data e horário preservados
- [ ] Duas correções seguidas funcionam, cada uma partindo da proposta corrigida
- [ ] Nada é gravado durante as correções; só o sim grava
- [ ] O sim depois da correção grava o Compromisso corrigido, não o original
