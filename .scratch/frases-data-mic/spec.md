# Spec: data certa, fala informal, viagem e microfone

**Status:** ready-for-agent

## Problem Statement

Três falhas na Conversa do iPhone: o ícone do Calendário abre em 2057; frases leigas de Marcação (“Marcar BH viagem dia 7/11”) não viram pedido; viagem de um dia é tratada como Pontual sem hora. O microfone ainda é toque-para-ligar, não o gesto do WhatsApp.

## Solution

- O link nativo do iPhone (`calshow:`) usa a epoch da Apple (1/1/2001), não a Unix. A Marcação continua gravando no ano corrente ou no próximo se a data já passou.
- O interpretador aceita ordem solta e formas informais; fala de viagem sem intervalo pergunta se é 1 dia ou mais, com seletor de dias quando for mais.
- O microfone segura para ouvir, solta para enviar, arrasta para cima para travar e para o lado para cancelar (touch no Safari).
