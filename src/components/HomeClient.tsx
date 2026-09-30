"use client";

import { useState, useEffect, useRef } from "react";
import { DbData, EventItem, Sermon, Podcast, Study, ScheduleItem, defaultSchedules } from "@/lib/db";
import { getDbDataClient, submitMessageClient, subscribeToLiveStreamClient } from "@/lib/apiClient";
import { triggerPdfDownload } from "@/lib/pdfHelper";
import { 
  getYouTubeEmbedUrl, 
  getYouTubeThumbnail, 
  YOUTUBE_CHANNEL_URL, 
  YOUTUBE_PLAYLIST_EMBED_URL, 
  YOUTUBE_SUBSCRIBE_URL 
} from "@/lib/youtube";
import StreamPlayer from "@/components/StreamPlayer";

interface HomeClientProps {
  initialData: DbData;
}

export default function HomeClient({ initialData }: HomeClientProps) {
  const [data, setData] = useState<DbData>(initialData);
  const [activeTab, setActiveTab] = useState<"podcasts" | "studies">("podcasts");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState<boolean>(false);

  const currentSchedules: ScheduleItem[] = data.schedules && data.schedules.length > 0 ? data.schedules : defaultSchedules;
  const domingoSchedule = currentSchedules.find(s => s.dia?.toLowerCase().includes("domingo"));

  // Load fresh Firestore data on client mount and subscribe to realtime livestream
  useEffect(() => {
    getDbDataClient().then((freshData) => {
      if (freshData) {
        if (!freshData.schedules || freshData.schedules.length === 0) {
          freshData.schedules = defaultSchedules;
        }
        setData(freshData);
      }
    }).catch(console.error);

    const unsubscribe = subscribeToLiveStreamClient((liveStream) => {
      if (liveStream) {
        setData((prev) => ({ ...prev, liveStream }));
      }
    });

    const handleOpenLive = () => {
      setIsLiveModalOpen(true);
    };
    window.addEventListener("open-livestream", handleOpenLive);

    const handleLocalUpdate = (e: any) => {
      if (e?.detail) {
        setData((prev) => ({ ...prev, liveStream: e.detail }));
      }
    };
    window.addEventListener("livestream-updated", handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener("open-livestream", handleOpenLive);
      window.removeEventListener("livestream-updated", handleLocalUpdate);
    };
  }, []);

  // Keyboard navigation & Escape key to close any modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLiveModalOpen(false);
        setSelectedVideo(null);
        setSelectedStudy(null);
        setSelectedPhotoIndex(null);
      }
      if (selectedPhotoIndex !== null) {
        if (e.key === "ArrowRight") {
          setSelectedPhotoIndex((prev) => (prev !== null && prev < data.gallery.length - 1 ? prev + 1 : 0));
        }
        if (e.key === "ArrowLeft") {
          setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : data.gallery.length - 1));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhotoIndex, data.gallery.length]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (isLiveModalOpen || selectedVideo || selectedStudy || selectedPhotoIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLiveModalOpen, selectedVideo, selectedStudy, selectedPhotoIndex]);

  // Contact Form States
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactSuccess(null);
    setContactError(null);

    try {
      const success = await submitMessageClient(contactName, contactPhone, contactMessage);
      if (success) {
        setContactSuccess("¡Mensaje de oración / contacto enviado con éxito! Estaremos en contacto pronto.");
        setContactName("");
        setContactPhone("");
        setContactMessage("");
      } else {
        setContactError("Error al enviar el mensaje. Por favor intente más tarde.");
      }
    } catch {
      setContactError("Error de conexión. Por favor intentá de nuevo.");
    } finally {
      setContactSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
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

  return (
    <div className="relative overflow-hidden bg-crema min-h-screen text-slate-800">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-100/60 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sky-100/50 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-blue-50/60 blur-[140px] pointer-events-none" />

      <section id="inicio" className="relative pt-16 pb-16 md:pt-24 md:pb-24 flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Background Video con overlay de alto impacto */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover filter brightness-75 contrast-110"
          >
            <source src="/bg-video.mp4" type="video/mp4" />
          </video>
          {/* Overlay oscuro para que el texto blanco y botones destaquen como en Iglesia de la Ciudad */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/75 to-slate-900/90" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          {/* Logo container */}
          <div className="relative w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-white shadow-[0_0_50px_rgba(4,107,210,0.35)] mb-8 bg-white">
            <img 
              src="/logo-hero.jpg" 
              alt="Logo Iglesia Buenas Nuevas" 
              className="w-full h-full object-cover"
            />
          </div>

          <span className="text-[11px] font-bold tracking-[0.25em] text-sky-300 uppercase mb-4 border border-white/20 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md">
            Oberá · Misiones · Argentina
          </span>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-3xl">
            Donde la <span className="text-sky-400 italic">fe</span> se hace comunidad
          </h1>

          <p className="mt-6 text-base md:text-lg text-slate-200 max-w-xl leading-relaxed">
            Una familia de fe en el corazón de Oberá, con las puertas abiertas cada domingo para recibirte, adorar juntos y crecer en Su palabra.
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <a
              href="#horarios"
              className="bg-tierra hover:bg-tierra-dark text-white px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(4,107,210,0.4)] hover:shadow-[0_4px_25px_rgba(4,107,210,0.6)] transform hover:translate-y-[-2px]"
            >
              Ver Horarios
            </a>
            <a
              href="#eventos"
              className="border-2 border-white/80 hover:border-white text-white hover:bg-white/15 px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300"
            >
              Nuestras Actividades
            </a>
          </div>
        </div>
      </section>

      {/* VERSICULO DEL DIA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 -mt-8 mb-20">
        <div className="bg-white rounded-3xl p-8 md:p-10 text-center relative overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.06)] border border-slate-200">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-tierra via-sky-400 to-tierra" />
          <span className="text-[11px] font-bold text-tierra tracking-[0.2em] uppercase mb-4 block">
            Versículo del Día
          </span>
          <p className="font-display text-lg md:text-2xl font-bold text-slate-800 leading-relaxed max-w-2xl mx-auto">
            &ldquo;{data.verse.text}&rdquo;
          </p>
          <span className="mt-4 block text-xs font-bold text-tierra tracking-wider uppercase">
            — {data.verse.reference}
          </span>
        </div>
      </section>

      {/* FRANJA DE CONTACTO RAPIDO (Estilo Iglesia de la Ciudad en azul primario) */}
      <div className="bg-tierra py-4 px-6 border-y border-blue-600 shadow-md text-white">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-3 text-xs md:text-sm font-bold uppercase tracking-wider text-center">
          <span className="flex items-center gap-2.5 justify-center">
            <img src="/social-maps.png" alt="Map" className="w-4.5 h-4.5 object-contain brightness-200" /> Calle Mensú 1177, Oberá
          </span>
          <span className="text-white/40 hidden md:inline">|</span>
          <a href="tel:+543755629896" className="flex items-center gap-2 justify-center hover:text-sky-200 transition-colors">
            📞 Tel: 3755 629896
          </a>
          <span className="text-white/40 hidden md:inline">|</span>
          <span className="flex items-center gap-2.5 justify-center">
            <img src="/logo.jpg" alt="Iglesia" className="w-4.5 h-4.5 rounded-full object-cover border border-white/50" /> {domingoSchedule ? `${domingoSchedule.titulo}: Domingos ${domingoSchedule.hora}` : "Culto Dominical: Domingos 19:30 hs"}
          </span>
        </div>
      </div>

      {/* HORARIOS & EVENTOS */}
      <section id="horarios" className="relative z-10 py-20 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-16 items-start">
            
            {/* Rutina de horarios */}
            <div className="lg:col-span-5">
              <span className="text-[11px] font-bold text-tierra tracking-[0.2em] uppercase block mb-2">
                Semanales
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
                Horarios y Actividades Semanales
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-8">
                Nos reunimos durante la semana para aprender de la Biblia, orar juntos y compartir en comunidad. ¡Te invitamos a sumarte al grupo que prefieras!
              </p>
              
              <div className="flex flex-col gap-4">
                {currentSchedules.map((item, idx) => (
                  <div key={item.id || idx} className="glass-card rounded-2xl p-5 flex justify-between items-start gap-4 border border-slate-200 shadow-sm hover:shadow-md transition-all bg-slate-50/50">
                    <div>
                      <span className="text-[10px] font-bold text-tierra uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                        {item.dia} · {item.hora}
                      </span>
                      <h3 className="font-display text-lg font-bold text-slate-900 mt-2">
                        {item.titulo}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actividades y eventos dinámicos */}
            <div id="eventos" className="lg:col-span-7">
              <span className="text-[11px] font-bold text-tierra tracking-[0.2em] uppercase block mb-2">
                Agenda
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
                Próximas Actividades
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-8">
                Mantenete informado sobre los próximos acontecimientos especiales, retiros, actividades de servicio y celebraciones de nuestra iglesia.
              </p>

              {(() => {
                const sortedEvents = [...(data.events || [])].sort((a, b) => {
                  const timeA = new Date(a.date).getTime() || 0;
                  const timeB = new Date(b.date).getTime() || 0;
                  if (timeB !== timeA) return timeB - timeA;
                  return (b.id || "").localeCompare(a.id || "");
                });

                if (sortedEvents.length === 0) {
                  return (
                    <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center text-sm text-slate-500">
                      No hay eventos programados en este momento.
                    </div>
                  );
                }

                return (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {sortedEvents.map((event: EventItem) => (
                      <div key={event.id} className="glass-card rounded-2xl relative overflow-hidden flex flex-col h-full min-h-[14rem] border border-slate-200 shadow-sm hover:shadow-lg transition-all bg-white">
                        {event.imageUrl && (
                          <div className="w-full h-32 md:h-40 bg-slate-100 overflow-hidden">
                            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                          </div>
                        )}
                        <div className="p-6 flex flex-col flex-grow justify-between relative">
                          {!event.imageUrl && <div className="absolute top-0 left-0 w-full h-[3px] bg-tierra" />}
                          <div>
                            <div className="flex justify-between items-center gap-2 mb-3">
                              <span className="text-[9px] font-bold bg-blue-50 text-tierra border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {event.category}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {event.time}
                              </span>
                            </div>
                            <h3 className="font-display text-base font-bold text-slate-900 line-clamp-2 leading-tight">
                              {event.title}
                            </h3>
                            <p className="text-xs text-slate-600 mt-2.5 line-clamp-3 leading-relaxed">
                              {event.description}
                            </p>
                          </div>
                          
                          <div className="text-[11px] font-semibold text-slate-400 border-t border-slate-100 pt-3.5 mt-4 uppercase tracking-wider">
                            📅 {formatDate(event.date)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      </section>

      {/* MENSAJES & PREDICAS (VIDEOS) */}
      <section id="mensajes" className="relative z-10 py-20 border-b border-slate-200 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-tierra tracking-[0.2em] uppercase block mb-2">
              Recursos
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight">
              Predicas y Mensajes
            </h2>
            <div className="h-1 w-16 bg-tierra rounded-full mx-auto mt-4 mb-6" />
            <p className="text-slate-600 text-sm leading-relaxed">
              Volvé a escuchar las predicaciones de nuestros domingos. Mensajes de fe, esperanza y enseñanzas prácticas basadas en la Palabra de Dios.
            </p>
          </div>

          {/* BANNER CANAL OFICIAL DE YOUTUBE */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 mb-12 border border-slate-200 bg-white shadow-md relative overflow-hidden group">
            <div className="absolute -right-16 -top-16 w-52 h-52 bg-red-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-red-500/10 transition-all duration-500" />
            
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center p-3.5 shadow-sm shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <img 
                    src="/social-yt.png" 
                    alt="Canal de YouTube Iglesia Buenas Nuevas" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1 rounded-full text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Canal Oficial de YouTube
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Iglesia Buenas Nuevas Para Todos
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
                    Mirá todas nuestras prédicas dominicales, estudios bíblicos, alabanzas y cultos grabados.
                  </p>
                  <span className="text-xs text-tierra font-bold block mt-1.5">
                    @iglesiabuenasnuevasparatodos
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 shrink-0">
                <a
                  href={YOUTUBE_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 transform hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Visitar Canal
                </a>
                <a
                  href={YOUTUBE_SUBSCRIBE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-full transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-0.5"
                >
                  🔔 Suscribirse
                </a>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* TARJETA CANAL DE YOUTUBE: PLAYLIST / ÚLTIMAS PRÉDICAS */}
            <div className="glass-card rounded-2xl overflow-hidden group flex flex-col justify-between border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
              <div>
                <div className="relative aspect-video bg-black overflow-hidden border-b border-slate-100">
                  <iframe
                    src={YOUTUBE_PLAYLIST_EMBED_URL}
                    title="Últimas prédicas y mensajes - Canal Oficial"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-wider mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                    Prédicas Recientes en YouTube
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 leading-snug group-hover:text-tierra transition-colors">
                    Mensajes y Enseñanzas Grabadas
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Explorá la lista con las últimas predicaciones de nuestros cultos. Podés reproducir o navegar por los mensajes anteriores directamente desde el reproductor.
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                <span className="text-red-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  Videos del Canal
                </span>
                <a
                  href={YOUTUBE_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tierra hover:text-tierra-dark transition-colors flex items-center gap-1 font-bold"
                >
                  Ver Todo en YouTube ↗
                </a>
              </div>
            </div>

            {/* MINIATURA DESTACADA DE TRANSMISIÓN EN VIVO */}
            {data.liveStream && (
              <div 
                className={`rounded-2xl overflow-hidden group flex flex-col justify-between border transition-all duration-200 bg-white ${
                  data.liveStream.active
                    ? "border-red-500 shadow-md"
                    : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 cursor-pointer"
                }`}
              >
                <div>
                  {data.liveStream.active && data.liveStream.streamUrl ? (
                    /* REPRODUCTOR DE VIDEO EN VIVO DIRECTO EN LA VENTANITA */
                    <div className="relative w-full aspect-video bg-black overflow-hidden border-b border-slate-100">
                      {/* Badge EN VIVO (Ultra liviano y limpio, sin latidos continuos) */}
                      <div className="absolute top-3 left-3 z-20 pointer-events-none">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow bg-red-600 text-white">
                          <span className="w-2 h-2 rounded-full bg-white" />
                          En Vivo Ahora
                        </span>
                      </div>

                      {/* Botón para ampliar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLiveModalOpen(true);
                        }}
                        className="absolute top-3 right-3 z-20 bg-black/75 hover:bg-black/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/20 transition-colors flex items-center gap-1 shadow cursor-pointer"
                        title="Ver en pantalla grande"
                      >
                        ⛶ Ampliar
                      </button>

                      <StreamPlayer
                        url={data.liveStream.streamUrl}
                        title={data.liveStream.title || "Streaming en Vivo - Buenas Nuevas"}
                        className="!border-0 !rounded-none !shadow-none w-full h-full"
                      />
                    </div>
                  ) : (
                    /* MINIATURA CUANDO NO ESTÁ EN VIVO */
                    <div 
                      onClick={() => setIsLiveModalOpen(true)}
                      className="relative h-48 bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100 cursor-pointer"
                    >
                      {getYouTubeThumbnail(data.liveStream.streamUrl) ? (
                        <img 
                          src={getYouTubeThumbnail(data.liveStream.streamUrl)!} 
                          alt="Transmisión en vivo" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                          <img 
                            src="/logo-hero.jpg" 
                            alt="Transmisión en vivo" 
                            className="w-24 h-24 object-cover rounded-full border-2 border-white opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 shadow-lg"
                          />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/10 transition-colors duration-300" />
                      
                      {/* Badge EN VIVO */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm bg-white/90 text-slate-700 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Streaming en Vivo
                        </span>
                      </div>

                      {/* Play button */}
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg pl-1 transition-transform duration-300 z-10 shadow-lg bg-tierra text-white group-hover:scale-110 shadow-[0_4px_15px_rgba(4,107,210,0.4)]">
                        ▶
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-base font-bold text-slate-900 leading-snug group-hover:text-tierra transition-colors">
                        {data.liveStream.title || "Streaming en Vivo · Buenas Nuevas"}
                      </h3>
                      {data.liveStream.active && (
                        <button
                          type="button"
                          onClick={() => setIsLiveModalOpen(true)}
                          className="text-xs text-tierra hover:text-tierra-dark font-bold flex items-center gap-1 shrink-0 pt-0.5 transition-colors"
                          title="Ver en pantalla grande"
                        >
                          ⛶ Ver en grande
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {data.liveStream.description || "Hacé clic para ver la transmisión en directo o grabada."}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  <span className={data.liveStream.active ? "text-red-600 font-extrabold" : "text-tierra"}>
                    {data.liveStream.active ? "🔴 Transmitiendo" : "📅 Programado"}
                  </span>
                  <span>{data.liveStream.scheduledTime || "Domingos 19:30 hs"}</span>
                </div>
              </div>
            )}

            {/* Sermones grabados */}
            {data.sermons.map((sermon: Sermon) => (
              <div key={sermon.id} className="glass-card rounded-2xl overflow-hidden group flex flex-col justify-between border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
                <div>
                  {/* Thumbnail con imagen de YouTube */}
                  <div 
                    onClick={() => setSelectedVideo(sermon.videoUrl)}
                    className="relative h-48 bg-slate-100 flex items-center justify-center cursor-pointer overflow-hidden border-b border-slate-100"
                  >
                    {getYouTubeThumbnail(sermon.videoUrl) ? (
                      <img 
                        src={getYouTubeThumbnail(sermon.videoUrl)!} 
                        alt={sermon.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/10 transition-colors duration-300" />
                    
                    {/* Play button indicator */}
                    <div className="w-14 h-14 rounded-full bg-tierra text-white flex items-center justify-center text-lg pl-1 shadow-[0_4px_15px_rgba(4,107,210,0.4)] group-hover:scale-110 transition-transform duration-300 z-10">
                      ▶
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="font-display text-base font-bold text-slate-900 leading-snug line-clamp-2">
                      {sermon.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">
                      Predicador: {sermon.preacher}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  <span>⏱️ {sermon.duration}</span>
                  <span>📅 {formatDate(sermon.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ESTUDIOS & PODCASTS (TABS INTERACTIVAS) */}
      <section className="relative z-10 py-20 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col items-center mb-12">
            {/* Tab switch buttons */}
            <div className="inline-flex p-1 rounded-full bg-slate-100 border border-slate-200">
              <button
                onClick={() => setActiveTab("podcasts")}
                className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === "podcasts" 
                    ? "bg-tierra text-white shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🎙️ Podcasts (Audios)
              </button>
              <button
                onClick={() => setActiveTab("studies")}
                className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === "studies" 
                    ? "bg-tierra text-white shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📖 Estudios Bíblicos
              </button>
            </div>
          </div>

          {/* Podcasts view */}
          {activeTab === "podcasts" && (
            <div>
              {data.podcasts.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center text-sm text-slate-500">
                  No hay podcasts de audio disponibles en este momento.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {data.podcasts.map((pod: Podcast) => (
                    <div key={pod.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-slate-200 shadow-sm hover:shadow-md bg-white">
                      <div>
                        <div className="flex justify-between items-center gap-4 text-[10px] text-tierra font-bold uppercase tracking-wider mb-3">
                          <span>🎙️ Audio Mensaje</span>
                          <span>{pod.duration}</span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-slate-900 leading-snug">
                          {pod.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-2">
                          Por: {pod.speaker}
                        </p>
                      </div>

                      {/* Custom Audio player wrapper */}
                      <div className="mt-5 pt-5 border-t border-slate-100">
                        <audio 
                          src={pod.audioUrl} 
                          controls 
                          className="w-full h-8 opacity-90 focus:opacity-100 hover:opacity-100 transition-opacity" 
                        />
                        <span className="text-[10px] text-slate-400 mt-2 block text-right font-bold uppercase tracking-wider">
                          Fecha: {formatDate(pod.date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Studies view */}
          {activeTab === "studies" && (
            <div>
              {data.studies.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center text-sm text-slate-500">
                  Aún no se han publicado guías de estudio.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {data.studies.map((study: Study) => (
                    <div key={study.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-slate-200 shadow-sm hover:shadow-md bg-white">
                      <div>
                        <span className="text-[10px] text-tierra font-bold uppercase tracking-wider block mb-2">
                          Guía de Célula / Estudio
                        </span>
                        <h3 className="font-display text-lg font-bold text-slate-900 leading-snug mb-3">
                          {study.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {study.content}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
                        <button
                          onClick={() => setSelectedStudy(study)}
                          className="text-xs font-bold text-tierra hover:text-tierra-dark transition-colors uppercase tracking-wider"
                        >
                          📖 Leer completo →
                        </button>
                        {study.pdfUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerPdfDownload(study.pdfUrl!, study.title);
                            }}
                            className="text-xs font-bold bg-[#FC752E] hover:bg-[#E05B18] text-white px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            📥 Descargar PDF
                          </button>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold ml-auto">
                          Autor: {study.author}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* GALERÍA DE IMÁGENES */}
      <section id="galeria" className="relative z-10 py-20 border-b border-slate-200 bg-slate-50/70">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-tierra tracking-[0.2em] uppercase block mb-2">
              Momentos
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight">
              Nuestra Comunidad
            </h2>
            <div className="h-1 w-16 bg-tierra rounded-full mx-auto mt-4 mb-6" />
            <p className="text-slate-600 text-sm leading-relaxed">
              Registros visuales de nuestras reuniones, bautismos, salidas y actividades en Oberá. La fe compartida en familia.
            </p>
          </div>

          {data.gallery.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center text-sm text-slate-500">
              La galería de fotos está vacía.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.gallery.map((photo: string, idx: number) => (
                <button 
                  type="button"
                  key={idx} 
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className="relative aspect-square w-full rounded-2xl overflow-hidden border border-slate-200 bg-white group cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-tierra transition-all p-0 block shadow-sm hover:shadow-md"
                >
                  <img
                    src={photo}
                    alt={`Galería de iglesia ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/35 transition-colors duration-300 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 text-[10px] text-white/0 group-hover:text-white font-bold uppercase tracking-wider transition-all duration-300 pointer-events-none flex items-center gap-1.5">
                    🔍 Ampliar Foto
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CONTACTO & UBICACION */}
      <section id="ubicacion" className="relative z-10 py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Mapa e información */}
            <div>
              <span className="text-[11px] font-bold text-tierra tracking-[0.2em] uppercase block mb-2">
                Visitanos
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
                Te esperamos en Mensú 1177
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-8">
                Nuestras puertas están siempre abiertas. Si es tu primera vez, no dudes en escribirnos por WhatsApp o acercarte los domingos. Cualquiera de nuestros hermanos estará feliz de guiarte.
              </p>

              <div className="flex flex-col gap-4 text-sm mb-8">
                <div className="flex items-center gap-3 text-slate-700">
                  <span className="text-tierra flex items-center justify-center w-5 h-5">
                    <img src="/social-maps.png" alt="Map" className="w-5 h-5 object-contain" />
                  </span>
                  <span>Calle Mensú 1177, Oberá, Misiones, Argentina</span>
                </div>
                <a 
                  href="https://wa.me/5493755629896"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-slate-700 hover:text-tierra transition-colors font-medium"
                >
                  <span className="text-tierra flex items-center justify-center w-5 h-5">
                    <img src="/social-wa.png" alt="WhatsApp" className="w-5 h-5 object-contain" />
                  </span>
                  <span>WhatsApp: +54 9 3755 629896</span>
                </a>
                <div className="flex items-center gap-3 text-slate-700">
                  <span className="text-tierra">✉️</span>
                  <span>contacto@buenasnuevas.com</span>
                </div>
              </div>

              {/* Iframe map */}
              <div className="rounded-3xl overflow-hidden border border-slate-200 aspect-video w-full relative shadow-sm">
                <iframe
                  title="Mapa Iglesia Buenas Nuevas Oberá"
                  className="w-full h-full border-0"
                  loading="lazy"
                  src="https://www.google.com/maps?q=Mens%C3%BA+1177,+Ober%C3%A1,+Misiones&output=embed"
                />
              </div>
            </div>

            {/* Formulario */}
            <div className="glass-card rounded-3xl p-8 md:p-10 relative overflow-hidden bg-white border border-slate-200 shadow-xl">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-tierra" />
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-6">
                Envianos un mensaje
              </h3>
              
              <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Escribí tu nombre..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Escribí tu número..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Mensaje o Petición de Oración
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Escribí aquí tu mensaje, duda o necesidad de oración..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-tierra focus:ring-2 focus:ring-tierra/20 focus:outline-none transition-all resize-none"
                  />
                </div>
                
                {contactSuccess && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center font-bold">
                    👍 {contactSuccess}
                  </div>
                )}

                {contactError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-center font-bold">
                    ⚠️ {contactError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="bg-tierra hover:bg-tierra-dark disabled:bg-tierra/50 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-full transition-all duration-300 mt-2 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {contactSubmitting ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    "Enviar Mensaje"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO MODAL */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl bg-monte-dark rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-black/95 text-white w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg hover:scale-105 transition-transform"
            >
              ✕
            </button>
            <div className="aspect-video w-full">
              <iframe
                src={getYouTubeEmbedUrl(selectedVideo)}
                title="Reproductor de Sermón"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* STUDY MODAL */}
      {selectedStudy && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl my-8 text-slate-800">
            <button
              onClick={() => setSelectedStudy(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
            >
              ✕
            </button>
            <span className="text-[11px] text-tierra font-bold uppercase tracking-wider block mb-2">
              Estudio Bíblico Completo
            </span>
            <h3 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight">
              {selectedStudy.title}
            </h3>
            <span className="text-xs text-slate-500 block mb-6">
              Escrito por: {selectedStudy.author} · Fecha: {formatDate(selectedStudy.date)}
            </span>
            
            <div className="h-px bg-slate-100 mb-6" />
            
            {selectedStudy.pdfUrl && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => triggerPdfDownload(selectedStudy.pdfUrl!, selectedStudy.title)}
                  className="inline-flex items-center gap-2 bg-[#FC752E] hover:bg-[#E05B18] text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  📥 Descargar Documento PDF
                </button>
              </div>
            )}
            
            <p className="text-sm md:text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
              {selectedStudy.content}
            </p>
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {selectedPhotoIndex !== null && data.gallery && data.gallery[selectedPhotoIndex] && (
        <div 
          onClick={() => setSelectedPhotoIndex(null)}
          className="fixed inset-0 flex items-center justify-center bg-slate-950/90 p-4 md:p-8 backdrop-blur-md animate-fade-in"
          style={{ zIndex: 99999 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedPhotoIndex(null)}
              className="absolute -top-12 right-0 bg-white/20 hover:bg-white/40 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors z-50 cursor-pointer shadow-lg"
              title="Cerrar (Esc)"
            >
              ✕
            </button>

            {/* Main Image */}
            <div className="relative overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-black">
              <img
                src={data.gallery[selectedPhotoIndex]}
                alt={`Foto ampliada ${selectedPhotoIndex + 1}`}
                className="max-h-[75vh] max-w-[90vw] md:max-w-4xl object-contain block rounded-2xl select-none"
              />
            </div>

            {/* Navigation & Counter Bar */}
            <div className="mt-4 flex items-center gap-6 text-white text-xs font-bold uppercase tracking-wider">
              {data.gallery.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : data.gallery.length - 1))}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
                >
                  ← Anterior
                </button>
              )}

              <span className="text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-[11px]">
                {selectedPhotoIndex + 1} / {data.gallery.length}
              </span>

              {data.gallery.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedPhotoIndex((prev) => (prev !== null && prev < data.gallery.length - 1 ? prev + 1 : 0))}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
                >
                  Siguiente →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIVE STREAM MODAL (POPUP ON CLICK "VER EN VIVO") */}
      {isLiveModalOpen && data.liveStream && (
        <div 
          onClick={() => setIsLiveModalOpen(false)}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/90 p-3 sm:p-6 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${
              data.liveStream.active ? "max-w-4xl border-slate-700 shadow-xl" : "max-w-xl border-slate-200 shadow-xl"
            } bg-white rounded-3xl overflow-hidden border max-h-[92vh] flex flex-col my-auto text-slate-800`}
          >
            {/* Header Modal - SIEMPRE VISIBLE Y FIJO AL PRINCIPIO */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 sticky top-0 z-30">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${data.liveStream.active ? "bg-red-600" : "bg-slate-400"}`} />
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.2em] block ${
                    data.liveStream.active ? "text-red-600" : "text-slate-500"
                  }`}>
                    {data.liveStream.active ? "● En Vivo Ahora" : "Transmisión Fuera de Línea"}
                  </span>
                  <h3 className="font-display text-base md:text-lg font-bold text-slate-900 leading-tight">
                    {data.liveStream.active ? (data.liveStream.title || "Streaming en Vivo · Buenas Nuevas") : "Información de Transmisión"}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLiveModalOpen(false)}
                className="bg-slate-200/80 hover:bg-slate-300 text-slate-700 w-9 h-9 rounded-full flex items-center justify-center font-bold text-base transition-colors shrink-0 cursor-pointer"
                title="Cerrar (Esc)"
              >
                ✕
              </button>
            </div>

            {/* CONTENIDO DESPLAZABLE CON SCROLL */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {!data.liveStream.active ? (
                /* ESTADO INACTIVO: INFORMAR DÍA Y HORARIO DE LA PRÓXIMA TRANSMISIÓN */
                <div className="p-5 sm:p-8 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl mb-3 shadow-inner">
                    📅
                  </div>

                  <span className="text-[11px] font-bold text-tierra uppercase tracking-[0.2em] mb-1.5 block">
                    Próxima Transmisión en Vivo
                  </span>

                  <h3 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 mb-2.5">
                    {data.liveStream.scheduledTime || "Domingos a las 19:30 hs"}
                  </h3>

                  <p className="text-xs md:text-sm text-slate-600 max-w-md mx-auto mb-5 leading-relaxed">
                    Actualmente no estamos transmitiendo en directo. Te invitamos a conectarte a nuestra próxima transmisión.
                  </p>

                  {/* Tarjeta de Horarios */}
                  <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 w-full text-left mb-6">
                    <span className="text-[10px] font-bold text-tierra uppercase tracking-wider block mb-3">
                      Horarios de Reuniones y Transmisiones:
                    </span>
                    <div className="flex flex-col gap-2.5 text-xs text-slate-700">
                      {currentSchedules.map((sch, i) => (
                        <div key={sch.id || i} className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 ${i < currentSchedules.length - 1 ? "border-b border-slate-200/80 pb-2" : ""}`}>
                          <span className="font-semibold text-slate-900">{sch.titulo}:</span>
                          <span className="text-tierra font-bold">{sch.dia} {sch.hora}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 w-full pb-2">
                    <a
                      href="#mensajes"
                      onClick={() => setIsLiveModalOpen(false)}
                      className="bg-tierra hover:bg-tierra-dark text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full transition-all shadow-md hover:shadow-lg"
                    >
                      Ver Predicaciones Anteriores
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsLiveModalOpen(false)}
                      className="border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full transition-all cursor-pointer"
                    >
                      Entendido / Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                /* ESTADO ACTIVO: REPRODUCTOR EN VIVO */
                <>
                  {/* Video Player */}
                  {data.liveStream.streamUrl ? (
                    <div className="w-full">
                      <StreamPlayer
                        url={data.liveStream.streamUrl}
                        title={data.liveStream.title || "Streaming en Vivo - Buenas Nuevas"}
                      />
                    </div>
                  ) : (
                    <div className="p-12 text-center text-sm text-texto-muted">
                      No hay enlace de transmisión configurado en este momento.
                    </div>
                  )}

                  {/* Footer description */}
                  {data.liveStream.description && (
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                        {data.liveStream.description}
                      </p>

                      {data.liveStream.streamUrl && (
                        <a
                          href={data.liveStream.streamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-md"
                        >
                          {data.liveStream.streamUrl.includes("youtube") || data.liveStream.streamUrl.includes("youtu.be")
                            ? "Abrir en YouTube"
                            : data.liveStream.streamUrl.includes("facebook") || data.liveStream.streamUrl.includes("fb.watch")
                              ? "Abrir en Facebook"
                              : data.liveStream.streamUrl.includes("m3u8")
                                ? "Abrir Señal Directa"
                                : data.liveStream.streamUrl.includes("selvaplay")
                                  ? "Abrir en SelvaPlay"
                                  : "Abrir Transmisión Externa"}
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
