import type { FaseMicrofone } from "@/lib/gesto-microfone";

/** Dica do campo: uma linha só, sem exemplo longo (corta no iPhone). */
export const PLACEHOLDER_MENSAGEM = "Fale ou escreva...";

export const ROTULO_MICROFONE = "Toque para falar, ou segure para gravar";

export const ROTULO_SOLTAR_MICROFONE = "Solte para o texto ficar na caixa";

export const ROTULO_TRAVAR_MICROFONE = "Solte para gravar com as mãos livres";

export const ROTULO_CANCELAR_MICROFONE = "Solte para cancelar";

export const ROTULO_CANCELAR_GRAVACAO = "Cancelar";

export const DICA_OUVINDO = "Ouvindo";

/** Resumo sempre visível no composer; o texto completo abre no disclosure. */
export const AVISO_VOZ_RESUMO = "Sobre o ditado";

export const AVISO_VOZ_COMPLETO =
  "O ditado usa o reconhecimento de voz do navegador; o áudio pode ser processado fora deste aparelho. Toque no microfone para falar com as mãos livres; segure para gravar enquanto o dedo estiver na tela.";

/** Quando o navegador não expõe Web Speech API. */
export const DICA_DITADO_TECLADO =
  "Este aparelho não reconhece voz no app. Toque no campo e use o microfone do teclado do iPhone; depois envie.";

export const ROTULO_VER_NO_CALENDARIO = "Ver no calendário";

export const ROTULO_ENVIAR = "Enviar";

export type AcaoCompositor = "microfone" | "enviar";

/** Campo vazio: só o microfone. Com texto (e sem gravar): a seta de enviar. */
export function acaoDoCompositor(
  texto: string,
  fase: FaseMicrofone,
): AcaoCompositor {
  if (fase !== "idle") return "microfone";
  return texto.trim() === "" ? "microfone" : "enviar";
}
