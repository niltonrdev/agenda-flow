export function MarcaCartao() {
  return (
    <img
      className="marca-cartao"
      src="/marca-cartao.png"
      alt="Agenda Inteligente"
      width={354}
      height={376}
    />
  );
}

export function MarcaCompacta() {
  return (
    <div className="marca-linha">
      <img
        className="marca-linha-icone"
        src="/marca-icone.png"
        alt=""
        width={48}
        height={46}
      />
      <p className="marca-linha-nome">Agenda Inteligente</p>
    </div>
  );
}
