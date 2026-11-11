declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

interface ArduhubBridge {
  store: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
    persistent(): Promise<boolean>;
  };
  openExternal(url: string): Promise<boolean>;
  version(): Promise<string>;
}

interface Window {
  arduhub: ArduhubBridge;
}

declare module "*.css";
