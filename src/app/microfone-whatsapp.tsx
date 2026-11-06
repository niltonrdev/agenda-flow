"use client";

import {
  DICA_DITADO_TECLADO,
  DICA_GRAVACAO_TRAVADA,
  DICA_OUVINDO,
  ROTULO_CANCELAR_MICROFONE,
  ROTULO_MICROFONE,
  ROTULO_PARAR_MICROFONE,
  ROTULO_TRAVAR_MICROFONE,
} from "@/app/conversa-campo";
import {
  acaoAoSoltarMicrofone,
  destinoDoGestoMicrofone,
  type DestinoGestoMicrofone,
} from "@/lib/gesto-microfone";
import {
  criarSessaoReconhecimento,
  suportaReconhecimentoVoz,
  type SessaoReconhecimento,
} from "@/lib/reconhecimento-voz";
import { useEffect, useRef, useState } from "react";

type Props = {
  disabled?: boolean;
  textoBase: string;
  onTranscricao: (texto: string) => void;
  onEnviar: (texto: string) => void;
  onErro: (mensagem: string | null) => void;
  onDica: (dica: string | null) => void;
};

function juntarFala(base: string, falado: string): string {
  const a = base.trim();
  const b = falado.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} ${b}`;
}

export function MicrofoneWhatsApp({
  disabled,
  textoBase,
  onTranscricao,
  onEnviar,
  onErro,
  onDica,
}: Props) {
  const [fase, setFase] = useState<"idle" | "segurando" | "travado">("idle");
  const [destino, setDestino] = useState<DestinoGestoMicrofone>("segurar");
  const sessaoRef = useRef<SessaoReconhecimento | null>(null);
  const origemRef = useRef<{ x: number; y: number } | null>(null);
  const textoAntesRef = useRef("");
  const baseRef = useRef("");
  const juntoRef = useRef("");
  const destinoRef = useRef<DestinoGestoMicrofone>("segurar");
  const faseRef = useRef<"idle" | "segurando" | "travado">("idle");

  useEffect(() => {
    faseRef.current = fase;
  }, [fase]);

  useEffect(() => {
    return () => {
      sessaoRef.current?.parar();
    };
  }, []);

  function garantirSessao(): SessaoReconhecimento | null {
    if (sessaoRef.current) return sessaoRef.current;
    if (!suportaReconhecimentoVoz()) return null;

    sessaoRef.current = criarSessaoReconhecimento({
      lang: "pt-BR",
      aoParcial: (parcial) => {
        const junto = juntarFala(baseRef.current, parcial);
        juntoRef.current = junto;
        onTranscricao(junto);
      },
      aoFinal: (final) => {
        const junto = juntarFala(baseRef.current, final);
        baseRef.current = junto;
        juntoRef.current = junto;
        onTranscricao(junto);
      },
      aoErro: (mensagem) => {
        onErro(mensagem);
        onDica(null);
      },
    });
    return sessaoRef.current;
  }

  function comecar(x: number, y: number) {
    onErro(null);
    const sessao = garantirSessao();
    if (!sessao) {
      onDica(DICA_DITADO_TECLADO);
      return false;
    }
    textoAntesRef.current = textoBase;
    baseRef.current = textoBase.trim();
    juntoRef.current = textoBase.trim();
    origemRef.current = { x, y };
    destinoRef.current = "segurar";
    setDestino("segurar");
    setFase("segurando");
    onDica(DICA_OUVINDO);
    sessao.iniciar();
    return true;
  }

  function cancelarGravacao() {
    sessaoRef.current?.parar();
    origemRef.current = null;
    setFase("idle");
    setDestino("segurar");
    destinoRef.current = "segurar";
    onTranscricao(textoAntesRef.current);
    onDica(null);
  }

  function enviarOuvido() {
    sessaoRef.current?.parar();
    origemRef.current = null;
    setFase("idle");
    setDestino("segurar");
    destinoRef.current = "segurar";
    onDica(null);
    const texto = juntoRef.current.trim();
    if (texto) onEnviar(texto);
  }

  function aoPointerDown(evento: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || fase === "travado") return;
    if (evento.button !== 0) return;
    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    comecar(evento.clientX, evento.clientY);
  }

  function aoPointerMove(evento: React.PointerEvent<HTMLButtonElement>) {
    if (fase !== "segurando" || !origemRef.current) return;
    const proximo = destinoDoGestoMicrofone(origemRef.current, {
      x: evento.clientX,
      y: evento.clientY,
    });
    destinoRef.current = proximo;
    setDestino(proximo);
    if (proximo === "cancela") {
      onDica(ROTULO_CANCELAR_MICROFONE);
    } else if (proximo === "trava") {
      onDica(ROTULO_TRAVAR_MICROFONE);
    } else {
      onDica(DICA_OUVINDO);
    }
  }

  function aoPointerUp() {
    if (faseRef.current === "travado") return;
    if (faseRef.current !== "segurando") return;
    const acao = acaoAoSoltarMicrofone(destinoRef.current);
    if (acao === "cancelar") {
      cancelarGravacao();
      return;
    }
    if (acao === "manter") {
      setFase("travado");
      setDestino("trava");
      origemRef.current = null;
      onDica(DICA_GRAVACAO_TRAVADA);
      return;
    }
    enviarOuvido();
  }

  const ouvindo = fase !== "idle";
  const cancelando = fase === "segurando" && destino === "cancela";
  const travando = fase === "segurando" && destino === "trava";

  return (
    <div
      className={[
        "microfone-whatsapp",
        ouvindo ? "microfone-whatsapp-ativo" : "",
        cancelando ? "microfone-whatsapp-cancela" : "",
        travando || fase === "travado" ? "microfone-whatsapp-trava" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {fase === "segurando" ? (
        <div className="microfone-whatsapp-dicas" aria-hidden="true">
          <span className="microfone-whatsapp-trava-icone">⌃ trava</span>
          <span className="microfone-whatsapp-cancela-icone">← cancela</span>
        </div>
      ) : null}
      {fase === "travado" ? (
        <div className="microfone-whatsapp-travado" role="group">
          <button
            type="button"
            className="conversa-nao"
            onClick={cancelarGravacao}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="conversa-sim"
            onClick={enviarOuvido}
          >
            Enviar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={
            ouvindo ? "conversa-ditado conversa-ditado-ativo" : "conversa-ditado"
          }
          title={
            cancelando
              ? ROTULO_CANCELAR_MICROFONE
              : travando
                ? ROTULO_TRAVAR_MICROFONE
                : ouvindo
                  ? ROTULO_PARAR_MICROFONE
                  : ROTULO_MICROFONE
          }
          aria-label={
            cancelando
              ? ROTULO_CANCELAR_MICROFONE
              : travando
                ? ROTULO_TRAVAR_MICROFONE
                : ouvindo
                  ? ROTULO_PARAR_MICROFONE
                  : ROTULO_MICROFONE
          }
          aria-pressed={ouvindo}
          disabled={disabled}
          onPointerDown={aoPointerDown}
          onPointerMove={aoPointerMove}
          onPointerUp={aoPointerUp}
          onPointerCancel={() => {
            if (faseRef.current === "segurando") cancelarGravacao();
          }}
          onContextMenu={(evento) => evento.preventDefault()}
        >
          <svg
            className="conversa-ditado-icone"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M6 11a6 6 0 0 0 12 0" />
            <path d="M12 17v4" />
          </svg>
        </button>
      )}
    </div>
  );
}
