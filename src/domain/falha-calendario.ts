/** Falha da porta Calendário (Google indisponível, OAuth, HTTP). */
export const RESPOSTA_NAO_GRAVADO =
  "O Calendário não respondeu. Não foi gravado.";

export type CodigoFalhaCalendario =
  | "temporaria"
  | "reconectar"
  | "permissao"
  | "configuracao";

export const MENSAGEM_FALHA: Record<CodigoFalhaCalendario, string> = {
  temporaria: RESPOSTA_NAO_GRAVADO,
  reconectar:
    "A conexão com o Google expirou ou não vale mais. Toque em Desconectar e entre de novo.",
  permissao:
    "Esta conta não autorizou o Calendário com as permissões necessárias. Toque em Conectar de novo e aceite o acesso à agenda.",
  configuracao:
    "O servidor ainda não está pronto para o Google. Quem publica o app precisa conferir a configuração.",
};

export class FalhaDoCalendario extends Error {
  readonly codigo: CodigoFalhaCalendario;

  constructor(
    mensagem: string = RESPOSTA_NAO_GRAVADO,
    codigo: CodigoFalhaCalendario = "temporaria",
  ) {
    super(mensagem);
    this.name = "FalhaDoCalendario";
    this.codigo = codigo;
  }
}

export function falhaDoCalendario(
  codigo: CodigoFalhaCalendario,
): FalhaDoCalendario {
  return new FalhaDoCalendario(MENSAGEM_FALHA[codigo], codigo);
}

export function falhaDeHttpGoogle(status: number): FalhaDoCalendario {
  if (status === 401) return falhaDoCalendario("reconectar");
  if (status === 403) return falhaDoCalendario("permissao");
  return falhaDoCalendario("temporaria");
}
