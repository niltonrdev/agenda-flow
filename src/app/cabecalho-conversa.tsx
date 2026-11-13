"use client";

import { MarcaCompacta } from "@/app/marca";
import Link from "next/link";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

export function emailAbreviado(email: string): string {
  const local = email.split("@")[0] ?? email;
  if (local.length <= 14) return local;
  return `${local.slice(0, 12)}…`;
}

type CabecalhoConversaProps = {
  conectado: boolean;
  email: string | null;
  credencialConfigurada: boolean;
  desconectando: boolean;
  onDesconectar: () => void;
  ajuda: ReactNode;
};

export function CabecalhoConversa({
  conectado,
  email,
  credencialConfigurada,
  desconectando,
  onDesconectar,
  ajuda,
}: CabecalhoConversaProps) {
  const [aberto, setAberto] = useState(false);
  const idPainel = useId();
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      evento.preventDefault();
      setAberto(false);
      botaoRef.current?.focus();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const rotuloIndicador = conectado
    ? email
      ? `Conta conectada: ${email}. Abrir detalhes.`
      : "Conta Google conectada. Abrir detalhes."
    : "Demonstração. Abrir detalhes da conta.";

  return (
    <header className="conversa-topo" data-tutorial="topo">
      <div className="conversa-topo-linha">
        <MarcaCompacta />
        <div className="conversa-topo-acoes">
          <button
            ref={botaoRef}
            type="button"
            className={
              conectado
                ? "conversa-conta-indicador conversa-conta-indicador-ok"
                : "conversa-conta-indicador"
            }
            data-conta-indicador
            aria-expanded={aberto}
            aria-controls={idPainel}
            aria-label={rotuloIndicador}
            title={conectado ? (email ?? "Conta Google") : "Demonstração"}
            onClick={() => setAberto((atual) => !atual)}
          >
            <span className="conversa-conta-icone" aria-hidden="true">
              {conectado ? (
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <circle cx="12" cy="8" r="3.2" fill="currentColor" />
                  <path
                    d="M5.5 18.2c.8-3 3.4-5 6.5-5s5.7 2 6.5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                "D"
              )}
            </span>
            <span className="conversa-conta-rotulo">
              {conectado ? (email ? emailAbreviado(email) : "Google") : "Demo"}
            </span>
          </button>
          {ajuda}
        </div>
      </div>

      <div
        id={idPainel}
        className="conversa-conta-painel"
        data-conta-painel
        hidden={!aberto}
      >
        {conectado ? (
          <p className="conversa-google conversa-google-ok">
            {email
              ? `Conectado como ${email}.`
              : "Conta Google conectada. Reconecte para ver o e-mail desta conta."}{" "}
            A Consulta lê as agendas visíveis; a Marcação grava na principal.
          </p>
        ) : (
          <p className="conversa-google conversa-demo">
            Demonstração somente leitura: calendário de exemplo no servidor,
            sem gravar. Não é um calendário deste aparelho.
          </p>
        )}
        <div className="conversa-conta-acoes">
          {conectado ? (
            <button
              type="button"
              className="conversa-sair"
              onClick={onDesconectar}
              disabled={desconectando}
            >
              {desconectando ? "Saindo…" : "Desconectar"}
            </button>
          ) : credencialConfigurada ? (
            <a className="conversa-google-link" href="/api/auth/google">
              Conectar Google
            </a>
          ) : null}
          <Link className="conversa-google-link" href="/privacidade">
            Privacidade
          </Link>
        </div>
      </div>
    </header>
  );
}
