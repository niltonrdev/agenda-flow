"use client";

import { CAMINHO_CONVERSA } from "@/lib/urls-app";
import Link from "next/link";
import { useEffect, useState } from "react";

const LOGIN_GOOGLE = "/api/auth/google";

export function AcoesInicio() {
  const [destinoGoogle, setDestinoGoogle] = useState(LOGIN_GOOGLE);

  useEffect(() => {
    void fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then(
        (dados: { conectado?: boolean }) => {
          setDestinoGoogle(
            dados.conectado ? CAMINHO_CONVERSA : LOGIN_GOOGLE,
          );
        },
      )
      .catch(() => {
        setDestinoGoogle(LOGIN_GOOGLE);
      });
  }, []);

  return (
    <div className="entrada-acoes">
      <a className="entrada-botao-google" href={destinoGoogle}>
        Continuar com Google
      </a>
      <Link
        className="entrada-botao-demo"
        href={`${CAMINHO_CONVERSA}?demo=1`}
      >
        Continuar em demonstração
      </Link>
    </div>
  );
}
