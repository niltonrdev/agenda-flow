# 01: Link do Calendário no iPhone na data certa

**What to build:** O ícone “ver no calendário” no iPhone abre o dia civil gravado (ex.: 10/11/2026), não novembro de 2057. A Marcação “reunião com Luiza dia 10/11 às 19h” grava nesse dia.

**Blocked by:** —

**Status:** done

- [x] `calshow:` usa segundos desde 1/1/2001 GMT
- [x] Teste impede regressão para 2026-11-10 → 2057
- [x] Confirmar + gravar “10/11 às 19h” em novembro de 2026 produz `diaParaCalendario` 2026-11-10
