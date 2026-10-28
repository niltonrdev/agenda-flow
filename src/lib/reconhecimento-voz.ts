/**
 * Reconhecimento de voz no aparelho via Web Speech API
 * (webkitSpeechRecognition no Safari/iPhone).
 */

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((ev: Event) => void) | null;
};

export type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

export type SpeechRecognitionErrorEventLike = {
  error: string;
};

type ConstrutorRecognition = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: ConstrutorRecognition;
    webkitSpeechRecognition?: ConstrutorRecognition;
  }
}

export function construtorReconhecimentoVoz(
  win: Window & typeof globalThis = window,
): ConstrutorRecognition | null {
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function suportaReconhecimentoVoz(
  win: Window & typeof globalThis = window,
): boolean {
  return construtorReconhecimentoVoz(win) != null;
}

/** Junta finais e o último parcial dos resultados do evento. */
export function textoDoResultado(
  evento: SpeechRecognitionResultEventLike,
): { final: string; parcial: string } {
  let final = "";
  let parcial = "";
  for (let i = evento.resultIndex; i < evento.results.length; i++) {
    const trecho = evento.results[i]?.[0]?.transcript ?? "";
    if (evento.results[i]?.isFinal) {
      final += trecho;
    } else {
      parcial += trecho;
    }
  }
  return { final: final.trim(), parcial: parcial.trim() };
}

export function mensagemErroReconhecimento(codigo: string): string {
  switch (codigo) {
    case "not-allowed":
    case "service-not-allowed":
      return "Permita o microfone neste site (Safari → aA → Site → Microfone) e tente de novo.";
    case "no-speech":
      return "Não ouvi nada. Toque no microfone e fale de novo.";
    case "audio-capture":
      return "Não consegui usar o microfone. Confira se outro app não está usando.";
    case "network":
      return "Falha de rede no reconhecimento de voz. Tente de novo.";
    case "aborted":
      return "";
    default:
      return "Não foi possível ouvir. Tente de novo ou digite a Mensagem.";
  }
}

export type SessaoReconhecimento = {
  iniciar: () => void;
  parar: () => void;
};

export function criarSessaoReconhecimento(opcoes: {
  lang?: string;
  aoParcial?: (texto: string) => void;
  aoFinal?: (texto: string) => void;
  aoErro?: (mensagem: string) => void;
  aoMudarEstado?: (ouvindo: boolean) => void;
  win?: Window & typeof globalThis;
}): SessaoReconhecimento | null {
  const win = opcoes.win ?? window;
  const Ctor = construtorReconhecimentoVoz(win);
  if (!Ctor) return null;

  const reconhecimento = new Ctor();
  reconhecimento.lang = opcoes.lang ?? "pt-BR";
  reconhecimento.continuous = true;
  reconhecimento.interimResults = true;
  reconhecimento.maxAlternatives = 1;

  let ativo = false;
  let reiniciar = false;

  reconhecimento.onstart = () => {
    ativo = true;
    opcoes.aoMudarEstado?.(true);
  };

  reconhecimento.onresult = (evento) => {
    const { final, parcial } = textoDoResultado(evento);
    if (parcial) opcoes.aoParcial?.(parcial);
    if (final) opcoes.aoFinal?.(final);
  };

  reconhecimento.onerror = (evento) => {
    const mensagem = mensagemErroReconhecimento(evento.error);
    if (evento.error === "aborted" || evento.error === "no-speech") {
      reiniciar = false;
    }
    if (mensagem) opcoes.aoErro?.(mensagem);
  };

  reconhecimento.onend = () => {
    ativo = false;
    if (reiniciar) {
      try {
        reconhecimento.start();
        return;
      } catch {
        reiniciar = false;
      }
    }
    opcoes.aoMudarEstado?.(false);
  };

  return {
    iniciar() {
      reiniciar = true;
      if (ativo) return;
      try {
        reconhecimento.start();
      } catch {
        reiniciar = false;
        opcoes.aoErro?.(
          "Não foi possível iniciar o microfone. Tente de novo.",
        );
        opcoes.aoMudarEstado?.(false);
      }
    },
    parar() {
      reiniciar = false;
      try {
        reconhecimento.stop();
      } catch {
        /* já parado */
      }
      if (ativo) {
        try {
          reconhecimento.abort();
        } catch {
          /* ignore */
        }
      }
      ativo = false;
      opcoes.aoMudarEstado?.(false);
    },
  };
}
