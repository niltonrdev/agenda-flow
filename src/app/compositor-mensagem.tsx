"use client";

import { AvisoVozDitado } from "@/app/aviso-voz-ditado";
import {
  PLACEHOLDER_MENSAGEM,
  ROTULO_ENVIAR,
  acaoDoCompositor,
} from "@/app/conversa-campo";
import {
  MicrofoneWhatsApp,
  type FaseMicrofone,
} from "@/app/microfone-whatsapp";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

type Props = {
  rascunho: string;
  onRascunho: (texto: string) => void;
  onEnviar: (texto?: string) => void;
  carregando?: boolean;
  dicaVoz: string | null;
  onDica: (dica: string | null) => void;
  onErro: (mensagem: string | null) => void;
  geracaoCampo: number;
  campoRef?: RefObject<HTMLTextAreaElement | null>;
};

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

export function CompositorMensagem({
  rascunho,
  onRascunho,
  onEnviar,
  carregando = false,
  dicaVoz,
  onDica,
  onErro,
  geracaoCampo,
  campoRef,
}: Props) {
  const [fase, setFase] = useState<FaseMicrofone>("idle");
  const mostrarSeta = acaoDoCompositor(rascunho, fase) === "enviar";
  const travado = fase === "travado";

  function aoTeclar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      onEnviar();
    }
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    onEnviar();
  }

  return (
    <form className="conversa-composer" onSubmit={aoEnviar}>
      <label className="sr-only" htmlFor="mensagem">
        Mensagem
      </label>
      <AvisoVozDitado />
      {dicaVoz ? (
        <p className="conversa-dica-ditado" role="status">
          {dicaVoz}
        </p>
      ) : null}
      <div
        className={
          travado
            ? "conversa-linha-envio conversa-linha-envio-travada"
            : "conversa-linha-envio"
        }
        data-tutorial="composer"
      >
        <textarea
          id="mensagem"
          ref={campoRef}
          className="conversa-campo"
          rows={1}
          placeholder={PLACEHOLDER_MENSAGEM}
          value={rascunho}
          onChange={(e) => onRascunho(e.target.value)}
          onKeyDown={aoTeclar}
          disabled={carregando}
          readOnly={fase !== "idle"}
          enterKeyHint="send"
          autoComplete="off"
          inputMode="text"
          lang="pt-BR"
        />
        {mostrarSeta ? (
          <button
            type="submit"
            className="conversa-acao-circular"
            disabled={carregando || rascunho.trim() === ""}
            aria-label={ROTULO_ENVIAR}
            title={ROTULO_ENVIAR}
            data-tutorial="microfone"
          >
            <IconeEnviar />
          </button>
        ) : (
          <MicrofoneWhatsApp
            disabled={carregando}
            textoBase={rascunho}
            geracaoCampo={geracaoCampo}
            onTranscricao={onRascunho}
            onErro={onErro}
            onDica={onDica}
            onFase={setFase}
            onEnviar={onEnviar}
          />
        )}
      </div>
    </form>
  );
}
