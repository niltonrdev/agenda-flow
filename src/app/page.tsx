"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type ConfirmacaoNaTela =
  | {
      tipo: "periodo";
      titulo: string;
      primeiroDia: string;
      ultimoDia: string;
    }
  | {
      tipo: "pontual";
      titulo: string;
      inicio: string;
      fim: string;
    }
  | null;

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
        "Olá. Pergunte por um dia, por exemplo “15 de novembro”, ou marque com “pescaria do dia 4 ao 7”.",
    },
  ]);
  const [confirmacaoPendente, setConfirmacaoPendente] =
    useState<ConfirmacaoNaTela>(null);
  const [rascunho, setRascunho] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, carregando, erro]);

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
        body: JSON.stringify({ mensagem: texto, confirmacaoPendente }),
      });
      const dados = (await resposta.json()) as {
        texto?: string;
        erro?: string;
        confirmacaoPendente?: ConfirmacaoNaTela;
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
          placeholder="Ex.: pescaria do dia 4 ao 7"
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
