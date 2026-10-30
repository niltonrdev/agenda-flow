export function MarcaCartao() {
  return (
    <img
      className="marca-cartao"
      src="/marca.png"
      alt="Agenda Inteligente"
      width={338}
      height={349}
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
        height={53}
      />
      <p className="marca-linha-nome">Agenda Inteligente</p>
    </div>
  );
}
