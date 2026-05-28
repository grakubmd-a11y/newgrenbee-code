import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;

export type Language = "en" | "es";
export type Country  = "us" | "cl";

/** Detect browser language on first visit. */
export function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("grenbee_language");
  if (stored === "es" || stored === "en") return stored as Language;
  return navigator.language.startsWith("es") ? "es" : "en";
}
