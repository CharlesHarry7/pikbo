"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  translate,
} from "@/lib/i18n";

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (k) => k,
});

const STORAGE_KEY = "pikbo_locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start at the default so SSR and first client render match (no hydration
  // mismatch). Respect an explicit saved choice, but keep first visits in
  // English so the single global URL has one stable default language.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocaleState(stored);
        return;
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang =
        locale === "zh" ? "zh-CN" : locale === "ja" ? "ja" : locale;
    } catch {
      // ignore
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.cookie = `${STORAGE_KEY}=${next};path=/;max-age=31536000;samesite=lax`;
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
