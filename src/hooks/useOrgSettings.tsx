import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export type CurrencyCode = string; // ISO 4217

type Settings = {
  currency: CurrencyCode;
};

type Ctx = {
  settings: Settings;
  loading: boolean;
  rate: number; // multiplier from USD to current currency
  format: (usdAmount: number, opts?: { compact?: boolean }) => string;
  refresh: () => Promise<void>;
};

const DEFAULT: Settings = { currency: "USD" };

const OrgSettingsContext = createContext<Ctx>({
  settings: DEFAULT,
  loading: true,
  rate: 1,
  format: (n) => `$${n.toFixed(2)}`,
  refresh: async () => {},
});

export const OrgSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { activeOrg } = useOrganization();
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [rate, setRate] = useState(1);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!activeOrg) {
      setSettings(DEFAULT);
      setRate(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("organization_settings")
      .select("currency")
      .eq("organization_id", activeOrg.id)
      .maybeSingle();
    const currency = (data?.currency || "USD").toUpperCase();
    setSettings({ currency });

    if (currency === "USD") {
      setRate(1);
    } else {
      try {
        const { data: fx } = await supabase.functions.invoke("fx-rates", {
          body: { base: "USD", symbols: [currency] },
        });
        const r = fx?.rates?.[currency];
        setRate(typeof r === "number" && r > 0 ? r : 1);
      } catch {
        setRate(1);
      }
    }
    setLoading(false);
  }, [activeOrg?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const format = useCallback(
    (usdAmount: number, opts?: { compact?: boolean }) => {
      const value = (usdAmount || 0) * rate;
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: settings.currency,
          notation: opts?.compact ? "compact" : "standard",
          maximumFractionDigits: opts?.compact ? 1 : 2,
        }).format(value);
      } catch {
        return `${value.toFixed(2)} ${settings.currency}`;
      }
    },
    [rate, settings.currency]
  );

  return (
    <OrgSettingsContext.Provider value={{ settings, loading, rate, format, refresh }}>
      {children}
    </OrgSettingsContext.Provider>
  );
};

export const useOrgSettings = () => useContext(OrgSettingsContext);

export const CURRENCIES: { code: string; label: string; country: string }[] = [
  { code: "USD", label: "US Dollar", country: "United States" },
  { code: "EUR", label: "Euro", country: "Eurozone" },
  { code: "GBP", label: "British Pound", country: "United Kingdom" },
  { code: "JPY", label: "Japanese Yen", country: "Japan" },
  { code: "CNY", label: "Chinese Yuan", country: "China" },
  { code: "INR", label: "Indian Rupee", country: "India" },
  { code: "AUD", label: "Australian Dollar", country: "Australia" },
  { code: "CAD", label: "Canadian Dollar", country: "Canada" },
  { code: "CHF", label: "Swiss Franc", country: "Switzerland" },
  { code: "SGD", label: "Singapore Dollar", country: "Singapore" },
  { code: "HKD", label: "Hong Kong Dollar", country: "Hong Kong" },
  { code: "AED", label: "UAE Dirham", country: "United Arab Emirates" },
  { code: "SAR", label: "Saudi Riyal", country: "Saudi Arabia" },
  { code: "ZAR", label: "South African Rand", country: "South Africa" },
  { code: "BRL", label: "Brazilian Real", country: "Brazil" },
  { code: "MXN", label: "Mexican Peso", country: "Mexico" },
  { code: "KRW", label: "South Korean Won", country: "South Korea" },
  { code: "NGN", label: "Nigerian Naira", country: "Nigeria" },
  { code: "KES", label: "Kenyan Shilling", country: "Kenya" },
  { code: "TRY", label: "Turkish Lira", country: "Türkiye" },
  { code: "SEK", label: "Swedish Krona", country: "Sweden" },
  { code: "NOK", label: "Norwegian Krone", country: "Norway" },
  { code: "DKK", label: "Danish Krone", country: "Denmark" },
  { code: "PLN", label: "Polish Złoty", country: "Poland" },
  { code: "NZD", label: "New Zealand Dollar", country: "New Zealand" },
];