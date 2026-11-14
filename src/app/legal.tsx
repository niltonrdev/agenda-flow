import { ContatoPublico } from "@/app/contato-publico";
import {
  CAMINHO_PRIVACIDADE,
  CAMINHO_TERMOS,
} from "@/lib/urls-app";
import Link from "next/link";

export function RodapeLegal() {
  return (
    <footer className="rodape-legal">
      <nav className="rodape-legal-nav" aria-label="Documentos legais">
        <Link href={CAMINHO_PRIVACIDADE}>Privacidade</Link>
        <span aria-hidden="true">·</span>
        <Link href={CAMINHO_TERMOS}>Termos</Link>
      </nav>
      <p className="rodape-legal-contato">
        Contato: <ContatoPublico />
      </p>
    </footer>
  );
}
