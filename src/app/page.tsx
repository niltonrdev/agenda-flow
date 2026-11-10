"use client";

import { AvisoVozDitado } from "@/app/aviso-voz-ditado";
import {
  PLACEHOLDER_MENSAGEM,
  ROTULO_ENVIAR,
  ROTULO_VER_NO_CALENDARIO,
} from "@/app/conversa-campo";
import { MicrofoneWhatsApp } from "@/app/microfone-whatsapp";
import { SeletorDiasPeriodo } from "@/app/seletor-dias";
import { ehAparelhoIos, urlAbrirCalendario } from "@/lib/link-calendario";
import { cssAlturaViewportVisual } from "@/lib/viewport-visual";
import {
  pedeSimOuNao,
  type ConfirmacaoPendente,
} from "@/domain/confirmacao";
import { mensagemAPartirDoCampo } from "@/domain/transcritor";
import { obterTranscritor } from "@/lib/transcritor-app";
import { AvisoRascunho, RodapeLegal } from "@/app/legal";
import { MarcaCartao, MarcaCompacta } from "@/app/marca";
import Link from "next/link";
import {
  Fragment,
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
  email: string | null;
  motivo: string | null;
};

const CHAVE_DEMO = "agenda-demo";

export default function ConversaPage() {
  const [mensagens, setMensagens] = useState<MensagemNaTela[]>([
    {
      id: "boas-vindas",
      papel: "agenda",
      texto:
        "Olá. Consulte um dia (“15/10”, “15 de novembro”) ou marque com horário (“reunião com a Ana amanhã às 15h”) e toque em Sim na Confirmação. Sem horário, eu peço. Sem ano, uso a próxima data futura.",
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
  const [desconectando, setDesconectando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, carregando, erro, confirmacaoPendente]);

  useEffect(() => {
    try {
      setDemoLocal(sessionStorage.getItem(CHAVE_DEMO) === "1");
    } catch {
      setDemoLocal(false);
    }

    const params = new URLSearchParams(window.location.search);
    const googleParam = params.get("google");
    if (googleParam === "falha" || googleParam === "negado" || googleParam === "host") {
      setAvisoAuth(
        googleParam === "negado"
          ? "A conexão com o Google foi cancelada. Tente de novo quando quiser."
          : googleParam === "host"
            ? "Este endereço não pode usar o redirect configurado no servidor (aponta para outro host). No Preview, deixe GOOGLE_REDIRECT_URI vazio e cadastre no Google Cloud a URI exata deste host."
            : "Não foi possível conectar ao Google. Confira o redirect URI no Console e tente de novo.",
      );
    }
    if (googleParam) {
      window.history.replaceState({}, "", "/");
    }

    const viewport = window.visualViewport;
    const alinharViewport = () => {
      document.documentElement.style.setProperty(
        "--vvh",
        cssAlturaViewportVisual(viewport, window.innerHeight),
      );
    };
    alinharViewport();
    viewport?.addEventListener("resize", alinharViewport);
    viewport?.addEventListener("scroll", alinharViewport);

    void fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then(
        (dados: {
          credencialConfigurada?: boolean;
          conectado?: boolean;
          email?: string | null;
          motivo?: string | null;
        }) => {
          setGoogle({
            credencialConfigurada: Boolean(dados.credencialConfigurada),
            conectado: Boolean(dados.conectado),
            email: typeof dados.email === "string" ? dados.email : null,
            motivo: typeof dados.motivo === "string" ? dados.motivo : null,
          });
          if (dados.motivo === "reconectar" || dados.motivo === "permissao") {
            setAvisoAuth(
              dados.motivo === "permissao"
                ? "Esta conta não autorizou o Calendário com as permissões necessárias. Entre de novo e aceite o acesso à agenda."
                : "A conexão com o Google expirou ou não vale mais. Entre de novo.",
            );
          } else if (dados.motivo === "temporaria" && !dados.conectado) {
            setAvisoAuth(
              "Não foi possível confirmar a conexão com o Google agora. Tente de novo em instantes.",
            );
          }
        },
      )
      .catch(() => {
        setGoogle({
          credencialConfigurada: false,
          conectado: false,
          email: null,
          motivo: "configuracao",
        });
      });

    return () => {
      viewport?.removeEventListener("resize", alinharViewport);
      viewport?.removeEventListener("scroll", alinharViewport);
    };
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

  async function desconectarGoogle() {
    if (desconectando) return;
    setDesconectando(true);
    try {
      await fetch("/api/auth/google/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      /* o recarregamento limpa o estado local */
    }
    window.location.assign("/");
  }

  const naConversa = google != null && (google.conectado || demoLocal);
  const indiceUltimaAgenda = mensagens.findLastIndex(
    (item) => item.papel === "agenda",
  );

  async function enviar(textoPronto?: string) {
    const texto =
      textoPronto ??
      (await mensagemAPartirDoCampo(obterTranscritor(), rascunho));
    if (!texto || carregando) return;

    setDicaVoz(null);
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
          ultimoDiaConsultado,
        }),
      });
      const dados = (await resposta.json()) as {
        texto?: string;
        erro?: string;
        falha?: string | null;
        confirmacaoPendente?: ConfirmacaoPendente | null;
        ultimoDiaConsultado?: string | null;
        diaParaCalendario?: string | null;
      };

      if (dados.falha === "reconectar" || resposta.status === 401) {
        setGoogle((atual) =>
          atual
            ? { ...atual, conectado: false, email: null, motivo: "reconectar" }
            : atual,
        );
      }

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

  if (google == null) {
    return (
      <div className="entrada-shell">
        <MarcaCartao />
        <p className="entrada-aguarde">Preparando…</p>
      </div>
    );
  }

  if (!naConversa) {
    return (
      <div className="entrada-shell entrada-shell-home">
        <AvisoRascunho />
        <MarcaCartao />
        <header className="entrada-hero">
          <h1 className="entrada-titulo">Agenda Inteligente</h1>
          <p className="entrada-texto">
            Conversa pessoal para consultar a disponibilidade no seu Google
            Calendar e, depois de uma Confirmação, marcar, alterar ou cancelar
            um compromisso. Não há outras contas no produto: só o calendário
            do Dono.
          </p>
          <p className="entrada-texto">
            A Consulta lê as agendas visíveis. A Marcação grava só na agenda
            principal. O histórico da conversa não é guardado. A sessão Google
            fica num cookie cifrado neste aparelho por até 7 dias (ou 24 horas
            sem uso), fora de aba anônima.
          </p>
          <p className="entrada-texto entrada-texto-voz">
            O ditado usa o reconhecimento de voz do navegador. Em alguns
            aparelhos o áudio pode ser processado fora do dispositivo. A
            Agenda não envia o áudio a um modelo de linguagem próprio.
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
              pode entrar em demonstração com um calendário de exemplo
              somente leitura.
            </p>
          )}
          <button
            type="button"
            className="entrada-botao-demo"
            onClick={entrarEmDemonstracao}
          >
            Continuar em demonstração (só consulta)
          </button>
        </div>
        <RodapeLegal />
      </div>
    );
  }

  return (
    <div className="conversa-shell">
      <header className="conversa-topo">
        <MarcaCompacta />
        <p className="conversa-sub">Conversa com o seu Calendário</p>
        {google.conectado ? (
          <div className="conversa-conta">
            <p className="conversa-google conversa-google-ok">
              {google.email
                ? `Conectado como ${google.email}`
                : "Conta Google conectada. Reconecte para ver o e-mail desta conta."}{" "}
              A Consulta lê as agendas visíveis; a Marcação grava na principal.{" "}
              <button
                type="button"
                className="conversa-sair"
                onClick={() => void desconectarGoogle()}
                disabled={desconectando}
              >
                {desconectando ? "Saindo…" : "Desconectar"}
              </button>
              {" · "}
              <Link className="conversa-google-link" href="/privacidade">
                Privacidade
              </Link>
            </p>
          </div>
        ) : null}
        {!google.conectado ? (
          <p className="conversa-google conversa-demo">
            Demonstração somente leitura: calendário de exemplo no servidor,
            sem gravar. Não é um calendário deste aparelho.
            {google.credencialConfigurada ? (
              <>
                {" "}
                <a className="conversa-google-link" href="/api/auth/google">
                  Conectar Google
                </a>
              </>
            ) : null}
            {" · "}
            <Link className="conversa-google-link" href="/privacidade">
              Privacidade
            </Link>
          </p>
        ) : null}
      </header>

      <main className="conversa-fio" aria-live="polite">
        {mensagens.map((m, indice) => {
          const ultimaAgenda =
            m.papel === "agenda" && indice === indiceUltimaAgenda;
          return (
            <Fragment key={m.id}>
          <div
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
            {ultimaAgenda && pedeSimOuNao(confirmacaoPendente) && !carregando ? (
              <div
                className="conversa-sim-nao"
                role="group"
                aria-label="Confirmação"
              >
                <button
                  type="button"
                  className="conversa-sim"
                  onClick={() => void enviar("sim")}
                >
                  Sim
                </button>
                <button
                  type="button"
                  className="conversa-nao"
                  onClick={() => void enviar("não")}
                >
                  Não
                </button>
              </div>
            ) : null}
            {ultimaAgenda &&
            confirmacaoPendente?.acao === "completar_duracao_periodo" &&
            !carregando ? (
              <div
                className="conversa-sim-nao"
                role="group"
                aria-label="Duração da viagem"
              >
                <button
                  type="button"
                  className="conversa-sim"
                  onClick={() => void enviar("1 dia")}
                >
                  1 dia
                </button>
                <button
                  type="button"
                  className="conversa-nao"
                  onClick={() => void enviar("mais dias")}
                >
                  Mais dias
                </button>
              </div>
            ) : null}
            {ultimaAgenda &&
            confirmacaoPendente?.acao === "completar_dias_periodo" &&
            !carregando ? (
              <SeletorDiasPeriodo
                diaSugerido={confirmacaoPendente.dia}
                onConfirmar={(mensagem) => void enviar(mensagem)}
              />
            ) : null}
            </Fragment>
          );
        })}

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
        <AvisoVozDitado />
        {dicaVoz ? (
          <p className="conversa-dica-ditado" role="status">
            {dicaVoz}
          </p>
        ) : null}
        <div className="conversa-linha-envio">
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
              }}
              onKeyDown={aoTeclar}
              disabled={carregando}
              enterKeyHint="send"
              autoComplete="off"
              inputMode="text"
              lang="pt-BR"
            />
            <MicrofoneWhatsApp
              disabled={carregando}
              textoBase={rascunho}
              onTranscricao={setRascunho}
              onErro={setErro}
              onDica={setDicaVoz}
            />
          </div>
          <button
            type="submit"
            className="conversa-enviar"
            disabled={carregando || rascunho.trim() === ""}
          >
            {ROTULO_ENVIAR}
          </button>
        </div>
      </form>
    </div>
  );
}
