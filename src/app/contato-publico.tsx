import {
  emailDeContato,
  emailDeContatoEhPlaceholder,
} from "@/lib/contato";

export function ContatoPublico() {
  const email = emailDeContato();
  if (emailDeContatoEhPlaceholder(email)) {
    return <code className="contato-placeholder">{email}</code>;
  }
  return <a href={`mailto:${email}`}>{email}</a>;
}
