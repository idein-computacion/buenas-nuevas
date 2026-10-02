import { DbData, ScheduleItem, defaultDbData } from "./db";

// Ferozo PHP Backend Client (Reemplaza a Firestore)
// Usa FormData para saltar los bloqueos de seguridad del WAF de Ferozo.

const API_URL = "/api.php";
const ADMIN_PASS = "buenasnuevas2026";
const defaultData = defaultDbData;

export function getCachedDbData(): DbData | null {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("bn_db_cache") || sessionStorage.getItem("bn_db_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed) {
          if (!parsed.schedules || parsed.schedules.length === 0) {
            parsed.schedules = defaultData.schedules;
          }
          if (!parsed.heroVideo || parsed.heroVideo === "/bg-video.mp4") {
            parsed.heroVideo = defaultData.heroVideo || "/video.mp4";
          }
          return parsed;
        }
      } catch (e) {}
    }
  }
  return defaultData;
}

export async function getDbDataClient(): Promise<DbData | null> {
  try {
    const res = await fetch(`${API_URL}?auth=${encodeURIComponent(ADMIN_PASS)}&_t=${Date.now()}`);
    let data: DbData | null = null;
    
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith("<?php")) {
        // Modo desarrollo local: Node.js no ejecuta PHP
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
      if (data && (!data.heroVideo || data.heroVideo === "/bg-video.mp4")) {
        data.heroVideo = defaultData.heroVideo || "/video.mp4";
      }

      if (typeof window !== "undefined" && data) {
        localStorage.setItem("bn_db_cache", JSON.stringify(data));
        sessionStorage.setItem("bn_db_cache", JSON.stringify(data));
      }
      return data;
    }
    return defaultData;
  } catch (err) {
    console.error("Error fetching from Ferozo PHP:", err);
    return defaultData;
  }
}

// Función maestra para guardar la BD completa
async function saveWholeDb(newDb: DbData): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("action", "update_all");
    formData.append("password", ADMIN_PASS);
    
    // Anti-WAF Ferozo: Codificamos el JSON en Base64 seguro para UTF-8
    const b64Data = btoa(unescape(encodeURIComponent(JSON.stringify(newDb))));
    formData.append("data", b64Data);

    const res = await fetch(API_URL, {
      method: "POST",
      body: formData,
    });
    
    if (res.ok) {
      const text = await res.text();
      // Si responde código PHP, estamos en local dev
      if (text.startsWith("<?php")) {
        console.warn("Modo Local: Guardado simulado en LocalStorage");
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("bn_db_cache", JSON.stringify(newDb));
        sessionStorage.setItem("bn_db_cache", JSON.stringify(newDb));
      }
      return true;
    } else if (res.status === 405) {
      // En entorno local (npm run dev) un POST a un archivo estático da error 405 Method Not Allowed
      console.warn("Modo Local (405): Guardado simulado en LocalStorage");
      if (typeof window !== "undefined") {
        localStorage.setItem("bn_db_cache", JSON.stringify(newDb));
        sessionStorage.setItem("bn_db_cache", JSON.stringify(newDb));
      }
      return true;
    }
    
    // Si llegamos aquí, hubo un error real en producción
    const errText = await res.text();
    alert(`[DEBUG] Error Ferozo HTTP ${res.status}:\n\n${errText}`);
    return false;
  } catch (err: any) {
    alert(`[DEBUG] Error de Red:\n\n${err.message}`);
    console.error("Error saving DB:", err);
    return false;
  }
}

export async function updateVerseClient(verse: { text: string; reference: string }): Promise<boolean> {
  const db = await getDbDataClient();
  if (!db) return false;
  db.verse = verse;
  return saveWholeDb(db);
}

export async function updateLiveStreamClient(liveStream: any): Promise<boolean> {
  const db = await getDbDataClient();
  if (!db) return false;
  db.liveStream = liveStream;
  const res = await saveWholeDb(db);
  if (res && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("livestream-updated", { detail: liveStream }));
    localStorage.setItem("bn_livestream_sync", JSON.stringify(liveStream));
  }
  return res;
}

export async function updateHeroVideoClient(heroVideo: string): Promise<boolean> {
  const db = await getDbDataClient();
  if (!db) return false;
  db.heroVideo = heroVideo;
  const res = await saveWholeDb(db);
  if (res && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("herovideo-updated", { detail: heroVideo }));
  }
  return res;
}

export async function updateSchedulesClient(schedules: ScheduleItem[]): Promise<boolean> {
  const db = await getDbDataClient();
  if (!db) return false;
  db.schedules = schedules;
  return saveWholeDb(db);
}

export async function saveItemClient(type: "events" | "sermons" | "podcasts" | "studies" | "schedules", item: any): Promise<boolean> {
  const db = await getDbDataClient();
  if (!db) return false;
  if (!db[type]) (db as any)[type] = [];
  
  if (item.id) {
    const list = (db as any)[type] as any[];
    const idx = list.findIndex((i: any) => i.id === item.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }
  } else {
    const newItem = { ...item, id: Date.now().toString() };
    ((db as any)[type] as any[]).push(newItem);
  }
  return saveWholeDb(db);
}

export async function deleteItemClient(type: "events" | "sermons" | "podcasts" | "studies" | "schedules", id: string): Promise<boolean> {
  const db = await getDbDataClient();
  if (!db) return false;
  if (db[type]) {
    (db as any)[type] = (db[type] as any[]).filter((i: any) => i.id !== id);
  }
  return saveWholeDb(db);
}

export async function addGalleryPhotoClient(photoUrl: string): Promise<boolean> {
  const db = await getDbDataClient();
  if (!db) return false;
  if (!db.gallery) db.gallery = [];
  db.gallery.push(photoUrl);
  return saveWholeDb(db);
}

export async function deleteGalleryPhotoClient(photoUrl: string): Promise<boolean> {
  const db = await getDbDataClient();
  if (!db) return false;
  if (db.gallery) {
    db.gallery = db.gallery.filter(url => url !== photoUrl);
  }
  return saveWholeDb(db);
}

export async function toggleMessageReadClient(id: string): Promise<boolean> {
  const db = await getDbDataClient();
  if (!db) return false;
  if (db.messages) {
    const msg = db.messages.find(m => m.id === id);
    if (msg) msg.read = !msg.read;
  }
  return saveWholeDb(db);
}

export async function deleteMessageClient(id: string): Promise<boolean> {
  const db = await getDbDataClient();
  if (!db) return false;
  if (db.messages) {
    db.messages = db.messages.filter(m => m.id !== id);
  }
  return saveWholeDb(db);
}

export function subscribeToLiveStreamClient(callback: (data: any) => void): () => void {
  // 1. Consulta inicial rápida
  getDbDataClient().then(db => {
    if (db && db.liveStream) callback(db.liveStream);
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

  // 3. Polling liviano cada 25s
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
