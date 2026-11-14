import { ContatoPublico } from "@/app/contato-publico";
import { RodapeLegal } from "@/app/legal";
import { MarcaCartao } from "@/app/marca";
import { ESCOPOS_OAUTH, ESCOPOS_OAUTH_USO } from "@/lib/google-oauth";
import {
  CAMINHO_INICIO,
  CAMINHO_PRIVACIDADE,
  DATA_VIGENCIA_LEGAL,
  DECLARACAO_LIMITED_USE,
  NOME_DO_APP,
  URL_POLITICA_DADOS_GOOGLE,
  URL_REVOGAR_ACESSO_GOOGLE,
} from "@/lib/urls-app";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: `Termos de uso — ${NOME_DO_APP}`,
  description: `Condições de uso do ${NOME_DO_APP}, ferramenta pessoal do Dono do calendário.`,
};

export default function PaginaTermos() {
  return (
    <article className="pagina-legal">
      <MarcaCartao />
      <p className="pagina-legal-voltar">
        <Link href={CAMINHO_INICIO}>Voltar à página inicial</Link>
      </p>
      <h1 className="pagina-legal-titulo">Termos de uso</h1>
      <p className="pagina-legal-meta">
        Vigente a partir de {DATA_VIGENCIA_LEGAL}.
      </p>

      <section>
        <h2>1. O serviço</h2>
        <p>
          O {NOME_DO_APP} é uma ferramenta pessoal: uma conversa em português
          do Brasil que consulta disponibilidade no Google Agenda do Dono e,
          depois de Confirmação com «Sim», cria, altera ou cancela um
          compromisso. Não há outras contas, convidados nem uso compartilhado
          no produto.
        </p>
      </section>

      <section>
        <h2>2. Conta Google e escopos</h2>
        <p>
          Para usar o calendário real, o Dono conecta a própria conta Google.
          O aplicativo pede exatamente estes escopos:
        </p>
        <ul>
          {ESCOPOS_OAUTH.map((escopo) => (
            <li key={escopo}>
              <code>{escopo}</code> — {ESCOPOS_OAUTH_USO[escopo]}
            </li>
          ))}
        </ul>
        <p>
          O Dono pode revogar o acesso a qualquer momento em{" "}
          <a href={URL_REVOGAR_ACESSO_GOOGLE} rel="noopener noreferrer">
            {URL_REVOGAR_ACESSO_GOOGLE}
          </a>{" "}
          ou desconectando no próprio aplicativo.
        </p>
      </section>

      <section>
        <h2>3. Confirmação com «Sim»</h2>
        <p>
          Nenhuma marcação, alteração ou cancelamento vai ao Google Agenda
          sem a Confirmação do Dono. O sistema mostra o que entendeu; o Dono
          diz «Sim» para gravar ou «Não» para corrigir. A demonstração é só
          consulta: não grava compromisso.
        </p>
      </section>

      <section>
        <h2>4. Responsabilidade pelo calendário</h2>
        <p>
          O Google Agenda continua sendo a fonte da verdade dos compromissos.
          O Dono é responsável pelo conteúdo da conta Google e por conferir o
          que a Confirmação descreve antes de dizer «Sim». O {NOME_DO_APP} não
          oferece garantia de disponibilidade contínua nem de interpretação
          perfeita de cada frase.
        </p>
      </section>

      <section>
        <h2>5. Dados e privacidade</h2>
        <p>
          O tratamento dos dados está na{" "}
          <Link href={CAMINHO_PRIVACIDADE}>Política de privacidade</Link>. Em
          resumo: a descrição dos eventos não é armazenada nem enviada a
          terceiros; o histórico da conversa não é guardado; a sessão Google
          fica num cookie cifrado neste aparelho.
        </p>
        <p>
          {DECLARACAO_LIMITED_USE}. Política:{" "}
          <a href={URL_POLITICA_DADOS_GOOGLE} rel="noopener noreferrer">
            {URL_POLITICA_DADOS_GOOGLE}
          </a>
          .
        </p>
      </section>

      <section>
        <h2>6. Uso aceitável</h2>
        <p>
          O serviço destina-se ao uso pessoal do Dono na própria agenda. É
          vedado tentar contornar a Confirmação, a proteção de origem das
          APIs, os limites de frequência ou usar a instância para tratar
          agenda de terceiros.
        </p>
      </section>

      <section>
        <h2>7. Contato e alterações</h2>
        <p>
          Dúvidas: <ContatoPublico />. Estes termos podem ser atualizados; a
          data de vigência permanece visível no topo desta página.
        </p>
      </section>

      <RodapeLegal />
    </article>
  );
}
