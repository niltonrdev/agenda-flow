/**
 * E-mail público de contato (homepage, /privacidade e /termos).
 * Troque só este valor. NEXT_PUBLIC_CONTATO_EMAIL, se preenchida, sobrescreve.
 */
export const CONTATO_EMAIL = "niltonrdonascimento@gmail.com";

export type EnvContato = Record<string, string | undefined>;

export function emailDeContato(env: EnvContato = process.env as EnvContato): string {
  const publico = env.NEXT_PUBLIC_CONTATO_EMAIL?.trim();
  if (publico) return publico;
  return CONTATO_EMAIL;
}

export function emailDeContatoEhPlaceholder(email: string): boolean {
  return email.startsWith("[") || !email.includes("@");
}
