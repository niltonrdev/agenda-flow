"use client";

import {
  DICA_DITADO_TECLADO,
  DICA_OUVINDO,
  PLACEHOLDER_MENSAGEM,
  ROTULO_MICROFONE,
  ROTULO_PARAR_MICROFONE,
  ROTULO_VER_NO_CALENDARIO,
} from "@/app/conversa-campo";
import { ehAparelhoIos, urlAbrirCalendario } from "@/lib/link-calendario";
import type { ConfirmacaoPendente } from "@/domain/confirmacao";
import { mensagemAPartirDoCampo } from "@/domain/transcritor";
import {
  criarSessaoReconhecimento,
  suportaReconhecimentoVoz,
  type SessaoReconhecimento,
} from "@/lib/reconhecimento-voz";
import { obterTranscritor } from "@/lib/transcritor-app";
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
  diaParaCalendario?: string | null;
};

type StatusGoogle = {
  credencialConfigurada: boolean;
  conectado: boolean;
};

const CHAVE_DEMO = "agenda-demo";

export default function ConversaPage() {
  const [mensagens, setMensagens] = useState<MensagemNaTela[]>([
    {
      id: "boas-vindas",
      papel: "agenda",
      texto:
        "Olá. Consulte um dia (“15/10”, “15 de novembro”) ou marque com horário (“reunião com a Ana amanhã às 15h”) e diga sim na Confirmação. Sem horário, eu peço. Sem ano, uso a próxima data futura.",
    },
  ]);
  const [rascunho, setRascunho] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacaoPendente, setConfirmacaoPendente] =
    useState<ConfirmacaoPendente | null>(null);
  const [ultimoDiaConsultado, setUltimoDiaConsultado] = useState<string | null>(
    null,
  );
  const [google, setGoogle] = useState<StatusGoogle | null>(null);
  const [demoLocal, setDemoLocal] = useState(false);
  const [avisoAuth, setAvisoAuth] = useState<string | null>(null);
  const [dicaVoz, setDicaVoz] = useState<string | null>(null);
  const [ouvindo, setOuvindo] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const sessaoVozRef = useRef<SessaoReconhecimento | null>(null);
  const baseAntesDoParcialRef = useRef("");

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, carregando, erro]);

  useEffect(() => {
    return () => {
      sessaoVozRef.current?.parar();
    };
  }, []);

  useEffect(() => {
    try {
      setDemoLocal(sessionStorage.getItem(CHAVE_DEMO) === "1");
    } catch {
      setDemoLocal(false);
    }

    const params = new URLSearchParams(window.location.search);
    const googleParam = params.get("google");
    if (googleParam === "falha" || googleParam === "negado") {
      setAvisoAuth(
        googleParam === "negado"
          ? "A conexão com o Google foi cancelada. Tente de novo quando quiser."
          : "Não foi possível conectar ao Google. Confira o redirect URI no Console e tente de novo.",
      );
    }
    if (googleParam) {
      window.history.replaceState({}, "", "/");
    }

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

  function entrarEmDemonstracao() {
    try {
      sessionStorage.setItem(CHAVE_DEMO, "1");
    } catch {
      /* ignore */
    }
    setDemoLocal(true);
    setAvisoAuth(null);
  }

  const naConversa = google != null && (google.conectado || demoLocal);

  async function enviar() {
    const texto = await mensagemAPartirDoCampo(
      obterTranscritor(),
      rascunho,
    );
    if (!texto || carregando) return;

    sessaoVozRef.current?.parar();
    setOuvindo(false);
    setDicaVoz(null);
    setErro(null);
    setRascunho("");
    baseAntesDoParcialRef.current = "";
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
          ultimoDiaConsultado,
        }),
      });
      const dados = (await resposta.json()) as {
        texto?: string;
        erro?: string;
        confirmacaoPendente?: ConfirmacaoPendente | null;
        ultimoDiaConsultado?: string | null;
        diaParaCalendario?: string | null;
      };

      if (!resposta.ok) {
        throw new Error(dados.erro ?? "Falha ao falar com a agenda.");
      }

      setConfirmacaoPendente(dados.confirmacaoPendente ?? null);
      setUltimoDiaConsultado(dados.ultimoDiaConsultado ?? null);
      setMensagens((atual) => [
        ...atual,
        {
          id: `agenda-${Date.now()}`,
          papel: "agenda",
          texto: dados.texto ?? "",
          diaParaCalendario: dados.diaParaCalendario ?? null,
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

  function juntarFala(base: string, falado: string): string {
    const a = base.trim();
    const b = falado.trim();
    if (!a) return b;
    if (!b) return a;
    return `${a} ${b}`;
  }

  function garantirSessaoVoz(): SessaoReconhecimento | null {
    if (sessaoVozRef.current) return sessaoVozRef.current;
    if (!suportaReconhecimentoVoz()) return null;

    sessaoVozRef.current = criarSessaoReconhecimento({
      lang: "pt-BR",
      aoMudarEstado: (ativo) => {
        setOuvindo(ativo);
        setDicaVoz(ativo ? DICA_OUVINDO : null);
      },
      aoParcial: (parcial) => {
        setRascunho(juntarFala(baseAntesDoParcialRef.current, parcial));
      },
      aoFinal: (final) => {
        const junto = juntarFala(baseAntesDoParcialRef.current, final);
        baseAntesDoParcialRef.current = junto;
        setRascunho(junto);
      },
      aoErro: (mensagem) => {
        setErro(mensagem);
        setDicaVoz(null);
      },
    });
    return sessaoVozRef.current;
  }

  function alternarMicrofone() {
    setErro(null);
    if (ouvindo) {
      sessaoVozRef.current?.parar();
      setOuvindo(false);
      setDicaVoz(null);
      return;
    }

    const sessao = garantirSessaoVoz();
    if (!sessao) {
      setDicaVoz(DICA_DITADO_TECLADO);
      campoRef.current?.focus();
      return;
    }

    baseAntesDoParcialRef.current = rascunho.trim();
    setDicaVoz(DICA_OUVINDO);
    sessao.iniciar();
  }

  if (google == null) {
    return (
      <div className="entrada-shell">
        <p className="entrada-marca">Agenda Inteligente</p>
        <p className="entrada-aguarde">Preparando…</p>
      </div>
    );
  }

  if (!naConversa) {
    return (
      <div className="entrada-shell">
        <header className="entrada-hero">
          <p className="entrada-marca">Agenda Inteligente</p>
          <h1 className="entrada-titulo">Conecte para usar o seu calendário</h1>
          <p className="entrada-texto">
            Continue com o Google para consultar e marcar compromissos no seu
            Google Calendar. A conexão fica salva neste aparelho (até ~6 meses),
            fora de aba anônima. O histórico da conversa ainda não é guardado.
          </p>
        </header>

        {avisoAuth ? (
          <p className="entrada-aviso" role="alert">
            {avisoAuth}
          </p>
        ) : null}

        <div className="entrada-acoes">
          {google.credencialConfigurada ? (
            <a className="entrada-botao-google" href="/api/auth/google">
              Continuar com Google
            </a>
          ) : (
            <p className="entrada-sem-oauth">
              OAuth do Google ainda não está configurado neste servidor. Você
              pode entrar em demonstração com um calendário de exemplo.
            </p>
          )}
          <button
            type="button"
            className="entrada-botao-demo"
            onClick={entrarEmDemonstracao}
          >
            Continuar em demonstração
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="conversa-shell">
      <header className="conversa-topo">
        <p className="conversa-marca">Agenda Inteligente</p>
        <p className="conversa-sub">Conversa com o seu Calendário</p>
        {google.conectado ? (
          <p className="conversa-google conversa-google-ok">
            Conta Google conectada. A Consulta lê as agendas visíveis; a
            Marcação grava na principal.
          </p>
        ) : null}
        {!google.conectado ? (
          <p className="conversa-google conversa-demo">
            Modo demonstração: calendário de exemplo neste aparelho.
            {google.credencialConfigurada ? (
              <>
                {" "}
                <a className="conversa-google-link" href="/api/auth/google">
                  Conectar Google
                </a>
              </>
            ) : null}
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
            {google.conectado && m.diaParaCalendario ? (
              <a
                className="balao-calendario"
                href={urlAbrirCalendario(
                  m.diaParaCalendario,
                  typeof navigator === "undefined" ? "" : navigator.userAgent,
                )}
                target={
                  typeof navigator !== "undefined" &&
                  ehAparelhoIos(navigator.userAgent)
                    ? undefined
                    : "_blank"
                }
                rel="noopener noreferrer"
                aria-label={ROTULO_VER_NO_CALENDARIO}
                title={ROTULO_VER_NO_CALENDARIO}
              >
                <svg
                  className="balao-calendario-icone"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18" />
                  <path d="M8 3v4" />
                  <path d="M16 3v4" />
                </svg>
              </a>
            ) : null}
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
        {dicaVoz ? (
          <p className="conversa-dica-ditado" role="status">
            {dicaVoz}
          </p>
        ) : null}
        <div className="conversa-campo-com-ditado">
          <textarea
            id="mensagem"
            ref={campoRef}
            className="conversa-campo"
            rows={1}
            placeholder={PLACEHOLDER_MENSAGEM}
            value={rascunho}
            onChange={(e) => {
              setRascunho(e.target.value);
              if (!ouvindo) {
                baseAntesDoParcialRef.current = e.target.value.trim();
              }
            }}
            onKeyDown={aoTeclar}
            disabled={carregando}
            enterKeyHint="send"
            autoComplete="off"
            inputMode="text"
            lang="pt-BR"
          />
          <button
            type="button"
            className={
              ouvindo ? "conversa-ditado conversa-ditado-ativo" : "conversa-ditado"
            }
            title={ouvindo ? ROTULO_PARAR_MICROFONE : ROTULO_MICROFONE}
            aria-label={ouvindo ? ROTULO_PARAR_MICROFONE : ROTULO_MICROFONE}
            aria-pressed={ouvindo}
            disabled={carregando}
            onClick={alternarMicrofone}
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
        </div>
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
