export const CHAVE_TUTORIAL_VISTO = "agenda-tutorial-visto";

export const ROTULO_AJUDA = "Como usar";
export const ROTULO_PROXIMO = "Próximo";
export const ROTULO_VOLTAR = "Voltar";
export const ROTULO_PULAR = "Pular";
export const ROTULO_CONCLUIR = "Concluir";

export type AlvoTutorial = "composer" | "microfone" | "fio" | "topo";

export type PassoTutorial = {
  id: string;
  titulo: string;
  texto: string;
  exemplo?: string;
  alvo?: AlvoTutorial;
};

/**
 * Passos alinhados ao que a Conversa faz hoje.
 * Ditado: soltar coloca o texto na caixa; Enviar manda.
 * Demonstração: só consulta, não grava.
 */
export const PASSOS_TUTORIAL: PassoTutorial[] = [
  {
    id: "escrever",
    titulo: "Escrever e enviar",
    texto:
      "Na caixa de baixo, escreva o compromisso como se falasse com uma pessoa. Depois toque no botão verde Enviar, à direita da caixa.",
    exemplo: "Dentista amanhã às 15h",
    alvo: "composer",
  },
  {
    id: "ditado",
    titulo: "Falar no microfone",
    texto:
      "Segure o microfone (ao lado esquerdo do Enviar) e fale. Solte para o texto aparecer na caixa — ele ainda não envia. Arraste para cima para falar sem segurar; toque de novo no microfone para parar. Arraste para o lado para cancelar. Quando o texto estiver certo, toque em Enviar.",
    alvo: "microfone",
  },
  {
    id: "confirmar",
    titulo: "Conferir antes de salvar",
    texto:
      "A Agenda mostra o que entendeu e pergunta. Toque em Sim para gravar. Toque em Não se estiver errado — ela pergunta o que mudar. Sem o Sim, nada entra na agenda.",
    alvo: "fio",
  },
  {
    id: "alterar",
    titulo: "Mudar ou apagar",
    texto:
      "Escreva o que quer fazer, por exemplo: muda a reunião da Ana para amanhã às 16h. Ou: cancela a reunião da Ana. A Agenda confirma de novo e só muda ou apaga depois do Sim. Na demonstração isso não grava — precisa conectar o Google.",
    alvo: "composer",
  },
  {
    id: "agenda",
    titulo: "Ver a agenda e o Google",
    texto:
      "Para ver um dia, escreva por exemplo 15 de novembro e toque em Enviar. Com o Google conectado, um ícone de calendário pode aparecer na resposta para abrir a agenda. Na tela inicial use Continuar com Google. Na demonstração, Conectar Google fica no alto.",
    alvo: "topo",
  },
];

export function tutorialJaVisto(
  storage: Pick<Storage, "getItem"> | null | undefined,
): boolean {
  try {
    return storage?.getItem(CHAVE_TUTORIAL_VISTO) === "1";
  } catch {
    return false;
  }
}

export function gravarTutorialVisto(
  storage: Pick<Storage, "setItem"> | null | undefined,
): void {
  try {
    storage?.setItem(CHAVE_TUTORIAL_VISTO, "1");
  } catch {
    /* ignore quota / modo privado */
  }
}

export function deveMostrarTutorialAutomatico(
  storage: Pick<Storage, "getItem"> | null | undefined,
): boolean {
  return !tutorialJaVisto(storage);
}

export function indiceAposProximo(atual: number, total = PASSOS_TUTORIAL.length): number {
  return Math.min(atual + 1, total - 1);
}

export function indiceAposVoltar(atual: number): number {
  return Math.max(atual - 1, 0);
}

export function textoProgresso(
  indice: number,
  total = PASSOS_TUTORIAL.length,
): string {
  return `${indice + 1} de ${total}`;
}

export function ehUltimoPasso(
  indice: number,
  total = PASSOS_TUTORIAL.length,
): boolean {
  return indice >= total - 1;
}
