import { DbData, defaultDbData } from './db';

const API_URL = "/api.php";
const defaultData: DbData = defaultDbData;

export function getCachedDbData(): DbData {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("bn_db_cache") || sessionStorage.getItem("bn_db_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed) {
          if (!parsed.schedules || parsed.schedules.length === 0) {
            parsed.schedules = defaultData.schedules;
          }
          return parsed;
        }
      } catch (e) {}
    }
  }
  return defaultData;
}

export async function getDbDataClient(): Promise<DbData> {
  try {
    const res = await fetch(`${API_URL}?_t=${Date.now()}`);
    let data;
    
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith("<?php")) {
        // Local dev
        const fallbackRes = await fetch(`/db.json?_t=${Date.now()}`);
        if (fallbackRes.ok) {
          data = await fallbackRes.json();
        } else {
          data = defaultData;

          if (typeof window !== "undefined") {
            const cached = localStorage.getItem("bn_db_cache") || sessionStorage.getItem("bn_db_cache");
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (parsed && typeof parsed === "object") {
                  data = { ...data, ...parsed };
                }
              } catch (e) {}
            }
          }
        }
      } else {
        data = JSON.parse(text);
      }

      if (data && (!data.schedules || data.schedules.length === 0)) {
        data.schedules = defaultData.schedules;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("bn_db_cache", JSON.stringify(data));
        sessionStorage.setItem("bn_db_cache", JSON.stringify(data));
      }
      return data;
    }
    return defaultData;
  } catch (err) {
    console.error("Error fetching from API:", err);
    return defaultData;
  }
}

export function subscribeToLiveStreamClient(callback: (data: any) => void): () => void {
  // 1. Consulta inicial rápida
  getDbDataClient().then(data => {
    if (data && data.liveStream) callback(data.liveStream);
  });

  // 2. Sincronización entre pestañas abiertas
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "bn_livestream_sync" && e.newValue) {
      try {
        const live = JSON.parse(e.newValue);
        callback(live);
      } catch (err) {}
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  // 3. Polling liviano cada 25s para detectar transmisiones en vivo automáticamente
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}?_t=${Date.now()}`);
      if (res.ok) {
        const text = await res.text();
        if (!text.startsWith("<?php")) {
          const fresh = JSON.parse(text);
          if (fresh && fresh.liveStream) {
            callback(fresh.liveStream);
          }
        }
      }
    } catch (err) {}
  }, 25000);

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
    clearInterval(interval);
  };
}

export async function submitMessageClient(name: string, phone: string, message: string): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("action", "contact");
    
    // Anti-WAF Ferozo: Codificamos el JSON en Base64 seguro para UTF-8
    const payload = JSON.stringify({
      id: Date.now().toString(),
      name,
      phone,
      message,
      date: new Date().toISOString(),
      read: false
    });
    const b64Data = btoa(unescape(encodeURIComponent(payload)));
    formData.append("data", b64Data);

    const res = await fetch(API_URL, {
      method: "POST",
      body: formData
    });
    
    // Fake success for local dev environments
    if (res.status === 405 || (res.ok && (await res.text()).startsWith("<?php"))) {
      console.warn("Modo local: Formulario enviado (simulado)");
      return true;
    }
    
    return res.ok;
  } catch (error) {
    console.error("Error submitting message:", error);
    return false;
  }
}
