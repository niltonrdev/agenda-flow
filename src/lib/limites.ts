/** Limites de abuso e de janela nas rotas e no cliente Google. */

export const LIMITE_CORPO_BYTES = 16_384;
export const LIMITE_MENSAGEM_CARACTERES = 2_000;
export const LIMITE_AGENDAS_VISIVEIS = 25;
export const LIMITE_EVENTOS_POR_AGENDA = 500;
export const TIMEOUT_GOOGLE_MS = 10_000;
/** Itens por resposta na listagem por tipo ou busca livre. */
export const ITENS_POR_LISTAGEM = 15;
/** Teto técnico da janela enviada ao Google na listagem por tipo/busca. */
export const TETO_BUSCA_DIAS = 365;

export const RATE_CONVERSA_POR_MINUTO = 30;
export const RATE_OAUTH_POR_MINUTO = 10;
export const RATE_LOGOUT_POR_MINUTO = 5;
