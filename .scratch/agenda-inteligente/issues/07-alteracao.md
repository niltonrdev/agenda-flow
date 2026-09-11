# 07: Alteração com desambiguação

**What to build:** O Dono pede "muda a pescaria para o dia 5" e vê a Confirmação do que sai e do que entra, antes de gravar. Quando o pedido casa com mais de um Compromisso, a Conversa lista os candidatos e ele escolhe pelo que a lista mostra, sem lidar com identificador.

**Blocked by:** 05 (Alerta de conflito na Marcação), 06 ("Não" na Confirmação e correção)

**Status:** ready-for-agent

- [ ] Pedido de alterar produz Confirmação mostrando o Compromisso atual e como ele fica
- [ ] Alteração de Pontual muda data, horário ou os dois
- [ ] Alteração de Período muda o primeiro dia, o último, ou os dois, seguindo dias inteiros
- [ ] Pedido que casa com mais de um Compromisso faz a Conversa listar os candidatos
- [ ] O Dono escolhe da lista pelo que ela mostra e recebe a Confirmação daquele Compromisso
- [ ] Pedido que não casa com nenhum Compromisso recebe resposta dizendo que não foi encontrado
- [ ] Se o destino da Alteração se sobrepõe a outro Compromisso, o Alerta de conflito aparece na Confirmação
- [ ] Só o sim grava; o não segue o fluxo de correção
