"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DbData, EventItem, Sermon, Podcast, Study, LiveStream } from "@/lib/db";
import { 
  getDbDataClient, 
  getCachedDbData,
  updateVerseClient, 
  updateLiveStreamClient,
  saveItemClient, 
  deleteItemClient, 
  addGalleryPhotoClient, 
  deleteGalleryPhotoClient, 
  toggleMessageReadClient, 
  deleteMessageClient 
} from "@/lib/firestoreClient";
import { triggerPdfDownload } from "@/lib/pdfHelper";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

type TabType = "verse" | "events" | "sermons" | "podcasts" | "studies" | "gallery" | "messages" | "livestream";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Data State
  const [dbData, setDbData] = useState<DbData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("verse");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form States
  const [verseForm, setVerseForm] = useState({ text: "", reference: "" });
  const [eventForm, setEventForm] = useState({ title: "", date: "", time: "", description: "", category: "Comunidad" });
  const [sermonForm, setSermonForm] = useState({ title: "", preacher: "", date: "", videoUrl: "", duration: "" });
  const [podcastForm, setPodcastForm] = useState({ title: "", speaker: "", date: "", audioUrl: "", duration: "" });
  const [studyForm, setStudyForm] = useState({ title: "", author: "", date: "", content: "", pdfUrl: "" });
  const [liveStreamForm, setLiveStreamForm] = useState<LiveStream>({
    active: false,
    title: "Culto de Adoración y Palabra en Vivo",
    streamUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    description: "Te damos la bienvenida a nuestra reunión dominical. ¡Alabemos y escuchemos la Palabra de Dios juntos desde cualquier lugar!",
    scheduledTime: "Domingos 09:30 hs"
  });
  
  // Gallery Photo URL State
  const [photoUrlInput, setPhotoUrlInput] = useState<string>("");

  // Check auth instantly on mount without blocking screen
  useEffect(() => {
    // 1. Immediately verify session state
    let isAuth = false;
    try {
      const storedAuth = typeof window !== 'undefined' ? sessionStorage.getItem("bn_admin_auth") : null;
      isAuth = storedAuth === "true";
      setIsAuthenticated(isAuth);
    } catch (err) {
      console.error("Error reading auth session", err);
    } finally {
      setCheckingAuth(false);
    }

    // 2. Load cached data & fetch fresh content in background
    try {
      const initialData = getCachedDbData();
      setDbData(initialData);
      if (initialData?.verse) {
        setVerseForm({
          text: initialData.verse.text || "",
          reference: initialData.verse.reference || ""
        });
      }
      if (initialData?.liveStream) {
        setLiveStreamForm(initialData.liveStream);
      }

      if (isAuth) {
        fetchContent();
      }
    } catch (err) {
      console.error("Error initializing admin content", err);
    }
  }, []);

  const fetchContent = async () => {
    try {
      const data = await getDbDataClient();
      if (data) {
        setDbData(data);
        if (data.verse) {
          setVerseForm({
            text: data.verse.text || "",
            reference: data.verse.reference || ""
          });
        }
        if (data.liveStream) {
          setLiveStreamForm(data.liveStream);
        }
      }
    } catch (err) {
      console.error("Error fetching content:", err);
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const validUser = process.env.NEXT_PUBLIC_ADMIN_USER || "admin";
    const validPass = process.env.NEXT_PUBLIC_ADMIN_PASS || "buenasnuevas2026";

    if (username.trim() === validUser && password.trim() === validPass) {
      if (typeof window !== 'undefined') sessionStorage.setItem("bn_admin_auth", "true");
      setIsAuthenticated(true);
      setLoading(false);
      // Fetch fresh data in background without blocking login
      fetchContent();
    } else {
      setLoginError("Usuario o contraseña incorrecta.");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem("bn_admin_auth");
      setIsAuthenticated(false);
      setDbData(null);
    } catch (err) {
      console.error("Error logging out", err);
    }
  };

  const handleContentAction = async (action: string, extraBody: any = {}) => {
    setLoading(true);
    try {
      let success = false;
      if (action === "updateVerse") {
        success = await updateVerseClient(extraBody.verse);
      } else if (action === "updateLiveStream") {
        success = await updateLiveStreamClient(extraBody.liveStream);
      } else if (action === "saveItem") {
        success = await saveItemClient(extraBody.type, extraBody.item);
      } else if (action === "deleteItem") {
        success = await deleteItemClient(extraBody.type, extraBody.id);
      } else if (action === "addPhoto") {
        success = await addGalleryPhotoClient(extraBody.photoUrl);
      } else if (action === "deletePhoto") {
        success = await deleteGalleryPhotoClient(extraBody.photoUrl);
      } else if (action === "toggleMessageRead") {
        success = await toggleMessageReadClient(extraBody.id);
      } else if (action === "deleteMessage") {
        success = await deleteMessageClient(extraBody.id);
      }

      if (success) {
        showStatus("success", "Operación realizada con éxito.");
        await fetchContent();
      } else {
        showStatus("error", "Error al guardar los cambios.");
      }
    } catch (err) {
      showStatus("error", "Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Handlers
  const saveVerse = (e: React.FormEvent) => {
    e.preventDefault();
    handleContentAction("updateVerse", { verse: verseForm });
  };

  const saveLiveStream = (e: React.FormEvent) => {
    e.preventDefault();
    handleContentAction("updateLiveStream", { liveStream: liveStreamForm });
  };

  const toggleLiveStatus = async () => {
    const updated = { ...liveStreamForm, active: !liveStreamForm.active };
    setLiveStreamForm(updated);
    await handleContentAction("updateLiveStream", { liveStream: updated });
  };

  const addEvent = (e: React.FormEvent) => {
    e.preventDefault();
    handleContentAction("saveItem", { type: "events", item: eventForm });
    setEventForm({ title: "", date: "", time: "", description: "", category: "Comunidad" });
  };

  const addSermon = (e: React.FormEvent) => {
    e.preventDefault();
    handleContentAction("saveItem", { type: "sermons", item: sermonForm });
    setSermonForm({ title: "", preacher: "", date: "", videoUrl: "", duration: "" });
  };

  const addPodcast = (e: React.FormEvent) => {
    e.preventDefault();
    handleContentAction("saveItem", { type: "podcasts", item: podcastForm });
    setPodcastForm({ title: "", speaker: "", date: "", audioUrl: "", duration: "" });
  };

  const addStudy = (e: React.FormEvent) => {
    e.preventDefault();
    handleContentAction("saveItem", { type: "studies", item: studyForm });
    setStudyForm({ title: "", author: "", date: "", content: "", pdfUrl: "" });
  };

  const deleteItem = (type: "events" | "sermons" | "podcasts" | "studies", id: string) => {
    if (confirm("¿Estás seguro de eliminar este elemento?")) {
      handleContentAction("deleteItem", { type, id });
    }
  };

  const deletePhoto = (photoUrl: string) => {
    if (confirm("¿Estás seguro de quitar esta foto de la galería?")) {
      handleContentAction("deletePhoto", { photoUrl });
    }
  };

  const handleAddPhotoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrlInput) return;
    handleContentAction("addPhoto", { photoUrl: photoUrlInput });
    setPhotoUrlInput("");
  };

  const handleToggleMessageRead = async (id: string) => {
    await handleContentAction("toggleMessageRead", { id });
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm("¿Estás seguro de que querés eliminar este mensaje?")) return;
    await handleContentAction("deleteMessage", { id });
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-crema flex flex-col items-center justify-center p-6 text-white text-sm uppercase tracking-widest font-bold">
        <div className="w-8 h-8 rounded-full border-2 border-dorado border-t-transparent animate-spin mb-4" />
        Verificando sesión...
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-crema flex flex-col items-center justify-center p-6">
        <div className="glass-card rounded-3xl p-8 md:p-10 w-full max-w-md relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-dorado" />
          
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white leading-tight">
              Acceso Administrativo
            </h1>
            <p className="text-xs text-texto-muted mt-2 uppercase tracking-widest font-bold">
              Iglesia Buenas Nuevas
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresá el usuario..."
                className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:border-dorado focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                Contraseña de Acceso
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresá la contraseña..."
                className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:border-dorado focus:outline-none transition-colors"
              />
            </div>

            {loginError && (
              <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl p-3 text-center font-bold">
                ⚠️ {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-dorado hover:bg-dorado/90 disabled:bg-dorado/50 text-crema font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition-all duration-300 hover:shadow-[0_4px_20px_rgba(200,168,75,0.25)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-crema border-t-transparent animate-spin" />
              ) : (
                "Entrar al Panel"
              )}
            </button>
          </form>

          <Link href="/" className="block text-center text-xs text-dorado hover:underline mt-6">
            ← Volver a la página de inicio
          </Link>
        </div>
      </div>
    );
  }

  // PANEL DASHBOARD SCREEN
  return (
    <div className="min-h-screen bg-crema text-texto py-12 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/5">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-white">
              Panel de Administración
            </h1>
            <p className="text-xs text-texto-muted mt-1 uppercase tracking-wider font-bold">
              Iglesia Buenas Nuevas · Oberá
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="text-xs font-bold border border-white/10 hover:border-white/30 text-white/80 hover:text-white px-4.5 py-2.5 rounded-xl transition-all"
            >
              👁️ Ver Sitio Público
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs font-bold bg-tierra hover:bg-tierra-dark text-white px-4.5 py-2.5 rounded-xl transition-all"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {statusMessage && (
          <div className={`fixed bottom-6 right-6 z-50 rounded-2xl p-4 shadow-2xl border text-sm font-bold flex items-center gap-2 animate-fade-in ${
            statusMessage.type === "success" 
              ? "bg-emerald-950/80 border-emerald-800/40 text-emerald-300" 
              : "bg-red-950/80 border-red-800/40 text-red-300"
          }`}>
            <span>{statusMessage.type === "success" ? "✓" : "⚠️"}</span>
            {statusMessage.text}
          </div>
        )}

        {/* Layout Tabs / Controles */}
        <div className="grid md:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Menú Tabs */}
          <div className="md:col-span-3 flex flex-col gap-2 bg-monte rounded-2xl p-3 border border-white/5">
            {[
              { 
                id: "livestream", 
                label: `🔴 Streaming en Vivo${liveStreamForm.active ? " (ACTIVO)" : ""}` 
              },
              { id: "verse", label: "⛪ Versículo del Día" },
              { id: "events", label: "📅 Eventos / Agenda" },
              { id: "sermons", label: "🎥 Sermones (Videos)" },
              { id: "podcasts", label: "🎙️ Podcasts (Audios)" },
              { id: "studies", label: "📖 Estudios Bíblicos" },
              { id: "gallery", label: "📸 Galería de Fotos" },
              { 
                id: "messages", 
                label: `✉️ Mensajes${
                  dbData?.messages?.filter((m: any) => !m.read).length 
                    ? ` (${dbData.messages.filter((m: any) => !m.read).length})` 
                    : ""
                }` 
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all uppercase tracking-wide ${
                  activeTab === tab.id 
                    ? "bg-dorado text-crema font-bold shadow" 
                    : "text-texto-muted hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Formularios y Contenido */}
          <div className="md:col-span-9 flex flex-col gap-8">
            
            {/* TAB: STREAMING EN VIVO */}
            {activeTab === "livestream" && (
              <div className="flex flex-col gap-8">
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${liveStreamForm.active ? "bg-red-500 animate-ping" : "bg-zinc-600"}`} />
                        Transmisión en Vivo (Streaming)
                      </h2>
                      <p className="text-xs text-texto-muted mt-1">
                        Controlá la transmisión en directo para YouTube Live o Facebook. Al activarlo, aparecerá destacado en la página web y en el botón &ldquo;Ver en vivo&rdquo;.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={toggleLiveStatus}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        liveStreamForm.active
                          ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                          : "bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/40 shadow"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${liveStreamForm.active ? "bg-white animate-pulse" : "bg-emerald-400"}`} />
                      {liveStreamForm.active ? "En Vivo: ACTIVADO (Apagar)" : "En Vivo: APAGADO (Activar)"}
                    </button>
                  </div>

                  {/* Estado Banner */}
                  <div className={`p-4 rounded-2xl border text-xs font-bold mb-6 flex items-center justify-between ${
                    liveStreamForm.active
                      ? "bg-red-950/40 border-red-800/50 text-red-300"
                      : "bg-monte-dark/40 border-white/5 text-texto-muted"
                  }`}>
                    <span>
                      {liveStreamForm.active 
                        ? "🔴 La transmisión está ACTIVA y visible para todos los visitantes del sitio." 
                        : "⚪ La transmisión está INACTIVA. Los visitantes verán el horario de la próxima reunión."}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider bg-white/5 px-2 py-1 rounded">
                      {liveStreamForm.active ? "Transmitiendo" : "Fuera de línea"}
                    </span>
                  </div>

                  <form onSubmit={saveLiveStream} className="flex flex-col gap-5">
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Título de la Transmisión
                      </label>
                      <input
                        type="text"
                        required
                        value={liveStreamForm.title}
                        onChange={(e) => setLiveStreamForm({ ...liveStreamForm, title: e.target.value })}
                        placeholder="Ej. Culto Dominical de Adoración y Mensaje de la Palabra"
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                          Enlace del Video en Vivo (YouTube Live)
                        </label>
                        <input
                          type="url"
                          required
                          value={liveStreamForm.streamUrl}
                          onChange={(e) => setLiveStreamForm({ ...liveStreamForm, streamUrl: e.target.value })}
                          placeholder="Ej. https://www.youtube.com/watch?v=... o https://youtu.be/..."
                          className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                          Horario Programado / Aviso
                        </label>
                        <input
                          type="text"
                          value={liveStreamForm.scheduledTime || ""}
                          onChange={(e) => setLiveStreamForm({ ...liveStreamForm, scheduledTime: e.target.value })}
                          placeholder="Ej. Domingos 09:30 hs · Culto Familiar"
                          className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Descripción o Mensaje para los Espectadores
                      </label>
                      <textarea
                        rows={3}
                        value={liveStreamForm.description}
                        onChange={(e) => setLiveStreamForm({ ...liveStreamForm, description: e.target.value })}
                        placeholder="Escribe un mensaje de bienvenida o instrucciones para quienes se conectan..."
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-dorado focus:outline-none transition-colors resize-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-dorado hover:bg-dorado/90 disabled:bg-dorado/50 text-crema font-bold text-xs uppercase tracking-wider py-3.5 px-8 rounded-xl transition-all duration-300 hover:shadow-[0_4px_20px_rgba(200,168,75,0.25)]"
                      >
                        {loading ? "Guardando..." : "Guardar Configuración en Vivo"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Vista Previa del Reproductor */}
                {liveStreamForm.streamUrl && (
                  <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                    <h3 className="font-display text-base font-bold text-white mb-4 flex items-center gap-2">
                      <span>📺</span> Vista Previa del Reproductor
                    </h3>
                    <div className="aspect-video w-full max-w-2xl rounded-2xl overflow-hidden border border-white/10 bg-black">
                      <iframe
                        src={getYouTubeEmbedUrl(liveStreamForm.streamUrl)}
                        title="Vista Previa de Transmisión"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: VERSICULO DEL DIA */}
            {activeTab === "verse" && (
              <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-dorado" />
                <h2 className="font-display text-xl font-bold text-white mb-6">
                  Editar Versículo del Día
                </h2>
                
                <form onSubmit={saveVerse} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                      Texto Bíblico
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={verseForm.text}
                      onChange={(e) => setVerseForm({ ...verseForm, text: e.target.value })}
                      placeholder="Escribe el texto bíblico aquí..."
                      className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-dorado focus:outline-none transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                      Referencia (Libro, Capítulo y Versículo)
                    </label>
                    <input
                      type="text"
                      required
                      value={verseForm.reference}
                      onChange={(e) => setVerseForm({ ...verseForm, reference: e.target.value })}
                      placeholder="Ej. Juan 3:16"
                      className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-dorado hover:bg-dorado/90 disabled:bg-dorado/50 text-crema font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 w-fit px-8 mt-2"
                  >
                    Actualizar Versículo
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: EVENTOS / ACTIVIDADES */}
            {activeTab === "events" && (
              <div className="flex flex-col gap-8">
                {/* Form agregar */}
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-dorado" />
                  <h2 className="font-display text-xl font-bold text-white mb-6">
                    Agregar Actividad / Evento
                  </h2>
                  
                  <form onSubmit={addEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Título del Evento
                      </label>
                      <input
                        type="text"
                        required
                        value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        placeholder="Ej. Campaña Solidaria, Retiro..."
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Fecha
                      </label>
                      <input
                        type="date"
                        required
                        value={eventForm.date}
                        onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Horario de Referencia
                      </label>
                      <input
                        type="text"
                        required
                        value={eventForm.time}
                        onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                        placeholder="Ej. 18:00 hs, Culto general"
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Categoría
                      </label>
                      <select
                        value={eventForm.category}
                        onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      >
                        <option value="Comunidad">Comunidad</option>
                        <option value="Jóvenes">Jóvenes</option>
                        <option value="Estudio">Estudio</option>
                        <option value="Social">Social</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Breve Descripción
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        placeholder="Escribe detalles del evento..."
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-dorado focus:outline-none transition-colors resize-none"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-dorado hover:bg-dorado/90 text-crema font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 w-fit px-8 mt-2 md:col-span-2"
                    >
                      Agregar Evento
                    </button>
                  </form>
                </div>

                {/* Listado */}
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <h3 className="font-display text-lg font-bold text-white mb-6">
                    Eventos Guardados
                  </h3>
                  
                  {dbData?.events.length === 0 ? (
                    <p className="text-sm text-texto-muted text-center py-6">No hay eventos en la agenda.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {dbData?.events.map((event: EventItem) => (
                        <div key={event.id} className="border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-monte/40">
                          <div>
                            <span className="text-[9px] font-bold text-dorado uppercase tracking-wide">{event.category} · {event.date}</span>
                            <h4 className="font-display font-bold text-white text-base mt-0.5">{event.title}</h4>
                            <p className="text-xs text-texto-muted mt-1 max-w-xl">{event.description}</p>
                          </div>
                          <button
                            onClick={() => deleteItem("events", event.id)}
                            className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider shrink-0"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SERMONES / VIDEOS */}
            {activeTab === "sermons" && (
              <div className="flex flex-col gap-8">
                {/* Form agregar */}
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-dorado" />
                  <h2 className="font-display text-xl font-bold text-white mb-6">
                    Agregar Video / Predicación
                  </h2>
                  
                  <form onSubmit={addSermon} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Título de la Predicación
                      </label>
                      <input
                        type="text"
                        required
                        value={sermonForm.title}
                        onChange={(e) => setSermonForm({ ...sermonForm, title: e.target.value })}
                        placeholder="Ej. Caminando en fe, Vivir en comunidad..."
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Predicador (Pastor/a o Expositor)
                      </label>
                      <input
                        type="text"
                        required
                        value={sermonForm.preacher}
                        onChange={(e) => setSermonForm({ ...sermonForm, preacher: e.target.value })}
                        placeholder="Ej. Pastor Daniel Canclini"
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Fecha de la Reunión
                      </label>
                      <input
                        type="date"
                        required
                        value={sermonForm.date}
                        onChange={(e) => setSermonForm({ ...sermonForm, date: e.target.value })}
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Enlace de Video (YouTube)
                      </label>
                      <input
                        type="url"
                        required
                        value={sermonForm.videoUrl}
                        onChange={(e) => setSermonForm({ ...sermonForm, videoUrl: e.target.value })}
                        placeholder="Ej. https://www.youtube.com/watch?v=..."
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Duración Estimada
                      </label>
                      <input
                        type="text"
                        required
                        value={sermonForm.duration}
                        onChange={(e) => setSermonForm({ ...sermonForm, duration: e.target.value })}
                        placeholder="Ej. 45 min, 1 hora"
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-dorado hover:bg-dorado/90 text-crema font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 w-fit px-8 mt-2 md:col-span-2"
                    >
                      Agregar Sermón
                    </button>
                  </form>
                </div>

                {/* Listado */}
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <h3 className="font-display text-lg font-bold text-white mb-6">
                    Sermones Guardados
                  </h3>
                  
                  {dbData?.sermons.length === 0 ? (
                    <p className="text-sm text-texto-muted text-center py-6">No hay videos en la lista.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {dbData?.sermons.map((sermon: Sermon) => (
                        <div key={sermon.id} className="border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-monte/40">
                          <div>
                            <span className="text-[9px] font-bold text-dorado uppercase tracking-wide">{sermon.preacher} · {sermon.duration}</span>
                            <h4 className="font-display font-bold text-white text-base mt-0.5">{sermon.title}</h4>
                            <span className="text-[10px] text-texto-muted mt-1 block max-w-sm truncate">URL: {sermon.videoUrl}</span>
                          </div>
                          <button
                            onClick={() => deleteItem("sermons", sermon.id)}
                            className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider shrink-0"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: PODCASTS */}
            {activeTab === "podcasts" && (
              <div className="flex flex-col gap-8">
                {/* Form agregar */}
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-dorado" />
                  <h2 className="font-display text-xl font-bold text-white mb-6">
                    Agregar Podcast / Mensaje en Audio
                  </h2>
                  
                  <form onSubmit={addPodcast} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Título del Audio
                      </label>
                      <input
                        type="text"
                        required
                        value={podcastForm.title}
                        onChange={(e) => setPodcastForm({ ...podcastForm, title: e.target.value })}
                        placeholder="Ej. La Paz en el hogar, Devocionales..."
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Expositor / Orador
                      </label>
                      <input
                        type="text"
                        required
                        value={podcastForm.speaker}
                        onChange={(e) => setPodcastForm({ ...podcastForm, speaker: e.target.value })}
                        placeholder="Ej. Pastor Daniel Canclini"
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Fecha
                      </label>
                      <input
                        type="date"
                        required
                        value={podcastForm.date}
                        onChange={(e) => setPodcastForm({ ...podcastForm, date: e.target.value })}
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Enlace de Audio MP3 (o embed URL)
                      </label>
                      <input
                        type="url"
                        required
                        value={podcastForm.audioUrl}
                        onChange={(e) => setPodcastForm({ ...podcastForm, audioUrl: e.target.value })}
                        placeholder="Ej. https://www.ejemplo.com/audio.mp3"
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Duración
                      </label>
                      <input
                        type="text"
                        required
                        value={podcastForm.duration}
                        onChange={(e) => setPodcastForm({ ...podcastForm, duration: e.target.value })}
                        placeholder="Ej. 15 min, 20 min"
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-dorado hover:bg-dorado/90 text-crema font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 w-fit px-8 mt-2 md:col-span-2"
                    >
                      Agregar Podcast
                    </button>
                  </form>
                </div>

                {/* Listado */}
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <h3 className="font-display text-lg font-bold text-white mb-6">
                    Audios Guardados
                  </h3>
                  
                  {dbData?.podcasts.length === 0 ? (
                    <p className="text-sm text-texto-muted text-center py-6">No hay audios en la lista.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {dbData?.podcasts.map((pod: Podcast) => (
                        <div key={pod.id} className="border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-monte/40">
                          <div>
                            <span className="text-[9px] font-bold text-dorado uppercase tracking-wide">{pod.speaker} · {pod.duration}</span>
                            <h4 className="font-display font-bold text-white text-base mt-0.5">{pod.title}</h4>
                            <span className="text-[10px] text-texto-muted mt-1 block max-w-sm truncate">Link: {pod.audioUrl}</span>
                          </div>
                          <button
                            onClick={() => deleteItem("podcasts", pod.id)}
                            className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider shrink-0"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: ESTUDIOS BÍBLICOS */}
            {activeTab === "studies" && (
              <div className="flex flex-col gap-8">
                {/* Form agregar */}
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-dorado" />
                  <h2 className="font-display text-xl font-bold text-white mb-6">
                    Crear Guía de Estudio / Célula
                  </h2>
                  
                  <form onSubmit={addStudy} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Título del Estudio
                      </label>
                      <input
                        type="text"
                        required
                        value={studyForm.title}
                        onChange={(e) => setStudyForm({ ...studyForm, title: e.target.value })}
                        placeholder="Ej. Romanos capítulo 1, La Armadura de Dios..."
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Autor / Redactor
                      </label>
                      <input
                        type="text"
                        required
                        value={studyForm.author}
                        onChange={(e) => setStudyForm({ ...studyForm, author: e.target.value })}
                        placeholder="Ej. Líder de Educación..."
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Fecha
                      </label>
                      <input
                        type="date"
                        required
                        value={studyForm.date}
                        onChange={(e) => setStudyForm({ ...studyForm, date: e.target.value })}
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Contenido Completo del Estudio
                      </label>
                      <textarea
                        required
                        rows={8}
                        value={studyForm.content}
                        onChange={(e) => setStudyForm({ ...studyForm, content: e.target.value })}
                        placeholder="Escribe todo el material del estudio bíblico aquí. Puedes usar saltos de línea para estructurarlo..."
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-dorado focus:outline-none transition-colors resize-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                        Enlace a Archivo PDF (Opcional - Google Drive, Dropbox, URL directa)
                      </label>
                      <input
                        type="url"
                        value={studyForm.pdfUrl}
                        onChange={(e) => setStudyForm({ ...studyForm, pdfUrl: e.target.value })}
                        placeholder="Ej. https://ejemplo.com/estudio.pdf o enlace a Google Drive"
                        className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-dorado hover:bg-dorado/90 text-crema font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 w-fit px-8 mt-2 md:col-span-2"
                    >
                      Publicar Estudio
                    </button>
                  </form>
                </div>

                {/* Listado */}
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <h3 className="font-display text-lg font-bold text-white mb-6">
                    Estudios Publicados
                  </h3>
                  
                  {dbData?.studies.length === 0 ? (
                    <p className="text-sm text-texto-muted text-center py-6">No hay estudios en la lista.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {dbData?.studies.map((study: Study) => (
                        <div key={study.id} className="border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-monte/40">
                          <div>
                            <span className="text-[9px] font-bold text-dorado uppercase tracking-wide">{study.author} · {study.date}</span>
                            <h4 className="font-display font-bold text-white text-base mt-0.5">{study.title}</h4>
                            <p className="text-xs text-texto-muted mt-1 max-w-xl line-clamp-2">{study.content}</p>
                            {study.pdfUrl && (
                              <button 
                                type="button"
                                onClick={() => triggerPdfDownload(study.pdfUrl!, study.title)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-dorado hover:underline mt-2 bg-white/5 border border-dorado/30 px-3 py-1 rounded-lg cursor-pointer"
                              >
                                📥 Descargar Documento PDF
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => deleteItem("studies", study.id)}
                            className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider shrink-0"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: GALERÍA DE FOTOS */}
            {activeTab === "gallery" && (
              <div className="flex flex-col gap-8">
                {/* Agregar por URL en Firestore */}
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-dorado" />
                  <h2 className="font-display text-xl font-bold text-white mb-2">
                    Agregar Foto a la Galería (100% Gratis en Firestore)
                  </h2>
                  <p className="text-xs text-texto-muted mb-6">
                    Pegá aquí el enlace / URL de cualquier foto (Facebook, Instagram, Google Drive, Unsplash, Imgur, etc.)
                  </p>
                  
                  <form onSubmit={handleAddPhotoUrl} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="url"
                      required
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      placeholder="Ej. https://images.unsplash.com/photo-123456... o link de foto"
                      className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-dorado focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={loading || !photoUrlInput}
                      className="bg-dorado hover:bg-dorado/90 disabled:bg-dorado/40 text-crema font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 shrink-0 px-8"
                    >
                      Agregar Foto
                    </button>
                  </form>
                </div>

                {/* Listado */}
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <h3 className="font-display text-lg font-bold text-white mb-6">
                    Fotos en la Galería
                  </h3>
                  
                  {dbData?.gallery.length === 0 ? (
                    <p className="text-sm text-texto-muted text-center py-6">La galería de fotos está vacía.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {dbData?.gallery.map((photo: string, idx: number) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/5 group">
                          <img
                            src={photo}
                            alt={`Foto galería ${idx + 1}`}
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                            <button
                              onClick={() => deletePhoto(photo)}
                              className="bg-red-950 border border-red-800 text-red-300 font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-lg hover:bg-red-900 transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: MENSAJES RECIBIDOS */}
            {activeTab === "messages" && (
              <div className="flex flex-col gap-6">
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-dorado" />
                  <h2 className="font-display text-xl font-bold text-white mb-2">
                    Buzón de Mensajes y Pedidos de Oración
                  </h2>
                  <p className="text-xs text-texto-muted mb-6">
                    Mensajes enviados por la comunidad desde el formulario de la página principal.
                  </p>

                  {!dbData?.messages || dbData.messages.length === 0 ? (
                    <p className="text-sm text-texto-muted text-center py-10">No hay mensajes recibidos aún.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {[...(dbData.messages || [])].reverse().map((msg: any) => (
                        <div 
                          key={msg.id} 
                          className={`border rounded-2xl p-5 transition-all flex flex-col gap-3 relative ${
                            msg.read 
                              ? "bg-monte-dark/30 border-white/5 opacity-70 hover:opacity-100" 
                              : "bg-monte border-dorado/20 shadow-[0_4px_15px_rgba(200,168,75,0.05)]"
                          }`}
                        >
                          {!msg.read && (
                            <span className="absolute top-4 right-4 bg-dorado text-crema text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                              Nuevo
                            </span>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="font-bold text-sm text-white">{msg.name}</span>
                            <span className="text-xs text-tierra font-bold">📱 {msg.phone}</span>
                            <span className="text-[10px] text-texto-muted">
                              📅 {new Date(msg.date).toLocaleString("es-AR")}
                            </span>
                          </div>

                          <p className="text-xs text-texto leading-relaxed whitespace-pre-wrap">
                            {msg.message}
                          </p>

                          <div className="flex items-center gap-3 mt-2 pt-3 border-t border-white/5">
                            <button
                              onClick={() => handleToggleMessageRead(msg.id)}
                              className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all ${
                                msg.read
                                  ? "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                                  : "bg-dorado hover:bg-dorado/90 text-crema"
                              }`}
                            >
                              {msg.read ? "Marcar como No Leído" : "Marcar como Leído"}
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
