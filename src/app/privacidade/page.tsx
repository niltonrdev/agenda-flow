import { ContatoPublico } from "@/app/contato-publico";
import { RodapeLegal } from "@/app/legal";
import { MarcaCartao } from "@/app/marca";
import { ESCOPOS_OAUTH, ESCOPOS_OAUTH_USO } from "@/lib/google-oauth";
import {
  CAMINHO_INICIO,
  DATA_VIGENCIA_LEGAL,
  DECLARACAO_LIMITED_USE,
  NOME_DO_APP,
  URL_POLITICA_DADOS_GOOGLE,
  URL_REVOGAR_ACESSO_GOOGLE,
} from "@/lib/urls-app";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: `Política de privacidade — ${NOME_DO_APP}`,
  description: `Como o ${NOME_DO_APP} trata os dados da conta Google e do Calendário do Dono.`,
};

export default function PaginaPrivacidade() {
  return (
    <article className="pagina-legal">
      <MarcaCartao />
      <p className="pagina-legal-voltar">
        <Link href={CAMINHO_INICIO}>Voltar à página inicial</Link>
      </p>
      <h1 className="pagina-legal-titulo">Política de privacidade</h1>
      <p className="pagina-legal-meta">
        Vigente a partir de {DATA_VIGENCIA_LEGAL}.
      </p>

      <section>
        <h2>1. Quem é o controlador</h2>
        <p>
          O {NOME_DO_APP} é uma ferramenta pessoal do Dono do calendário. O
          controlador dos dados pessoais é o responsável pela instância
          publicada. Contato: <ContatoPublico />.
        </p>
      </section>

      <section>
        <h2>2. O que o aplicativo faz</h2>
        <p>
          O {NOME_DO_APP} oferece uma conversa em português do Brasil para
          consultar disponibilidade e, depois de uma Confirmação com «Sim»,
          marcar, alterar ou cancelar compromissos no Google Agenda do Dono.
          Não há turma, convidados nem contas de terceiros no produto.
        </p>
      </section>

      <section>
        <h2>3. Dados lidos e gravados no Google Agenda</h2>
        <p>
          Com a conta Google conectada, o aplicativo pede exatamente estes
          escopos — nenhum além destes:
        </p>
        <ul>
          {ESCOPOS_OAUTH.map((escopo) => (
            <li key={escopo}>
              <code>{escopo}</code> — {ESCOPOS_OAUTH_USO[escopo]}
            </li>
          ))}
        </ul>
        <p>
          A Consulta lê as agendas visíveis. A Marcação grava só na agenda
          principal, após a Confirmação. O aplicativo não administra
          compartilhamento, ACLs nem o ciclo de vida das agendas.
        </p>
        <p>
          Os dados tratados incluem títulos, datas, horários e identificadores
          dos compromissos visíveis. A descrição dos eventos é lida só em
          memória, no servidor, para casar buscas por termo; não é armazenada,
          não vai para cookie nem log, não aparece na conversa e não é enviada
          a outros serviços. O histórico da conversa não é guardado pelo
          servidor: só a proposta pendente da Confirmação fica, por no máximo
          15 minutos, num cookie HttpOnly cifrado.
        </p>
      </section>

      <section>
        <h2>4. Tokens, cookies e retenção</h2>
        <p>
          O acesso e o refresh token do Google ficam num cookie HttpOnly,
          Secure em produção, SameSite=Lax, cifrado com AES-256-GCM. A sessão
          vale no máximo 7 dias e cai após 24 horas sem uso, validados no
          servidor. Tokens antigos só assinados deixam de ser aceitos.
        </p>
        <p>
          Quando a sessão expira ou o Dono desconecta, os cookies são apagados.
          Não há banco de dados de conversas nem arquivo de eventos fora do
          Google Agenda.
        </p>
      </section>

      <section>
        <h2>5. Exclusão e revogação de acesso</h2>
        <p>
          O Dono pode desconectar no próprio aplicativo: o cookie é apagado e
          o token é revogado no Google quando possível. Também é possível
          revogar o acesso em{" "}
          <a href={URL_REVOGAR_ACESSO_GOOGLE} rel="noopener noreferrer">
            {URL_REVOGAR_ACESSO_GOOGLE}
          </a>
          . Para apagar os compromissos, use o próprio Google Agenda — o{" "}
          {NOME_DO_APP} não guarda cópia deles.
        </p>
        <p>
          Pedidos de acesso, correção, exclusão ou portabilidade: fale com{" "}
          <ContatoPublico />.
        </p>
      </section>

      <section>
        <h2>6. Modo demonstração</h2>
        <p>
          Sem sessão Google, a conversa usa um calendário de exemplo recriado
          a cada pedido. Consultas e o fluxo de Confirmação (incluindo
          alterar e renomear) usam só esse seed: o «Sim» simula o resultado
          e nada é gravado no Google nem persiste no servidor. Não use a
          demonstração para dados reais.
        </p>
      </section>

      <section>
        <h2>7. Voz (ditado)</h2>
        <p>
          O microfone usa a Web Speech API do navegador. O reconhecimento
          pode ocorrer no aparelho ou em serviço do navegador/sistema — em
          alguns navegadores o áudio sai do aparelho. O {NOME_DO_APP} não
          envia áudio a um modelo de linguagem próprio e não guarda a
          transcrição em log. O texto ditado entra na conversa como qualquer
          outra mensagem e pode ser enviado ao servidor para interpretar o
          pedido.
        </p>
      </section>

      <section>
        <h2>8. Operadores e transferências</h2>
        <p>
          Google (OAuth e Calendar) e o provedor de hospedagem (Vercel, se a
          instância estiver lá) tratam dados como operadores/fornecedores.
          Isso pode implicar transferência internacional. Não há venda de
          dados, anúncios nem treinamento de inteligência artificial com o
          conteúdo da agenda.
        </p>
      </section>

      <section>
        <h2>9. Conformidade com a política de dados das APIs do Google</h2>
        <p>
          {DECLARACAO_LIMITED_USE}. Política:{" "}
          <a href={URL_POLITICA_DADOS_GOOGLE} rel="noopener noreferrer">
            {URL_POLITICA_DADOS_GOOGLE}
          </a>
          .
        </p>
        <p>
          O tratamento se apoia no consentimento do Dono ao conectar a conta
          Google e no uso exclusivo para as funções visíveis do aplicativo
          (consulta e mutação de compromissos após Confirmação). Os dados do
          Google são usados só para fornecer e melhorar essas funções, sem
          venda, sem anúncios e sem transferência que permita uso independente
          desses dados.
        </p>
      </section>

      <section>
        <h2>10. Segurança</h2>
        <p>
          Os tokens não trafegam em texto claro no cookie; a Confirmação é
          revalidada no servidor; o modo demonstração não grava no Google; há limite de
          frequência, verificação de origem e cabeçalhos de defesa do
          navegador. Nenhum controle elimina todo o risco.
        </p>
      </section>

      <RodapeLegal />
    </article>
  );
}
