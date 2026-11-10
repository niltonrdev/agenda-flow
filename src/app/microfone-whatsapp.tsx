"use client";

import {
  DICA_DITADO_TECLADO,
  DICA_OUVINDO,
  ROTULO_CANCELAR_MICROFONE,
  ROTULO_MICROFONE,
  ROTULO_PARAR_MICROFONE,
  ROTULO_SOLTAR_MICROFONE,
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

  function mudarFase(proxima: "idle" | "segurando" | "travado") {
    faseRef.current = proxima;
    setFase(proxima);
  }

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
    onDica(null);
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
    mudarFase("segurando");
    sessao.iniciar();
    return true;
  }

  function cancelarGravacao() {
    sessaoRef.current?.parar();
    origemRef.current = null;
    mudarFase("idle");
    setDestino("segurar");
    destinoRef.current = "segurar";
    onTranscricao(textoAntesRef.current);
  }

  function pararMantendoTexto() {
    sessaoRef.current?.parar();
    origemRef.current = null;
    mudarFase("idle");
    setDestino("segurar");
    destinoRef.current = "segurar";
  }

  function rotuloDoMicrofone(): string {
    if (fase === "travado") return ROTULO_PARAR_MICROFONE;
    if (fase === "segurando" && destino === "cancela") {
      return ROTULO_CANCELAR_MICROFONE;
    }
    if (fase === "segurando" && destino === "trava") {
      return ROTULO_TRAVAR_MICROFONE;
    }
    if (fase === "segurando") return ROTULO_SOLTAR_MICROFONE;
    return ROTULO_MICROFONE;
  }

  function aoPointerDown(evento: React.PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (evento.button !== 0) return;
    evento.preventDefault();
    if (faseRef.current === "travado") {
      pararMantendoTexto();
      return;
    }
    evento.currentTarget.setPointerCapture(evento.pointerId);
    comecar(evento.clientX, evento.clientY);
  }

  function aoPointerMove(evento: React.PointerEvent<HTMLButtonElement>) {
    if (faseRef.current !== "segurando" || !origemRef.current) return;
    const proximo = destinoDoGestoMicrofone(origemRef.current, {
      x: evento.clientX,
      y: evento.clientY,
    });
    destinoRef.current = proximo;
    setDestino(proximo);
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
      mudarFase("travado");
      setDestino("trava");
      origemRef.current = null;
      return;
    }
    pararMantendoTexto();
  }

  const ouvindo = fase !== "idle";
  const cancelando = fase === "segurando" && destino === "cancela";
  const travando = fase === "segurando" && destino === "trava";
  const rotulo = rotuloDoMicrofone();

  return (
    <div
      data-tutorial="microfone"
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
      <button
        type="button"
        className={
          ouvindo ? "conversa-ditado conversa-ditado-ativo" : "conversa-ditado"
        }
        title={rotulo}
        aria-label={rotulo}
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
      <span className="sr-only" role="status">
        {ouvindo ? DICA_OUVINDO : ""}
      </span>
    </div>
  );
}
