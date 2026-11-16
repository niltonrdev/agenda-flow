export function MarcaCartao() {
  return (
    <img
      className="marca-cartao"
      src="/logo-agenda.svg"
      alt="Agenda Inteligente"
      width={512}
      height={512}
    />
  );
}

export function MarcaCompacta() {
  return (
    <div className="marca-linha">
      <img
        className="marca-linha-icone"
        src="/logo-agenda-pequeno.svg"
        alt=""
        width={48}
        height={48}
      />
      <p className="marca-linha-nome">Agenda Inteligente</p>
    </div>
  );
}
