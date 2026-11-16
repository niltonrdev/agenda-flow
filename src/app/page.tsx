import { AcoesInicio } from "@/app/acoes-inicio";
import { RodapeLegal } from "@/app/legal";
import { MarcaCartao } from "@/app/marca";
import { NOME_DO_APP } from "@/lib/urls-app";
import type { Metadata } from "next";

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
          Conversa pessoal para consultar o Google Agenda e, depois de uma
          Confirmação com «Sim», marcar, alterar ou cancelar um compromisso.
          Só o calendário do Dono.
        </p>
      </header>

      <AcoesInicio />

      <RodapeLegal />
    </article>
  );
}
