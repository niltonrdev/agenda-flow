"use client";

import type { ConfirmacaoPendente } from "@/domain/confirmacao";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type MensagemNaTela = {
  id: string;
  papel: "dono" | "agenda";
  texto: string;
};

export default function ConversaPage() {
  const [mensagens, setMensagens] = useState<MensagemNaTela[]>([
    {
      id: "boas-vindas",
      papel: "agenda",
      texto:
        "Olá. Pergunte por um dia ou um recorte, por exemplo “15 de novembro”, “pescaria do dia 4 ao 7” ou “esse fim de semana”.",
    },
  ]);
  const [rascunho, setRascunho] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacaoPendente, setConfirmacaoPendente] =
    useState<ConfirmacaoPendente | null>(null);
  const [google, setGoogle] = useState<{
    credencialConfigurada: boolean;
    conectado: boolean;
  } | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, carregando, erro]);

  useEffect(() => {
    void fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then((dados: { credencialConfigurada?: boolean; conectado?: boolean }) => {
        setGoogle({
          credencialConfigurada: Boolean(dados.credencialConfigurada),
          conectado: Boolean(dados.conectado),
        });
      })
      .catch(() => {
        setGoogle({ credencialConfigurada: false, conectado: false });
      });
  }, []);

  async function enviar() {
    const texto = rascunho.trim();
    if (!texto || carregando) return;

    setErro(null);
    setRascunho("");
    const idDono = `dono-${Date.now()}`;
    setMensagens((atual) => [
      ...atual,
      { id: idDono, papel: "dono", texto },
    ]);
    setCarregando(true);

    try {
      const resposta = await fetch("/api/conversa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: texto,
          confirmacaoPendente,
        }),
      });
      const dados = (await resposta.json()) as {
        texto?: string;
        erro?: string;
        confirmacaoPendente?: ConfirmacaoPendente | null;
      };

      if (!resposta.ok) {
        throw new Error(dados.erro ?? "Falha ao falar com a agenda.");
      }

      setConfirmacaoPendente(dados.confirmacaoPendente ?? null);
      setMensagens((atual) => [
        ...atual,
        {
          id: `agenda-${Date.now()}`,
          papel: "agenda",
          texto: dados.texto ?? "",
        },
      ]);
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível obter a resposta. Tente de novo.",
      );
    } finally {
      setCarregando(false);
      campoRef.current?.focus();
    }
  }

  function aoTeclar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      void enviar();
    }
  }

  return (
    <div className="conversa-shell">
      <header className="conversa-topo">
        <p className="conversa-marca">Agenda Inteligente</p>
        <p className="conversa-sub">Conversa com o seu Calendário</p>
        {google?.credencialConfigurada && !google.conectado ? (
          <p className="conversa-google">
            <a className="conversa-google-link" href="/api/auth/google">
              Conectar conta Google
            </a>
            <span> — a sessão fica salva neste aparelho.</span>
          </p>
        ) : null}
        {google?.conectado ? (
          <p className="conversa-google conversa-google-ok">
            Conta Google conectada. A Consulta lê as agendas visíveis; a
            Marcação grava na principal.
          </p>
        ) : null}
      </header>

      <main className="conversa-fio" aria-live="polite">
        {mensagens.map((m) => (
          <div
            key={m.id}
            className={
              m.papel === "dono" ? "balao balao-dono" : "balao balao-agenda"
            }
          >
            <p className="balao-texto">{m.texto}</p>
          </div>
        ))}

        {carregando ? (
          <div className="balao balao-agenda balao-carregando" role="status">
            <span className="ponto" />
            <span className="ponto" />
            <span className="ponto" />
            <span className="sr-only">Preparando a resposta…</span>
          </div>
        ) : null}

        {erro ? (
          <p className="conversa-erro" role="alert">
            {erro}
          </p>
        ) : null}

        <div ref={fimRef} />
      </main>

      <form
        className="conversa-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <label className="sr-only" htmlFor="mensagem">
          Mensagem
        </label>
        <textarea
          id="mensagem"
          ref={campoRef}
          className="conversa-campo"
          rows={1}
          placeholder="Ex.: reunião com a Ana amanhã às 15h"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={aoTeclar}
          disabled={carregando}
          enterKeyHint="send"
          autoComplete="off"
        />
        <button
          type="submit"
          className="conversa-enviar"
          disabled={carregando || rascunho.trim() === ""}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
