import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;
const PREFIXO = "v1";

export function chaveAes256(segredo: string): Buffer {
  return createHash("sha256").update(segredo, "utf8").digest();
}

/** AES-256-GCM: `v1.{iv}.{ciphertext}.{tag}` em Base64URL. */
export function cifrarValor(valor: string, segredo: string): string {
  if (!segredo) {
    throw new Error("Segredo de cifra ausente.");
  }
  const iv = randomBytes(TAMANHO_IV);
  const cipher = createCipheriv(ALGORITMO, chaveAes256(segredo), iv);
  const ciphertext = Buffer.concat([
    cipher.update(valor, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIXO,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function decifrarValor(
  pacote: string | undefined,
  segredo: string,
): string | null {
  if (!pacote || !segredo) return null;
  const partes = pacote.split(".");
  if (partes.length !== 4 || partes[0] !== PREFIXO) return null;
  try {
    const iv = Buffer.from(partes[1], "base64url");
    const ciphertext = Buffer.from(partes[2], "base64url");
    const tag = Buffer.from(partes[3], "base64url");
    if (iv.length !== TAMANHO_IV || tag.length !== 16) return null;
    const decipher = createDecipheriv(ALGORITMO, chaveAes256(segredo), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
