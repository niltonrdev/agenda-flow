/** sessionStorage: o Dono entrou em demonstração neste aparelho. */
export const CHAVE_DEMO = "agenda-demo";

/**
 * Segredo só para assinar o cookie da Confirmação no modo demonstração,
 * quando GOOGLE_TOKEN_SECRET falta (ex.: preview). Não cifra sessão Google.
 */
export const SEGREDO_PROPOSTA_DEMO =
  "agenda-demo-proposta-local-nao-google-32b";
