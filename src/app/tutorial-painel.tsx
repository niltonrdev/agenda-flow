"use client";

import {
  PASSOS_TUTORIAL,
  ROTULO_AJUDA,
  ROTULO_CONCLUIR,
  ROTULO_PROXIMO,
  ROTULO_PULAR,
  ROTULO_VOLTAR,
  deveMostrarTutorialAutomatico,
  ehUltimoPasso,
  gravarTutorialVisto,
  indiceAposProximo,
  indiceAposVoltar,
  textoProgresso,
} from "@/app/tutorial-conversa";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type StorageTutorial = Pick<Storage, "getItem" | "setItem">;

type TutorialConversaProps = {
  aberto: boolean;
  onFechar: () => void;
};

export function TutorialConversa({ aberto, onFechar }: TutorialConversaProps) {
  const [indice, setIndice] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const passo = PASSOS_TUTORIAL[indice] ?? PASSOS_TUTORIAL[0];
  const ultimo = ehUltimoPasso(indice);

  useEffect(() => {
    if (!aberto) setIndice(0);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement;
    dialogRef.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onFechar();
        return;
      }
      if (evento.key !== "Tab") return;
      const raiz = dialogRef.current;
      if (!raiz) return;
      const focaveis = [
        ...raiz.querySelectorAll<HTMLElement>("button:not([disabled])"),
      ];
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimoFoco = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimoFoco.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimoFoco) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      if (anterior instanceof HTMLElement) anterior.focus();
    };
  }, [aberto, onFechar]);

  if (!aberto || !passo) return null;

  const camada = (
    <div className="tutorial-camada" data-tutorial-overlay="escuro">
      <div
        ref={dialogRef}
        className="tutorial-cartao"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
      >
        <p className="tutorial-progresso" role="status">
          {textoProgresso(indice)}
        </p>
        <h2 id={tituloId} className="tutorial-titulo">
          {passo.titulo}
        </h2>
        <p className="tutorial-texto">{passo.texto}</p>
        {passo.exemplo ? (
          <p className="tutorial-exemplo">Exemplo: “{passo.exemplo}”</p>
        ) : null}
        <div className="tutorial-acoes">
          <button
            type="button"
            className="tutorial-botao tutorial-botao-pular"
            onClick={onFechar}
          >
            {ROTULO_PULAR}
          </button>
          <button
            type="button"
            className="tutorial-botao tutorial-botao-voltar"
            onClick={() => setIndice((atual) => indiceAposVoltar(atual))}
            disabled={indice === 0}
          >
            {ROTULO_VOLTAR}
          </button>
          <button
            type="button"
            className="tutorial-botao tutorial-botao-proximo"
            onClick={() => {
              if (ultimo) {
                onFechar();
                return;
              }
              setIndice((atual) => indiceAposProximo(atual));
            }}
          >
            {ultimo ? ROTULO_CONCLUIR : ROTULO_PROXIMO}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(camada, document.body);
}

export function BotaoAjuda({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="conversa-ajuda"
      onClick={onClick}
      aria-label={ROTULO_AJUDA}
      title={ROTULO_AJUDA}
    >
      ?
    </button>
  );
}

export function ControleTutorial({
  storage,
  abrirAutomatico = false,
  variante = "icone",
}: {
  storage?: StorageTutorial | null;
  abrirAutomatico?: boolean;
  variante?: "icone" | "texto";
}) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const store =
      storage ?? (typeof window === "undefined" ? null : window.localStorage);
    if (abrirAutomatico && deveMostrarTutorialAutomatico(store)) {
      setAberto(true);
    }
  }, [abrirAutomatico, storage]);

  function fechar() {
    gravarTutorialVisto(
      storage ?? (typeof window === "undefined" ? null : window.localStorage),
    );
    setAberto(false);
  }

  return (
    <>
      {variante === "texto" ? (
        <button
          type="button"
          className="entrada-botao-ajuda"
          onClick={() => setAberto(true)}
        >
          {ROTULO_AJUDA}
        </button>
      ) : (
        <BotaoAjuda onClick={() => setAberto(true)} />
      )}
      <TutorialConversa aberto={aberto} onFechar={fechar} />
    </>
  );
}
