import { RodapeLegal } from "@/app/legal";
import { MarcaCartao } from "@/app/marca";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidade — Agenda Inteligente",
  description:
    "Como a Agenda Inteligente coleta, usa e protege os seus dados pessoais.",
};

export default function PaginaPrivacidade() {
  return (
    <article className="pagina-legal">
      <MarcaCartao />
      <p className="pagina-legal-voltar">
        <Link href="/">Voltar à página inicial</Link>
      </p>
      <h1 className="pagina-legal-titulo">Política de privacidade</h1>
      <p className="pagina-legal-meta">
        Última atualização: 13 de novembro de 2026.
      </p>

      <section>
        <h2>1. Quem é o controlador</h2>
        <p>
          A Agenda Inteligente é uma ferramenta pessoal do Dono do calendário.
          O controlador dos dados pessoais é o responsável pela instância
          publicada. Para entrar em contato:{" "}
          <a href="mailto:contato@agendainteligente.app">
            contato@agendainteligente.app
          </a>
          .
        </p>
      </section>

      <section>
        <h2>2. O que o aplicativo faz</h2>
        <p>
          A Agenda Inteligente oferece uma conversa em português para
          consultar disponibilidade e, depois de uma Confirmação, marcar,
          alterar ou cancelar compromissos no Google Calendar do Dono. Não há
          turma, convidados nem contas de terceiros no produto.
        </p>
      </section>

      <section>
        <h2>3. Dados lidos e gravados no Google Calendar</h2>
        <p>
          Com a conta Google conectada, o aplicativo pede os escopos
          <code> calendar.events </code>e
          <code> calendar.calendarlist.readonly</code>: lista as agendas
          visíveis, lê eventos no recorte pedido e cria, altera ou exclui
          eventos na agenda principal após a Confirmação. Não administra
          compartilhamento, ACLs nem o ciclo de vida das agendas.
        </p>
        <p>
          Os dados tratados incluem títulos, datas, horários e identificadores
          dos compromissos visíveis. O histórico da conversa não é guardado
          pelo servidor: só a proposta pendente da Confirmação fica, por
          poucos minutos, num cookie HttpOnly cifrado.
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
          O Dono pode desconectar no próprio aplicativo: o cookie é apagado e
          o token é revogado no Google quando possível. Também é possível
          revogar o acesso em https://myaccount.google.com/permissions.
        </p>
      </section>

      <section>
        <h2>5. Modo demonstração</h2>
        <p>
          Sem sessão Google, a conversa usa um calendário de exemplo somente
          leitura, recriado a cada pedido. Não há isolamento de dados
          pessoais nesse modo porque não se grava compromisso. Não use a
          demonstração para dados reais.
        </p>
      </section>

      <section>
        <h2>6. Voz (ditado)</h2>
        <p>
          O microfone usa a Web Speech API do navegador. O reconhecimento
          pode ocorrer no aparelho ou em serviço do navegador/sistema — em
          alguns navegadores o áudio sai do aparelho. A Agenda Inteligente
          não envia áudio a um modelo de linguagem próprio e não guarda a
          transcrição em log. O texto ditado entra na conversa como qualquer
          outra mensagem e pode ser enviado ao servidor para interpretar o
          pedido.
        </p>
      </section>

      <section>
        <h2>7. Operadores e transferências</h2>
        <p>
          Google (OAuth e Calendar) e o provedor de hospedagem (Vercel, se a
          instância estiver lá) tratam dados como operadores/fornecedores.
          Isso pode implicar transferência internacional. Não há venda de
          dados, anúncios nem treinamento de inteligência artificial com o
          conteúdo da agenda.
        </p>
      </section>

      <section>
        <h2>8. Base legal, direitos e Limited Use</h2>
        <p>
          O tratamento se apoia no consentimento do Dono ao conectar a conta
          Google e no uso exclusivo para as funções visíveis do aplicativo
          (consulta e mutação de compromissos após Confirmação). O titular
          pode pedir acesso, correção, exclusão, portabilidade e revogação:
          desconecte a conta, revogue o aplicativo no Google e fale com o
          contato do controlador (a preencher).
        </p>
        <p>
          O uso dos dados do Google segue a política Limited Use: só para
          fornecer e melhorar as funções visíveis ao usuário, sem venda, sem
          anúncios e sem transferência que permita uso independente desses
          dados.
        </p>
      </section>

      <section>
        <h2>9. Segurança</h2>
        <p>
          Os tokens não trafegam em texto claro no cookie; a Confirmação é
          revalidada no servidor; o modo demonstração não grava; há limite de
          frequência, verificação de origem e cabeçalhos de defesa do
          navegador. Nenhum controle elimina todo o risco.
        </p>
      </section>

      <section>
        <h2>10. Contato</h2>
        <p>
          Dúvidas, pedidos de acesso, correção ou exclusão de dados:{" "}
          <a href="mailto:contato@agendainteligente.app">
            contato@agendainteligente.app
          </a>
          .
        </p>
      </section>

      <RodapeLegal />
    </article>
  );
}
