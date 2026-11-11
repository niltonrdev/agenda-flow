"use client";

import { AVISO_VOZ_COMPLETO, AVISO_VOZ_RESUMO } from "@/app/conversa-campo";
import { useId, useState } from "react";

export function AvisoVozDitado() {
  const [aberto, setAberto] = useState(false);
  const idTexto = useId();

  return (
    <div className="conversa-aviso-voz">
      <button
        type="button"
        className="conversa-aviso-voz-resumo"
        aria-expanded={aberto}
        aria-controls={idTexto}
        onClick={() => setAberto((atual) => !atual)}
      >
        <span className="conversa-aviso-voz-icone" aria-hidden="true">
          i
        </span>
        {AVISO_VOZ_RESUMO}
      </button>
      <p
        id={idTexto}
        className="conversa-aviso-voz-texto"
        hidden={!aberto}
      >
        {AVISO_VOZ_COMPLETO}
      </p>
    </div>
  );
}
