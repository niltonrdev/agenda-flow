import Link from "next/link";

export function RodapeLegal() {
  return (
    <footer className="rodape-legal">
      <Link href="/privacidade">Política de privacidade</Link>
      {" · "}
      <Link href="/termos">Termos de uso</Link>
    </footer>
  );
}
