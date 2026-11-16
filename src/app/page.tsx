import { ContatoPublico } from "@/app/contato-publico";
import { RodapeLegal } from "@/app/legal";
import { MarcaCartao } from "@/app/marca";
import { ESCOPOS_OAUTH, ESCOPOS_OAUTH_USO } from "@/lib/google-oauth";
import {
  CAMINHO_CONVERSA,
  CAMINHO_PRIVACIDADE,
  CAMINHO_TERMOS,
  NOME_DO_APP,
} from "@/lib/urls-app";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: `${NOME_DO_APP} — conversa com o seu Google Agenda`,
  description:
    "Ferramenta pessoal para consultar disponibilidade e, depois de Confirmação, marcar, alterar ou cancelar compromissos no Google Agenda do Dono.",
};

export default function PaginaInicial() {
  return (
    <article className="pagina-inicio">
      <MarcaCartao />
      <header className="entrada-hero">
        <h1 className="entrada-titulo">{NOME_DO_APP}</h1>
        <p className="entrada-texto">
          Conversa em português do Brasil para consultar o Google Agenda e,
          depois de uma Confirmação com «Sim», marcar, alterar ou cancelar um
          compromisso. Só o calendário do Dono.
        </p>
      </header>

      <nav className="inicio-links-legais" aria-label="Documentos legais">
        <Link href={CAMINHO_PRIVACIDADE}>Privacidade</Link>
        <Link href={CAMINHO_TERMOS}>Termos de uso</Link>
      </nav>

      <p className="inicio-acoes">
        <Link className="entrada-botao-google" href={CAMINHO_CONVERSA}>
          Abrir a conversa
        </Link>
      </p>

      <section>
        <h2>Como usa o Google Agenda</h2>
        <p>
          A Consulta lê as agendas visíveis da conta para dizer se um dia ou um
          período está livre. A Marcação, a Alteração e o Cancelamento só
          acontecem depois que o Dono confirma com «Sim»; a gravação vai só na
          agenda principal.
        </p>
        <p>
          O aplicativo pede exatamente estes escopos OAuth — nenhum além
          destes:
        </p>
        <ul className="inicio-escopos">
          {ESCOPOS_OAUTH.map((escopo) => (
            <li key={escopo}>
              <code>{escopo}</code> — {ESCOPOS_OAUTH_USO[escopo]}
            </li>
          ))}
        </ul>
        <p>
          A descrição dos eventos é lida só em memória, no servidor, para casar
          buscas por termo. Não é armazenada, não vai para cookie nem log, não
          aparece na conversa e não é enviada a outros serviços. O histórico da
          conversa também não é guardado.
        </p>
      </section>

      <section>
        <h2>Demonstração</h2>
        <p>
          Sem conectar o Google, a conversa usa um calendário de exemplo
          somente leitura. Nada é gravado nesse modo.
        </p>
      </section>

      <p className="inicio-contato">
        Contato: <ContatoPublico />
      </p>

      <RodapeLegal />
    </article>
  );
}
