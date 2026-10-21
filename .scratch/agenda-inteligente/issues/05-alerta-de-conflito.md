# 05: Alerta de conflito na Marcação

**What to build:** Quando o que o Dono quer marcar se sobrepõe ao que já existe, a Confirmação vem com o aviso e mostra o Compromisso que conflita. Nada é gravado em silêncio. Depois de ver o aviso, o Dono ainda pode dizer sim e gravar assim mesmo — a decisão é dele.

**Blocked by:** 04 (Marcação de Período)

**Status:** done

- [x] Pontual que se sobrepõe a outro Pontual no mesmo horário gera Alerta de conflito
- [x] Pontual que cai dentro de um Período gera Alerta de conflito
- [x] Período que compartilha ao menos um dia com outro Período gera Alerta de conflito
- [x] Compromissos que apenas se encostam (um termina às 15h, o outro começa às 15h) não geram alerta
- [x] O aviso identifica qual Compromisso existente conflita, com dia e horário
- [x] Depois do aviso, o sim grava mesmo com a sobreposição
- [x] Depois do aviso, sem o sim nada é gravado
- [x] Marcar a pescaria de 4 a 7 com a cirurgia no dia 7 mostra a cirurgia antes de qualquer gravação
