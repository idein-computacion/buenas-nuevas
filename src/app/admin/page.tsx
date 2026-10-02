"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import FileUpload from "@/components/FileUpload";
import { DbData, EventItem, Sermon, Podcast, Study, LiveStream, ScheduleItem, defaultSchedules } from "@/lib/db";
import { 
  getDbDataClient, 
  getCachedDbData,
  updateVerseClient, 
  updateLiveStreamClient,
  updateHeroVideoClient,
  saveItemClient, 
  deleteItemClient, 
  addGalleryPhotoClient, 
  deleteGalleryPhotoClient, 
  toggleMessageReadClient, 
  deleteMessageClient 
} from "@/lib/firestoreClient";
import { triggerPdfDownload } from "@/lib/pdfHelper";
import { getYouTubeEmbedUrl, cleanStreamUrl, getHeroVideoInfo } from "@/lib/youtube";
import StreamPlayer from "@/components/StreamPlayer";

type TabType = "verse" | "schedules" | "events" | "sermons" | "podcasts" | "studies" | "gallery" | "messages" | "livestream" | "herovideo";

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

  const today = new Date().toISOString().split('T')[0];
  const defaultPastor = "Pastor Pablo Garay";

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const clean = dateStr.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
    const dateObj = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
    if (isNaN(dateObj.getTime())) return dateStr;
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Form States
  const [verseForm, setVerseForm] = useState({ text: "", reference: "" });
  const [eventForm, setEventForm] = useState({ title: "", date: today, time: "", description: "", category: "Comunidad", imageUrl: "" });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [sermonForm, setSermonForm] = useState({ title: "", preacher: defaultPastor, date: today, videoUrl: "", duration: "" });
  const [podcastForm, setPodcastForm] = useState({ title: "", speaker: defaultPastor, date: today, audioUrl: "", duration: "" });
  const [studyForm, setStudyForm] = useState({ title: "", author: defaultPastor, date: today, content: "", pdfUrl: "" });
  const [liveStreamForm, setLiveStreamForm] = useState<LiveStream>({
    active: false,
    title: "Streaming en Vivo",
    streamUrl: "https://iptv.ixfo.com.ar:30443/live/ClassicaTvObera/playlist.m3u8",
    description: "Te damos la bienvenida a nuestra transmisión en vivo. ¡Compartí este tiempo con nosotros desde cualquier lugar!",
    scheduledTime: "Domingos 19:30 hs"
  });
  
  // Schedule Form State
  const [scheduleForm, setScheduleForm] = useState({ dia: "Miércoles", hora: "", titulo: "", desc: "" });
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Gallery Photo URL State
  const [photoUrlInput, setPhotoUrlInput] = useState<string>("");

  // Hero Video State
  const [heroVideoForm, setHeroVideoForm] = useState<string>("/video.mp4");

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
      if (initialData) {
        if (!initialData.schedules || initialData.schedules.length === 0) {
          initialData.schedules = defaultSchedules;
        }
        setDbData(initialData);
        if (initialData.verse) {
          setVerseForm({
            text: initialData.verse.text || "",
            reference: initialData.verse.reference || ""
          });
        }
        if (initialData.liveStream) {
          setLiveStreamForm(initialData.liveStream);
        }
        if (initialData.heroVideo) {
          setHeroVideoForm(initialData.heroVideo === "/bg-video.mp4" ? "/video.mp4" : initialData.heroVideo);
        }
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
        if (!data.schedules || data.schedules.length === 0) {
          data.schedules = defaultSchedules;
        }
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
        if (data.heroVideo) {
          setHeroVideoForm(data.heroVideo === "/bg-video.mp4" ? "/video.mp4" : data.heroVideo);
        }
      }
    } catch (err) {
      console.error("Error fetching content:", err);
    }
  };

  const saveHeroVideoDirect = async (url: string) => {
    setLoading(true);
    let videoUrlToSave = url.trim() || "/video.mp4";
    if (videoUrlToSave.match(/^[a-zA-Z]:[\\\/]/) || videoUrlToSave.startsWith("file://") || videoUrlToSave.includes("Fotos Buenas Nuevas")) {
      videoUrlToSave = "/video.mp4";
    }
    const dbUrlToSave = videoUrlToSave.startsWith("blob:") ? "/video.mp4" : videoUrlToSave;
    setHeroVideoForm(videoUrlToSave);
    const success = await updateHeroVideoClient(dbUrlToSave);
    setLoading(false);
    if (success) {
      showStatus("success", "¡Fondo de video de portada guardado y aplicado con éxito!");
      if (dbData) {
        setDbData({ ...dbData, heroVideo: dbUrlToSave });
      }
    } else {
      showStatus("error", "Error al guardar el video de portada. Intente de nuevo.");
    }
  };

  const handleSaveHeroVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveHeroVideoDirect(heroVideoForm);
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

  const saveLiveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleContentAction("updateLiveStream", { liveStream: liveStreamForm });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("livestream-updated", { detail: liveStreamForm }));
      localStorage.setItem("bn_livestream_sync", JSON.stringify(liveStreamForm));
    }
  };

  const toggleLiveStatus = async () => {
    const updated = { ...liveStreamForm, active: !liveStreamForm.active };
    setLiveStreamForm(updated);
    await handleContentAction("updateLiveStream", { liveStream: updated });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("livestream-updated", { detail: updated }));
      localStorage.setItem("bn_livestream_sync", JSON.stringify(updated));
    }
  };

  const saveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const itemToSave = editingEventId
      ? { ...eventForm, id: editingEventId }
      : eventForm;
    handleContentAction("saveItem", { type: "events", item: itemToSave });
    setEventForm({ title: "", date: today, time: "", description: "", category: "Comunidad", imageUrl: "" });
    setEditingEventId(null);
  };

  const handleEditEvent = (item: EventItem) => {
    setEventForm({
      title: item.title,
      date: item.date,
      time: item.time,
      description: item.description,
      category: item.category,
      imageUrl: item.imageUrl || ""
    });
    setEditingEventId(item.id);
    const formElement = document.getElementById("event-form-container");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCancelEditEvent = () => {
    setEventForm({ title: "", date: today, time: "", description: "", category: "Comunidad", imageUrl: "" });
    setEditingEventId(null);
  };

  const addSermon = (e: React.FormEvent) => {
    e.preventDefault();
    handleContentAction("saveItem", { type: "sermons", item: sermonForm });
    setSermonForm({ title: "", preacher: defaultPastor, date: today, videoUrl: "", duration: "" });
  };

  const addPodcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podcastForm.audioUrl) {
      showStatus("error", "Falta el audio. Subí un archivo (y esperá a que termine) o pegá una URL externa.");
      return;
    }
    handleContentAction("saveItem", { type: "podcasts", item: podcastForm });
    setPodcastForm({ title: "", speaker: defaultPastor, date: today, audioUrl: "", duration: "" });
  };

  const addStudy = (e: React.FormEvent) => {
    e.preventDefault();
    handleContentAction("saveItem", { type: "studies", item: studyForm });
    setStudyForm({ title: "", author: defaultPastor, date: today, content: "", pdfUrl: "" });
  };

  const saveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.dia || !scheduleForm.hora || !scheduleForm.titulo) {
      showStatus("error", "Por favor completá día, horario y título de la reunión.");
      return;
    }
    const itemToSave = editingScheduleId
      ? { ...scheduleForm, id: editingScheduleId }
      : { ...scheduleForm, id: "sch-" + Date.now() };

    handleContentAction("saveItem", { type: "schedules", item: itemToSave });
    setScheduleForm({ dia: "Miércoles", hora: "", titulo: "", desc: "" });
    setEditingScheduleId(null);
  };

  const handleEditSchedule = (item: ScheduleItem) => {
    setScheduleForm({ dia: item.dia, hora: item.hora, titulo: item.titulo, desc: item.desc || "" });
    setEditingScheduleId(item.id);
  };

  const handleCancelEditSchedule = () => {
    setScheduleForm({ dia: "Miércoles", hora: "", titulo: "", desc: "" });
    setEditingScheduleId(null);
  };

  const deleteSchedule = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este horario de reunión?")) {
      handleContentAction("deleteItem", { type: "schedules", id });
      if (editingScheduleId === id) {
        handleCancelEditSchedule();
      }
    }
  };

  const deleteItem = (type: "events" | "sermons" | "podcasts" | "studies" | "schedules", id: string) => {
    if (confirm("¿Estás seguro de eliminar este elemento?")) {
      handleContentAction("deleteItem", { type, id });
      if (type === "events" && editingEventId === id) {
        handleCancelEditEvent();
      }
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
      <div className="min-h-screen bg-crema flex flex-col items-center justify-center p-6 text-slate-800 text-sm uppercase tracking-widest font-bold">
        <div className="w-8 h-8 rounded-full border-2 border-tierra border-t-transparent animate-spin mb-4" />
        Verificando sesión...
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-crema flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 md:p-10 w-full max-w-md relative overflow-hidden shadow-xl border border-slate-200">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-tierra" />
          
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              Acceso Administrativo
            </h1>
            <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-bold">
              Iglesia Buenas Nuevas
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="text-[10px] font-bold text-tierra uppercase tracking-wider block mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresá el usuario..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-tierra uppercase tracking-wider block mb-1.5">
                Contraseña de Acceso
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresá la contraseña..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
              />
            </div>

            {loginError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-center font-bold">
                ⚠️ {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-tierra hover:bg-tierra-dark disabled:bg-tierra/50 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                "Entrar al Panel"
              )}
            </button>
          </form>

          <Link href="/" className="block text-center text-xs text-tierra hover:underline mt-6 font-semibold">
            ← Volver a la página de inicio
          </Link>
        </div>
      </div>
    );
  }

  // PANEL DASHBOARD SCREEN
  return (
    <div className="min-h-screen bg-crema text-slate-800 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-slate-200">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-slate-900">
              Panel de Administración
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
              Iglesia Buenas Nuevas · Oberá
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="text-xs font-bold border border-slate-300 hover:border-tierra text-slate-700 hover:text-tierra bg-white hover:bg-slate-50 px-4.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              👁️ Ver Sitio Público
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs font-bold bg-tierra hover:bg-tierra-dark text-white px-4.5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
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
          <div className="md:col-span-3 flex flex-col gap-2 bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
            {[
              { 
                id: "livestream", 
                label: `🔴 Streaming en Vivo${liveStreamForm.active ? " (ACTIVO)" : ""}` 
              },
              { 
                id: "schedules", 
                label: `⏰ Horarios de Cultos (${(dbData?.schedules && dbData.schedules.length > 0 ? dbData.schedules : defaultSchedules).length})` 
              },
              { id: "herovideo", label: "🎬 Fondo de Portada (Video)" },
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
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wide cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-tierra text-white shadow-sm" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${liveStreamForm.active ? "bg-red-500" : "bg-slate-400"}`} />
                        Transmisión en Vivo (Streaming)
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Controlá la transmisión en directo para IPTV, YouTube Live o Facebook. Al activarlo, aparecerá destacado en la página web y en el botón &ldquo;Ver en vivo&rdquo;.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={toggleLiveStatus}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        liveStreamForm.active
                          ? "bg-red-600 hover:bg-red-700 text-white shadow"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${liveStreamForm.active ? "bg-white" : "bg-white"}`} />
                      {liveStreamForm.active ? "En Vivo: ACTIVADO (Apagar)" : "En Vivo: APAGADO (Activar)"}
                    </button>
                  </div>

                  {/* Estado Banner */}
                  <div className={`p-4 rounded-2xl border text-xs font-bold mb-6 flex items-center justify-between ${
                    liveStreamForm.active
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}>
                    <span>
                      {liveStreamForm.active 
                        ? "🔴 La transmisión está ACTIVA y visible para todos los visitantes del sitio." 
                        : "⚪ La transmisión está INACTIVA. Los visitantes verán el horario de la próxima reunión."}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                      {liveStreamForm.active ? "Transmitiendo" : "Fuera de línea"}
                    </span>
                  </div>

                  <form onSubmit={saveLiveStream} className="flex flex-col gap-5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Título de la Transmisión
                      </label>
                      <input
                        type="text"
                        required
                        value={liveStreamForm.title}
                        onChange={(e) => setLiveStreamForm({ ...liveStreamForm, title: e.target.value })}
                        placeholder="Ej. Culto Dominical de Adoración y Mensaje de la Palabra"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                          Enlace del Video en Vivo (IPTV M3U8, YouTube, Facebook, SelvaPlay, etc.)
                        </label>
                        <input
                          type="text"
                          required
                          value={liveStreamForm.streamUrl}
                          onChange={(e) => setLiveStreamForm({ ...liveStreamForm, streamUrl: cleanStreamUrl(e.target.value) })}
                          placeholder="Ej. https://.../playlist.m3u8, YouTube, Facebook o <iframe>"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                          Horario Programado / Aviso
                        </label>
                        <input
                          type="text"
                          value={liveStreamForm.scheduledTime || ""}
                          onChange={(e) => setLiveStreamForm({ ...liveStreamForm, scheduledTime: e.target.value })}
                          placeholder="Ej. Domingos 19:30 hs · Culto General"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Descripción o Mensaje para los Espectadores
                      </label>
                      <textarea
                        rows={3}
                        value={liveStreamForm.description}
                        onChange={(e) => setLiveStreamForm({ ...liveStreamForm, description: e.target.value })}
                        placeholder="Escribe un mensaje de bienvenida o instrucciones para quienes se conectan..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all resize-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-tierra hover:bg-tierra-dark disabled:bg-tierra/50 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-8 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer"
                      >
                        {loading ? "Guardando..." : "Guardar Configuración en Vivo"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Vista Previa del Reproductor */}
                {liveStreamForm.streamUrl && liveStreamForm.active && (
                  <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                    <h3 className="font-display text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span>📺</span> Vista Previa del Reproductor
                    </h3>
                    <div className="w-full max-w-2xl">
                      <StreamPlayer
                        url={liveStreamForm.streamUrl}
                        title="Vista Previa de Transmisión"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: HORARIOS DE CULTOS */}
            {activeTab === "schedules" && (
              <div className="flex flex-col gap-8">
                {/* Formulario Crear / Editar */}
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-tierra" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                        ⏰ {editingScheduleId ? "Editar Horario de Culto / Reunión" : "Nuevo Horario de Culto / Reunión"}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Configurá las reuniones semanales que se mostrarán en la página principal y en los avisos de streaming.
                      </p>
                    </div>
                    {editingScheduleId && (
                      <button
                        type="button"
                        onClick={handleCancelEditSchedule}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
                      >
                        ✕ Cancelar Edición
                      </button>
                    )}
                  </div>

                  <form onSubmit={saveSchedule} className="flex flex-col gap-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                          Día de la Semana
                        </label>
                        <input
                          type="text"
                          required
                          value={scheduleForm.dia}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, dia: e.target.value })}
                          placeholder="Ej. Miércoles, Sábado, Domingo..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                          Horario
                        </label>
                        <input
                          type="text"
                          required
                          value={scheduleForm.hora}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, hora: e.target.value })}
                          placeholder="Ej. 19:00 hs, 20:00 hs, 19:30 hs..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Título de la Reunión / Culto
                      </label>
                      <input
                        type="text"
                        required
                        value={scheduleForm.titulo}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, titulo: e.target.value })}
                        placeholder="Ej. Reunión de Alabanza, Oración y Estudio de la Palabra"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Descripción o Ubicación Especial (Opcional)
                      </label>
                      <textarea
                        rows={2}
                        value={scheduleForm.desc}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, desc: e.target.value })}
                        placeholder="Ej. En Edificio Fundacional (Rincón y Reconquista) o Tiempo de comunión..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-tierra hover:bg-tierra-dark disabled:bg-tierra/50 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? (
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : editingScheduleId ? (
                          "Actualizar Horario"
                        ) : (
                          "Agregar Horario"
                        )}
                      </button>

                      {editingScheduleId && (
                        <button
                          type="button"
                          onClick={handleCancelEditSchedule}
                          className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider py-3.5 px-5 rounded-xl transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Lista de Horarios Configurados */}
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        Horarios Registrados en la Web
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Podés editar o eliminar los horarios existentes. Se reflejarán de inmediato en el sitio.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-tierra bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      {(dbData?.schedules && dbData.schedules.length > 0 ? dbData.schedules : defaultSchedules).length} reuniones
                    </span>
                  </div>

                  {(() => {
                    const activeSchedules = (dbData?.schedules && dbData.schedules.length > 0) ? dbData.schedules : defaultSchedules;
                    return (
                      <div className="flex flex-col gap-3">
                        {activeSchedules.map((item: ScheduleItem) => (
                          <div
                            key={item.id}
                            className={`border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                              editingScheduleId === item.id ? "border-tierra shadow-md bg-blue-50/40" : "border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-sm"
                            }`}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-tierra uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                                  {item.dia} · {item.hora}
                                </span>
                              </div>
                              <h4 className="font-display text-base font-bold text-slate-900 mt-1.5">
                                {item.titulo}
                              </h4>
                              {item.desc && (
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                  {item.desc}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => handleEditSchedule(item)}
                                className="text-xs font-bold text-tierra hover:text-white bg-blue-50 hover:bg-tierra border border-blue-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSchedule(item.id)}
                                className="text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TAB 1: VERSICULO DEL DIA */}
            {activeTab === "verse" && (
              <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-tierra" />
                <h2 className="font-display text-xl font-bold text-slate-900 mb-6">
                  Editar Versículo del Día
                </h2>
                
                <form onSubmit={saveVerse} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      Texto Bíblico
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={verseForm.text}
                      onChange={(e) => setVerseForm({ ...verseForm, text: e.target.value })}
                      placeholder="Escribe el texto bíblico aquí..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      Referencia (Libro, Capítulo y Versículo)
                    </label>
                    <input
                      type="text"
                      required
                      value={verseForm.reference}
                      onChange={(e) => setVerseForm({ ...verseForm, reference: e.target.value })}
                      placeholder="Ej. Juan 3:16"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-tierra hover:bg-tierra-dark disabled:bg-tierra/50 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 w-fit px-8 mt-2 shadow-md hover:shadow-lg cursor-pointer"
                  >
                    Actualizar Versículo
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: EVENTOS / ACTIVIDADES */}
            {activeTab === "events" && (
              <div className="flex flex-col gap-8">
                {/* Form agregar / editar */}
                <div id="event-form-container" className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm transition-all">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-tierra" />
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      {editingEventId ? "Editar Actividad / Evento" : "Agregar Actividad / Evento"}
                    </h2>
                    {editingEventId && (
                      <span className="text-xs bg-blue-50 text-tierra border border-blue-200 px-3 py-1 rounded-full font-bold">
                        Modo Edición
                      </span>
                    )}
                  </div>
                  
                  <form onSubmit={saveEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Título del Evento
                      </label>
                      <input
                        type="text"
                        required
                        value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        placeholder="Ej. Campaña Solidaria, Retiro..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Fecha
                      </label>
                      <input
                        type="date"
                        required
                        value={eventForm.date}
                        onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Horario de Referencia
                      </label>
                      <input
                        type="text"
                        required
                        value={eventForm.time}
                        onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                        placeholder="Ej. 18:00 hs, Culto general"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Categoría
                      </label>
                      <select
                        value={eventForm.category}
                        onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      >
                        <option value="Comunidad">Comunidad</option>
                        <option value="Jóvenes">Jóvenes</option>
                        <option value="Estudio">Estudio</option>
                        <option value="Social">Social</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Breve Descripción
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        placeholder="Escribe detalles del evento..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all resize-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Imagen Descriptiva (Opcional)
                      </label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <FileUpload 
                          onUploadSuccess={(url) => setEventForm({ ...eventForm, imageUrl: url })}
                          accept="image/*"
                          label="Subir imagen del evento"
                        />
                        <div className="relative flex items-center py-4">
                          <div className="flex-grow border-t border-slate-200"></div>
                          <span className="flex-shrink-0 mx-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">O pegar URL de imagen</span>
                          <div className="flex-grow border-t border-slate-200"></div>
                        </div>
                        <input
                          type="text"
                          value={eventForm.imageUrl || ""}
                          onChange={(e) => setEventForm({ ...eventForm, imageUrl: e.target.value })}
                          placeholder="Ej. https://ejemplo.com/foto.jpg"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-tierra focus:outline-none transition-colors"
                        />
                        {eventForm.imageUrl && (
                          <div className="mt-3 flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
                            <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                              <img src={eventForm.imageUrl} alt="Vista previa" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xs text-slate-600 truncate flex-grow">{eventForm.imageUrl}</span>
                            <button
                              type="button"
                              onClick={() => setEventForm({ ...eventForm, imageUrl: "" })}
                              className="text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1 cursor-pointer"
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2 md:col-span-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-tierra hover:bg-tierra-dark disabled:bg-tierra/50 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-8 rounded-xl transition-all duration-300 w-fit flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
                      >
                        {loading ? (
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : editingEventId ? (
                          "Actualizar Evento"
                        ) : (
                          "Agregar Evento"
                        )}
                      </button>

                      {editingEventId && (
                        <button
                          type="button"
                          onClick={handleCancelEditEvent}
                          className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Listado ordenado cronológicamente (más actual a más antiguo) */}
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        Eventos Guardados
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Ordenados cronológicamente, desde el más actual al más antiguo.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-tierra bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      {dbData?.events?.length || 0} eventos
                    </span>
                  </div>
                  
                  {(() => {
                    const sortedEvents = [...(dbData?.events || [])].sort((a, b) => {
                      const timeA = new Date(a.date).getTime() || 0;
                      const timeB = new Date(b.date).getTime() || 0;
                      if (timeB !== timeA) return timeB - timeA;
                      return (b.id || "").localeCompare(a.id || "");
                    });

                    if (sortedEvents.length === 0) {
                      return <p className="text-sm text-slate-500 text-center py-6">No hay eventos en la agenda.</p>;
                    }

                    return (
                      <div className="flex flex-col gap-4">
                        {sortedEvents.map((event: EventItem) => (
                          <div
                            key={event.id}
                            className={`border rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                              editingEventId === event.id
                                ? "border-tierra shadow-md bg-blue-50/40"
                                : "border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              {event.imageUrl && (
                                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 hidden sm:block bg-slate-100">
                                  <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div>
                                <span className="text-[9px] font-bold text-tierra uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  {event.category} · {formatDisplayDate(event.date)} {event.time ? `· ${event.time}` : ""}
                                </span>
                                <h4 className="font-display font-bold text-slate-900 text-base mt-1.5">{event.title}</h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-xl line-clamp-2">{event.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => handleEditEvent(event)}
                                className="text-xs font-bold text-tierra hover:text-white bg-blue-50 hover:bg-tierra border border-blue-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteItem("events", event.id)}
                                className="text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TAB 3: SERMONES / VIDEOS */}
            {activeTab === "sermons" && (
              <div className="flex flex-col gap-8">
                {/* Form agregar */}
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-tierra" />
                  <h2 className="font-display text-xl font-bold text-slate-900 mb-6">
                    Agregar Video / Predicación
                  </h2>
                  
                  <form onSubmit={addSermon} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Título de la Predicación
                      </label>
                      <input
                        type="text"
                        required
                        value={sermonForm.title}
                        onChange={(e) => setSermonForm({ ...sermonForm, title: e.target.value })}
                        placeholder="Ej. Caminando en fe, Vivir en comunidad..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Predicador (Pastor/a o Expositor)
                      </label>
                      <input
                        type="text"
                        required
                        value={sermonForm.preacher}
                        onChange={(e) => setSermonForm({ ...sermonForm, preacher: e.target.value })}
                        placeholder="Ej. Pastor Daniel"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Fecha de la Reunión
                      </label>
                      <input
                        type="date"
                        required
                        value={sermonForm.date}
                        onChange={(e) => setSermonForm({ ...sermonForm, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Enlace de Video (YouTube)
                      </label>
                      <input
                        type="url"
                        required
                        value={sermonForm.videoUrl}
                        onChange={(e) => setSermonForm({ ...sermonForm, videoUrl: e.target.value })}
                        placeholder="Ej. https://www.youtube.com/watch?v=..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Duración Estimada
                      </label>
                      <input
                        type="text"
                        required
                        value={sermonForm.duration}
                        onChange={(e) => setSermonForm({ ...sermonForm, duration: e.target.value })}
                        placeholder="Ej. 45 min, 1 hora"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-tierra hover:bg-tierra-dark disabled:bg-tierra/50 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 w-fit px-8 mt-2 md:col-span-2 shadow-md hover:shadow-lg cursor-pointer"
                    >
                      Agregar Sermón
                    </button>
                  </form>
                </div>

                {/* Listado */}
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <h3 className="font-display text-lg font-bold text-slate-900 mb-6">
                    Sermones Guardados
                  </h3>
                  
                  {dbData?.sermons.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">No hay videos en la lista.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {dbData?.sermons.map((sermon: Sermon) => (
                        <div key={sermon.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/70 hover:bg-white hover:shadow-sm transition-all">
                          <div>
                            <span className="text-[9px] font-bold text-tierra uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{sermon.preacher} · {sermon.duration}</span>
                            <h4 className="font-display font-bold text-slate-900 text-base mt-1.5">{sermon.title}</h4>
                            <span className="text-[10px] text-slate-500 mt-1 block max-w-sm truncate">URL: {sermon.videoUrl}</span>
                          </div>
                          <button
                            onClick={() => deleteItem("sermons", sermon.id)}
                            className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider shrink-0 cursor-pointer"
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
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-tierra" />
                  <h2 className="font-display text-xl font-bold text-slate-900 mb-6">
                    Agregar Podcast / Mensaje en Audio
                  </h2>
                  
                  <form onSubmit={addPodcast} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Título del Audio
                      </label>
                      <input
                        type="text"
                        required
                        value={podcastForm.title}
                        onChange={(e) => setPodcastForm({ ...podcastForm, title: e.target.value })}
                        placeholder="Ej. La Paz en el hogar, Devocionales..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Expositor / Orador
                      </label>
                      <input
                        type="text"
                        required
                        value={podcastForm.speaker}
                        onChange={(e) => setPodcastForm({ ...podcastForm, speaker: e.target.value })}
                        placeholder="Ej. Pastor Daniel"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Fecha
                      </label>
                      <input
                        type="date"
                        required
                        value={podcastForm.date}
                        onChange={(e) => setPodcastForm({ ...podcastForm, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Duración
                      </label>
                      <input
                        type="text"
                        required
                        value={podcastForm.duration}
                        onChange={(e) => setPodcastForm({ ...podcastForm, duration: e.target.value })}
                        placeholder="Ej. 15 min, 20 min"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Archivo de Audio MP3
                      </label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <FileUpload 
                          onUploadSuccess={(url) => setPodcastForm({ ...podcastForm, audioUrl: url })}
                          accept="audio/mp3,audio/mpeg"
                          label="Subir audio MP3"
                        />
                        <div className="relative flex items-center py-4">
                          <div className="flex-grow border-t border-slate-200"></div>
                          <span className="flex-shrink-0 mx-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">O pegar URL externa de audio</span>
                          <div className="flex-grow border-t border-slate-200"></div>
                        </div>
                        <input
                          type="text"
                          value={podcastForm.audioUrl}
                          onChange={(e) => setPodcastForm({ ...podcastForm, audioUrl: e.target.value })}
                          placeholder="Ej. https://www.ejemplo.com/audio.mp3"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-tierra focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-tierra hover:bg-tierra-dark text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 w-fit px-8 mt-2 md:col-span-2 shadow-md hover:shadow-lg cursor-pointer"
                    >
                      Agregar Podcast
                    </button>
                  </form>
                </div>

                {/* Listado */}
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <h3 className="font-display text-lg font-bold text-slate-900 mb-6">
                    Audios Guardados
                  </h3>
                  
                  {dbData?.podcasts.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">No hay audios en la lista.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {dbData?.podcasts.map((pod: Podcast) => (
                        <div key={pod.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/70 hover:bg-white hover:shadow-sm transition-all">
                          <div>
                            <span className="text-[9px] font-bold text-tierra uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{pod.speaker} · {pod.duration}</span>
                            <h4 className="font-display font-bold text-slate-900 text-base mt-1.5">{pod.title}</h4>
                            <span className="text-[10px] text-slate-500 mt-1 block max-w-sm truncate">Link: {pod.audioUrl}</span>
                          </div>
                          <button
                            onClick={() => deleteItem("podcasts", pod.id)}
                            className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider shrink-0 cursor-pointer"
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
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-tierra" />
                  <h2 className="font-display text-xl font-bold text-slate-900 mb-6">
                    Crear Guía de Estudio / Célula
                  </h2>
                  
                  <form onSubmit={addStudy} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Título del Estudio
                      </label>
                      <input
                        type="text"
                        required
                        value={studyForm.title}
                        onChange={(e) => setStudyForm({ ...studyForm, title: e.target.value })}
                        placeholder="Ej. Romanos capítulo 1, La Armadura de Dios..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Autor / Redactor
                      </label>
                      <input
                        type="text"
                        required
                        value={studyForm.author}
                        onChange={(e) => setStudyForm({ ...studyForm, author: e.target.value })}
                        placeholder="Ej. Líder de Educación..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Fecha
                      </label>
                      <input
                        type="date"
                        required
                        value={studyForm.date}
                        onChange={(e) => setStudyForm({ ...studyForm, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Contenido Completo del Estudio
                      </label>
                      <textarea
                        required
                        rows={8}
                        value={studyForm.content}
                        onChange={(e) => setStudyForm({ ...studyForm, content: e.target.value })}
                        placeholder="Escribe todo el material del estudio bíblico aquí. Puedes usar saltos de línea para estructurarlo..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all resize-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Archivo PDF Adjunto (Opcional)
                      </label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <FileUpload 
                          onUploadSuccess={(url) => setStudyForm({ ...studyForm, pdfUrl: url })}
                          accept="application/pdf"
                          label="Subir documento PDF"
                        />
                        <div className="relative flex items-center py-4">
                          <div className="flex-grow border-t border-slate-200"></div>
                          <span className="flex-shrink-0 mx-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">O pegar URL externa (Google Drive, etc.)</span>
                          <div className="flex-grow border-t border-slate-200"></div>
                        </div>
                        <input
                          type="text"
                          value={studyForm.pdfUrl}
                          onChange={(e) => setStudyForm({ ...studyForm, pdfUrl: e.target.value })}
                          placeholder="Ej. https://ejemplo.com/estudio.pdf o enlace a Google Drive"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-tierra focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-tierra hover:bg-tierra-dark text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 w-fit px-8 mt-2 md:col-span-2 shadow-md hover:shadow-lg cursor-pointer"
                    >
                      Publicar Estudio
                    </button>
                  </form>
                </div>

                {/* Listado */}
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <h3 className="font-display text-lg font-bold text-slate-900 mb-6">
                    Estudios Publicados
                  </h3>
                  
                  {dbData?.studies.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">No hay estudios en la lista.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {dbData?.studies.map((study: Study) => (
                        <div key={study.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/70 hover:bg-white hover:shadow-sm transition-all">
                          <div>
                            <span className="text-[9px] font-bold text-tierra uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{study.author} · {formatDisplayDate(study.date)}</span>
                            <h4 className="font-display font-bold text-slate-900 text-base mt-0.5">{study.title}</h4>
                            <p className="text-xs text-slate-600 mt-1 max-w-xl line-clamp-2">{study.content}</p>
                            {study.pdfUrl && (
                              <button 
                                type="button"
                                onClick={() => triggerPdfDownload(study.pdfUrl!, study.title)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-tierra hover:underline mt-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg cursor-pointer"
                              >
                                📥 Descargar Documento PDF
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => deleteItem("studies", study.id)}
                            className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider shrink-0 cursor-pointer"
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
                {/* Agregar foto */}
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-tierra" />
                  <h2 className="font-display text-xl font-bold text-slate-900 mb-2">
                    Agregar Foto a la Galería
                  </h2>
                  <p className="text-xs text-slate-500 mb-6">
                    Podés subir una foto desde tu dispositivo o pegar el enlace de una imagen externa.
                  </p>
                  
                  <div className="mb-6">
                    <FileUpload 
                      onUploadSuccess={(url) => {
                        handleContentAction("addPhoto", { photoUrl: url });
                      }}
                      accept="image/*"
                      label="Subir imagen desde tu PC o celular"
                    />
                  </div>

                  <div className="relative flex items-center py-2 mb-6">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">O pegar un enlace externo</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>
                  
                  <form onSubmit={handleAddPhotoUrl} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="url"
                      required
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      placeholder="Ej. https://images.unsplash.com/photo-123456... o link de foto"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={loading || !photoUrlInput}
                      className="bg-tierra hover:bg-tierra-dark disabled:bg-tierra/40 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 shrink-0 px-8 shadow-md hover:shadow-lg cursor-pointer"
                    >
                      Agregar Foto
                    </button>
                  </form>
                </div>

                {/* Listado */}
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <h3 className="font-display text-lg font-bold text-slate-900 mb-6">
                    Fotos en la Galería
                  </h3>
                  
                  {dbData?.gallery.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">La galería de fotos está vacía.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {dbData?.gallery.map((photo: string, idx: number) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                          <img
                            src={photo}
                            alt={`Foto galería ${idx + 1}`}
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                            <button
                              onClick={() => deletePhoto(photo)}
                              className="bg-red-600 border border-red-700 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-lg hover:bg-red-700 transition-colors cursor-pointer"
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
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-tierra" />
                  <h2 className="font-display text-xl font-bold text-slate-900 mb-2">
                    Buzón de Mensajes y Pedidos de Oración
                  </h2>
                  <p className="text-xs text-slate-500 mb-6">
                    Mensajes enviados por la comunidad desde el formulario de la página principal.
                  </p>

                  {!dbData?.messages || dbData.messages.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-10">No hay mensajes recibidos aún.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {[...(dbData.messages || [])].reverse().map((msg: any) => (
                        <div 
                          key={msg.id} 
                          className={`border rounded-2xl p-5 transition-all flex flex-col gap-3 relative ${
                            msg.read 
                              ? "bg-slate-50/70 border-slate-200 opacity-80 hover:opacity-100" 
                              : "bg-blue-50/40 border-tierra/30 shadow-sm"
                          }`}
                        >
                          {!msg.read && (
                            <span className="absolute top-4 right-4 bg-tierra text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                              Nuevo
                            </span>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="font-bold text-sm text-slate-900">{msg.name}</span>
                            <span className="text-xs text-tierra font-bold">📱 {msg.phone}</span>
                            <span className="text-[10px] text-slate-500">
                              📅 {new Date(msg.date).toLocaleString("es-AR")}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {msg.message}
                          </p>

                          <div className="flex items-center gap-3 mt-2 pt-3 border-t border-slate-200">
                            <button
                              onClick={() => handleToggleMessageRead(msg.id)}
                              className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                msg.read
                                  ? "bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300"
                                  : "bg-tierra hover:bg-tierra-dark text-white shadow-xs"
                              }`}
                            >
                              {msg.read ? "Marcar como No Leído" : "Marcar como Leído"}
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-[10px] font-bold uppercase tracking-wider text-red-600 hover:text-red-700 transition-colors cursor-pointer"
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

            {/* TAB 10: FONDO ANIMADO DE PORTADA (HERO VIDEO) */}
            {activeTab === "herovideo" && (
              <div className="flex flex-col gap-8">
                <div className="bg-white rounded-3xl p-8 relative overflow-hidden border border-slate-200 shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-tierra" />
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🎬</span>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      Fondo Animado de Portada (Video de Inicio)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">
                    Personalizá el video de fondo que se reproduce al inicio de la página web. Podés subir un archivo propio o ingresar un enlace de video.
                  </p>

                  <form onSubmit={handleSaveHeroVideo} className="flex flex-col gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Enlace o URL del Video
                      </label>
                      <input
                        type="text"
                        value={heroVideoForm}
                        onChange={(e) => setHeroVideoForm(e.target.value)}
                        placeholder="Ej: https://facebook.com/..., https://youtube.com/... o /video.mp4"
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-tierra font-mono"
                      />
                      <p className="text-[11px] text-slate-500 mt-2">
                        Compatible con enlaces de Facebook (Reels/Videos), enlaces de YouTube o archivos de video directos.
                      </p>
                    </div>

                    {/* Botón de restablecer */}
                    <div>
                      <button
                        type="button"
                        onClick={() => saveHeroVideoDirect("/bg-video.mp4")}
                        className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-lg border border-slate-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>🔄</span> Restablecer al video original
                      </button>
                    </div>

                    {/* Opción de subir MP4 */}
                    <div className="pt-4 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        O subir un archivo de video propio (.mp4 / .webm)
                      </label>
                      <FileUpload
                        accept="video/mp4, video/webm, video/*"
                        label="Subir archivo de video desde tu dispositivo"
                        maxSizeMB={64}
                        onPreview={(previewUrl) => {
                          setHeroVideoForm(previewUrl);
                        }}
                        onUploadSuccess={async (url) => {
                          await saveHeroVideoDirect(url);
                        }}
                      />
                    </div>

                    {/* Previsualización en vivo */}
                    <div className="pt-4 border-t border-slate-100">
                      <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                        👁️ Vista Previa del Fondo Animado:
                      </span>
                      <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
                        {getHeroVideoInfo(heroVideoForm).type === "facebook" ? (
                          <iframe
                            src={getHeroVideoInfo(heroVideoForm).embedUrl}
                            className="w-full h-full min-w-full min-h-full border-0 pointer-events-none filter brightness-90 contrast-105 scale-[1.25] sm:scale-110"
                            style={{ border: "none" }}
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                          />
                        ) : getHeroVideoInfo(heroVideoForm).type === "youtube" ? (
                          <iframe
                            src={getHeroVideoInfo(heroVideoForm).embedUrl}
                            className="w-full h-full min-w-full min-h-full border-0 pointer-events-none filter brightness-90 contrast-105 scale-[1.25] sm:scale-115"
                            style={{ border: "none" }}
                            allow="autoplay; encrypted-media"
                          />
                        ) : (
                          <video
                            src={getHeroVideoInfo(heroVideoForm).url || "/video.mp4"}
                            autoPlay
                            loop
                            muted
                            playsInline
                            key={heroVideoForm}
                            className="w-full h-full object-cover filter brightness-90 contrast-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-slate-900/40 pointer-events-none flex flex-col items-center justify-center text-white text-center p-4">
                          <img src="/logo-white.png" alt="Logo" className="w-16 h-16 object-contain mb-2 drop-shadow-md" />
                          <span className="font-display font-bold text-sm drop-shadow">Previsualización de Portada</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-tierra hover:bg-tierra-dark text-white font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-full transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-2"
                      >
                        {loading ? "Guardando..." : "💾 Guardar Fondo de Portada"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
