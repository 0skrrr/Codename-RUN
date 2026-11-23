import cs from "../../../locales/cs.json" with { type: "json" };
import en from "../../../locales/en.json" with { type: "json" };

type Messages = Readonly<Record<string, string>>;
type Values = Readonly<Record<string, string | number>>;

const english: Messages = en;
const MESSAGES_BY_LANGUAGE: Readonly<Record<string, Messages>> = { en: english, cs };
const FALLBACK_LANGUAGE = "en";

const language = pickLanguage(navigator.languages);
const messages: Messages = MESSAGES_BY_LANGUAGE[language] ?? english;
const numberFormat = new Intl.NumberFormat(language);

export const currentLanguage = language;

export function t(key: string, values: Values = {}): string {
  const template = messages[key] ?? english[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) => {
    const value = values[name];
    if (value === undefined) return match;
    return typeof value === "number" ? numberFormat.format(value) : value;
  });
}

function pickLanguage(preferred: readonly string[]): string {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0] ?? "";
    if (base in MESSAGES_BY_LANGUAGE) return base;
  }
  return FALLBACK_LANGUAGE;
}
