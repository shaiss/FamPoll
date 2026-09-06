import type { Locale } from "./locale";

/**
 * UI copy per language. English is the source of truth; the Spanish and
 * Portuguese (Brazil) strings are first drafts — have native speakers in the
 * family review them before launch. Only the public front door is covered so
 * far; the signed-in app is still English, pending a translation pass.
 */
export type Messages = {
  brandName: string;
  tagline: string;
  landingLede: string;
  feature1: string;
  feature2: string;
  feature3: string;
  inAppHint: string;
  continueCta: string;
  noPasswords: string;
  finishSetup: string;
  setupHint: string;
};

const en: Messages = {
  brandName: "Quorum",
  tagline: "Family decisions, one round at a time.",
  landingLede: "Group the votes around the trip, the dinner, the party. Narrow it down in rounds. Keep track of what you decided.",
  feature1: "Every decision lives inside its event",
  feature2: "Ideas, shortlist, final: rounds that close themselves",
  feature3: "One link back to the family chat with what you decided",
  inAppHint: "Sign-in works best in your browser. Tap the menu and choose “Open in browser”, then come back to this link.",
  continueCta: "Continue with Google, Apple or Facebook",
  noPasswords: "No passwords. We only keep your name and photo so the family knows who voted.",
  finishSetup: "Finish setup",
  setupHint: "Sign-in turns on once Clerk is connected.",
};

const es: Messages = {
  brandName: "Cuórum",
  tagline: "Decisiones en familia, ronda a ronda.",
  landingLede: "Junta los votos en torno al viaje, la cena, la fiesta. Ve reduciendo las opciones por rondas. Guarda lo que decidieron.",
  feature1: "Cada decisión vive dentro de su evento",
  feature2: "Ideas, finalistas y ronda final: rondas que se cierran solas",
  feature3: "Un enlace de vuelta al chat de la familia con lo que decidieron",
  inAppHint: "El inicio de sesión funciona mejor en tu navegador. Abre el menú y elige «Abrir en el navegador», y vuelve a este enlace.",
  continueCta: "Continuar con Google, Apple o Facebook",
  noPasswords: "Sin contraseñas. Solo guardamos tu nombre y foto para que la familia sepa quién votó.",
  finishSetup: "Terminar la configuración",
  setupHint: "El inicio de sesión se activa cuando Clerk esté conectado.",
};

const ptBR: Messages = {
  brandName: "Quórum",
  tagline: "Decisões em família, uma rodada de cada vez.",
  landingLede: "Junte os votos em torno da viagem, do jantar, da festa. Vá afunilando em rodadas. Guarde o que ficou decidido.",
  feature1: "Cada decisão vive dentro do seu evento",
  feature2: "Ideias, finalistas e rodada final: rodadas que se fecham sozinhas",
  feature3: "Um link de volta para o chat da família com o que vocês decidiram",
  inAppHint: "O login funciona melhor no seu navegador. Toque no menu e escolha “Abrir no navegador”, depois volte para este link.",
  continueCta: "Continuar com Google, Apple ou Facebook",
  noPasswords: "Sem senhas. Guardamos apenas seu nome e foto para a família saber quem votou.",
  finishSetup: "Concluir a configuração",
  setupHint: "O login é ativado assim que o Clerk estiver conectado.",
};

const DICTS: Record<Locale, Messages> = { en, es, "pt-BR": ptBR };

export function messages(locale: Locale): Messages {
  return DICTS[locale] ?? en;
}
