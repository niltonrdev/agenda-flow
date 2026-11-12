"use client";

import {
  DICA_DITADO_TECLADO,
  DICA_OUVINDO,
  ROTULO_CANCELAR_GRAVACAO,
  ROTULO_CANCELAR_MICROFONE,
  ROTULO_ENVIAR,
  ROTULO_MICROFONE,
  ROTULO_SOLTAR_MICROFONE,
  ROTULO_TRAVAR_MICROFONE,
} from "@/app/conversa-campo";
import {
  acaoAoSoltarMicrofone,
  destinoDoGestoMicrofone,
  mostraAcoesGravacaoTravada,
  type DestinoGestoMicrofone,
  type FaseMicrofone,
} from "@/lib/gesto-microfone";
import {
  criarSessaoReconhecimento,
  suportaReconhecimentoVoz,
  type SessaoReconhecimento,
} from "@/lib/reconhecimento-voz";
import { useEffect, useRef, useState } from "react";

export type { FaseMicrofone };

type Props = {
  disabled?: boolean;
  textoBase: string;
  geracaoCampo?: number;
  onTranscricao: (texto: string) => void;
  onErro: (mensagem: string | null) => void;
  onDica: (dica: string | null) => void;
  onFase?: (fase: FaseMicrofone) => void;
  onEnviar?: (texto: string) => void;
};

function juntarFala(base: string, falado: string): string {
  const a = base.trim();
  const b = falado.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} ${b}`;
}

function IconeEnviar() {
  return (
    <svg
      className="conversa-acao-icone"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M3.2 20.8 21 12 3.2 3.2 3.2 10.1 15.4 12 3.2 13.9z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconeMicrofone() {
  return (
    <svg
      className="conversa-acao-icone"
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
  );
}

export function MicrofoneWhatsApp({
  disabled,
  textoBase,
  geracaoCampo = 0,
  onTranscricao,
  onErro,
  onDica,
  onFase,
  onEnviar,
}: Props) {
  const [fase, setFase] = useState<FaseMicrofone>("idle");
  const [destino, setDestino] = useState<DestinoGestoMicrofone>("segurar");
  const [textoOuvido, setTextoOuvido] = useState("");
  const sessaoRef = useRef<SessaoReconhecimento | null>(null);
  const origemRef = useRef<{ x: number; y: number } | null>(null);
  const inicioRef = useRef(0);
  const textoAntesRef = useRef("");
  const baseRef = useRef("");
  const juntoRef = useRef("");
  const destinoRef = useRef<DestinoGestoMicrofone>("segurar");
  const faseRef = useRef<FaseMicrofone>("idle");
  const geracaoRef = useRef(geracaoCampo);
  const ignorarClickRef = useRef(false);

  function mudarFase(proxima: FaseMicrofone) {
    faseRef.current = proxima;
    setFase(proxima);
    onFase?.(proxima);
  }

  useEffect(() => {
    return () => {
      sessaoRef.current?.parar();
    };
  }, []);

  useEffect(() => {
    if (geracaoRef.current === geracaoCampo) return;
    geracaoRef.current = geracaoCampo;
    sessaoRef.current?.parar();
    origemRef.current = null;
    inicioRef.current = 0;
    juntoRef.current = "";
    setTextoOuvido("");
    setDestino("segurar");
    destinoRef.current = "segurar";
    if (faseRef.current !== "idle") {
      faseRef.current = "idle";
      setFase("idle");
      onFase?.("idle");
    }
  }, [geracaoCampo, onFase]);

  function garantirSessao(): SessaoReconhecimento | null {
    if (sessaoRef.current) return sessaoRef.current;
    if (!suportaReconhecimentoVoz()) return null;

    sessaoRef.current = criarSessaoReconhecimento({
      lang: "pt-BR",
      aoParcial: (parcial) => {
        const junto = juntarFala(baseRef.current, parcial);
        juntoRef.current = junto;
        setTextoOuvido(junto);
        onTranscricao(junto);
      },
      aoFinal: (final) => {
        const junto = juntarFala(baseRef.current, final);
        baseRef.current = junto;
        juntoRef.current = junto;
        setTextoOuvido(junto);
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
    setTextoOuvido(textoBase.trim());
    origemRef.current = { x, y };
    inicioRef.current = Date.now();
    destinoRef.current = "segurar";
    setDestino("segurar");
    mudarFase("segurando");
    sessao.iniciar();
    return true;
  }

  function voltarAoIdle() {
    origemRef.current = null;
    inicioRef.current = 0;
    setDestino("segurar");
    destinoRef.current = "segurar";
    mudarFase("idle");
  }

  function cancelarGravacao() {
    sessaoRef.current?.parar();
    onTranscricao(textoAntesRef.current);
    setTextoOuvido("");
    juntoRef.current = "";
    voltarAoIdle();
  }

  function pararMantendoTexto() {
    sessaoRef.current?.parar();
    voltarAoIdle();
  }

  function enviarGravacao() {
    const texto = juntoRef.current.trim() || textoOuvido.trim();
    sessaoRef.current?.parar();
    voltarAoIdle();
    if (texto) onEnviar?.(texto);
  }

  function rotuloDoMicrofone(): string {
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
    ignorarClickRef.current = true;
    if (faseRef.current === "travado") return;
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
    const duracao = Date.now() - inicioRef.current;
    const acao = acaoAoSoltarMicrofone(destinoRef.current, duracao);
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

  function aoCliqueTeclado() {
    if (ignorarClickRef.current) {
      ignorarClickRef.current = false;
      return;
    }
    if (disabled) return;
    if (faseRef.current === "idle") {
      if (comecar(0, 0)) mudarFase("travado");
    }
  }

  const ouvindo = fase !== "idle";
  const cancelando = fase === "segurando" && destino === "cancela";
  const travando = fase === "segurando" && destino === "trava";
  const rotulo = rotuloDoMicrofone();
  const acoesTravadas = mostraAcoesGravacaoTravada(fase);

  if (acoesTravadas) {
    return (
      <div
        data-tutorial="microfone"
        className="conversa-gravacao-travada"
      >
        <button
          type="button"
          className="conversa-gravacao-cancelar"
          onClick={cancelarGravacao}
          disabled={disabled}
        >
          {ROTULO_CANCELAR_GRAVACAO}
        </button>
        <p className="conversa-gravacao-status" role="status">
          <span className="conversa-gravacao-ponto" aria-hidden="true" />
          {DICA_OUVINDO}
        </p>
        <button
          type="button"
          className="conversa-acao-circular"
          onClick={enviarGravacao}
          disabled={disabled || textoOuvido.trim() === ""}
          aria-label={ROTULO_ENVIAR}
          title={ROTULO_ENVIAR}
        >
          <IconeEnviar />
        </button>
      </div>
    );
  }

  return (
    <div
      data-tutorial="microfone"
      className={[
        "microfone-whatsapp",
        ouvindo ? "microfone-whatsapp-ativo" : "",
        cancelando ? "microfone-whatsapp-cancela" : "",
        travando ? "microfone-whatsapp-trava" : "",
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
          ouvindo
            ? "conversa-acao-circular conversa-acao-circular-gravando"
            : "conversa-acao-circular"
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
        onClick={aoCliqueTeclado}
        onContextMenu={(evento) => evento.preventDefault()}
      >
        <IconeMicrofone />
      </button>
      <span className="sr-only" role="status">
        {ouvindo ? DICA_OUVINDO : ""}
      </span>
    </div>
  );
}
