import { RodapeLegal } from "@/app/legal";
import { MarcaCartao } from "@/app/marca";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de uso — Agenda Inteligente",
  description:
    "Condições de uso da Agenda Inteligente, ferramenta pessoal de conversa com o Google Calendar.",
};

export default function PaginaTermos() {
  return (
    <article className="pagina-legal">
      <MarcaCartao />
      <p className="pagina-legal-voltar">
        <Link href="/">Voltar à página inicial</Link>
      </p>
      <h1 className="pagina-legal-titulo">Termos de uso</h1>
      <p className="pagina-legal-meta">
        Última atualização: 13 de novembro de 2026.
      </p>

      <section>
        <h2>1. O serviço</h2>
        <p>
          A Agenda Inteligente é uma ferramenta pessoal que permite consultar
          disponibilidade e gerenciar compromissos no seu Google Calendar por
          meio de uma conversa em português. O serviço é fornecido como está,
          sem garantias de disponibilidade contínua.
        </p>
      </section>

      <section>
        <h2>2. Uso permitido</h2>
        <p>
          O serviço é de uso estritamente pessoal do titular da conta Google
          conectada (o &ldquo;Dono&rdquo;). Não é permitido usar o serviço para gerenciar
          calendários de terceiros sem autorização, automatizar ações em massa,
          revender o acesso ou contornar limites de uso da API do Google.
        </p>
      </section>

      <section>
        <h2>3. Conta Google e permissões</h2>
        <p>
          Ao conectar sua conta Google, você autoriza a leitura das suas
          agendas visíveis e, após confirmação explícita, a criação, alteração
          ou cancelamento de compromissos na sua agenda principal. Você pode
          revogar esse acesso a qualquer momento em{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            myaccount.google.com/permissions
          </a>
          .
        </p>
      </section>

      <section>
        <h2>4. Responsabilidades</h2>
        <p>
          O Dono é responsável por revisar a Confirmação antes de aprovar
          qualquer alteração no calendário. A Agenda Inteligente não se
          responsabiliza por compromissos criados, alterados ou cancelados
          após a confirmação do Dono.
        </p>
        <p>
          O serviço depende da disponibilidade da API do Google Calendar.
          Interrupções nessa API estão fora do nosso controle.
        </p>
      </section>

      <section>
        <h2>5. Modo demonstração</h2>
        <p>
          O modo demonstração usa um calendário de exemplo somente leitura,
          recriado a cada sessão. Não é possível gravar compromissos nesse
          modo. Não use dados reais no modo de demonstração.
        </p>
      </section>

      <section>
        <h2>6. Alterações nos termos</h2>
        <p>
          Estes termos podem ser atualizados. A data de última atualização
          no topo desta página indica a versão vigente. O uso continuado do
          serviço após a atualização implica aceitação dos novos termos.
        </p>
      </section>

      <section>
        <h2>7. Contato</h2>
        <p>
          Dúvidas sobre estes termos:{" "}
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
