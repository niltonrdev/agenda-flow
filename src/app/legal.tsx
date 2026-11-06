import Link from "next/link";

export function AvisoRascunho() {
  return (
    <p className="aviso-rascunho" role="note">
      Rascunho para revisão humana — não é texto jurídico final.
    </p>
  );
}

export function RodapeLegal() {
  return (
    <footer className="rodape-legal">
      <Link href="/privacidade">Política de privacidade (rascunho)</Link>
    </footer>
  );
}
