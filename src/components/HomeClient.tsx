"use client";

import { useState, useEffect } from "react";
import { DbData, EventItem, Sermon, Podcast, Study } from "@/lib/db";
import { getDbDataClient, submitMessageClient } from "@/lib/firestoreClient";

interface HomeClientProps {
  initialData: DbData;
}

export default function HomeClient({ initialData }: HomeClientProps) {
  const [data, setData] = useState<DbData>(initialData);
  const [activeTab, setActiveTab] = useState<"podcasts" | "studies">("podcasts");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Load fresh Firestore data on client mount
  useEffect(() => {
    getDbDataClient().then((freshData) => {
      if (freshData) setData(freshData);
    }).catch(console.error);
  }, []);

  // Keyboard navigation for image lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === "Escape") setSelectedPhotoIndex(null);
      if (e.key === "ArrowRight") {
        setSelectedPhotoIndex((prev) => (prev !== null && prev < data.gallery.length - 1 ? prev + 1 : 0));
      }
      if (e.key === "ArrowLeft") {
        setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : data.gallery.length - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhotoIndex, data.gallery.length]);

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

  // Helper to extract YouTube ID for embedding
  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  return (
    <div className="relative overflow-hidden bg-crema min-h-screen">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-violet/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] rounded-full bg-tierra/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-brand-violet/5 blur-[140px] pointer-events-none" />

      <section id="inicio" className="relative pt-16 pb-16 md:pt-24 md:pb-24 flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-35"
          >
            <source src="/bg-video.mp4" type="video/mp4" />
          </video>
          {/* Overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-crema/30 via-crema/60 to-crema" />
        </div>


        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          {/* Logo container */}
          <div className="relative w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-dorado/40 shadow-[0_0_60px_rgba(200,168,75,0.25)] mb-8 animate-pulse">
            <img 
              src="/logo-hero.jpg" 
              alt="Logo Iglesia Buenas Nuevas" 
              className="w-full h-full object-cover"
            />
          </div>

          <span className="text-[11px] font-bold tracking-[0.25em] text-dorado uppercase mb-4 border border-dorado/30 px-3.5 py-1.5 rounded-sm bg-monte/40 backdrop-blur-sm">
            Oberá · Misiones · Argentina
          </span>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-3xl">
            Donde la <span className="text-tierra brightness-110 italic font-medium">fe</span> se hace comunidad
          </h1>

          <p className="mt-6 text-base md:text-lg text-texto-muted max-w-xl leading-relaxed">
            Una familia de fe en el corazón de Oberá, con las puertas abiertas cada domingo para recibirte, adorar juntos y crecer en Su palabra.
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <a
              href="#horarios"
              className="bg-dorado hover:bg-dorado/90 text-crema px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(200,168,75,0.25)] hover:shadow-[0_4px_25px_rgba(200,168,75,0.4)] transform hover:translate-y-[-1px]"
            >
              Ver Horarios
            </a>
            <a
              href="#eventos"
              className="border border-white/20 hover:border-white/50 text-white px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 hover:bg-white/5"
            >
              Nuestras Actividades
            </a>
          </div>
        </div>
      </section>

      {/* VERSICULO DEL DIA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 mb-24">
        <div className="glass-card rounded-3xl p-8 md:p-10 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-tierra via-dorado to-tierra" />
          <span className="text-[10px] font-bold text-dorado tracking-[0.2em] uppercase mb-4 block">
            Versículo del Día
          </span>
          <p className="font-display text-lg md:text-2xl italic font-semibold text-white leading-relaxed max-w-2xl mx-auto">
            &ldquo;{data.verse.text}&rdquo;
          </p>
          <span className="mt-4 block text-xs font-bold text-tierra tracking-wide uppercase">
            — {data.verse.reference}
          </span>
        </div>
      </section>

      {/* FRANJA DE CONTACTO RAPIDO */}
      <div className="bg-dorado py-4.5 px-6 border-y border-dorado/20 shadow-lg text-monte-dark">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-3 text-xs md:text-sm font-bold uppercase tracking-wider text-center">
          <span className="flex items-center gap-2.5 justify-center">
            <img src="/social-maps.png" alt="Map" className="w-4.5 h-4.5 object-contain" /> Calle Mensú 1177, Oberá
          </span>
          <span className="text-monte-dark/40 hidden md:inline">|</span>
          <span className="flex items-center gap-2 justify-center">
            📞 Tel: 03755 42-2319
          </span>
          <span className="text-monte-dark/40 hidden md:inline">|</span>
          <span className="flex items-center gap-2.5 justify-center">
            <img src="/logo.jpg" alt="Iglesia" className="w-4.5 h-4.5 rounded-full object-cover border border-monte-dark/20" /> Culto Familiar: Domingos 09:30 hs
          </span>
        </div>
      </div>

      {/* HORARIOS & EVENTOS */}
      <section id="horarios" className="relative z-10 py-24 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-16 items-start">
            
            {/* Rutina de horarios */}
            <div className="lg:col-span-5">
              <span className="text-[10px] font-bold text-tierra tracking-[0.2em] uppercase block mb-3">
                Semanales
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white leading-tight mb-6">
                Horarios de Reunión
              </h2>
              <p className="text-texto-muted text-sm leading-relaxed mb-8">
                Nos reunimos durante la semana para aprender de la Biblia, orar juntos y compartir en comunidad. ¡Te invitamos a sumarte al grupo que prefieras!
              </p>
              
              <div className="flex flex-col gap-4">
                {[
                  { dia: "Miércoles", hora: "19:30 hs", titulo: "Estudio Bíblico", desc: "Profundizamos en las Escrituras y oramos juntos." },
                  { dia: "Viernes", hora: "20:00 hs", titulo: "Reunión de Jóvenes", desc: "Un espacio interactivo y dinámico para adolescentes y jóvenes." },
                  { dia: "Domingo", hora: "09:30 hs", titulo: "Culto Familiar", desc: "Reunión de alabanza, comunión y enseñanza para toda la familia." },
                  { dia: "Domingo", hora: "19:00 hs", titulo: "Culto Evangelístico", desc: "Reunión especial de predicación y adoración." }
                ].map((item, idx) => (
                  <div key={idx} className="glass-card rounded-2xl p-5 flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-dorado uppercase tracking-wider">
                        {item.dia} · {item.hora}
                      </span>
                      <h3 className="font-display text-lg font-bold text-white mt-1">
                        {item.titulo}
                      </h3>
                      <p className="text-xs text-texto-muted mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actividades y eventos dinámicos */}
            <div id="eventos" className="lg:col-span-7">
              <span className="text-[10px] font-bold text-tierra tracking-[0.2em] uppercase block mb-3">
                Agenda
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white leading-tight mb-6">
                Próximas Actividades
              </h2>
              <p className="text-texto-muted text-sm leading-relaxed mb-8">
                Mantenete informado sobre los próximos acontecimientos especiales, retiros, actividades de servicio y celebraciones de nuestra iglesia.
              </p>

              {data.events.length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center text-sm text-texto-muted">
                  No hay eventos programados en este momento.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.events.map((event: EventItem) => (
                    <div key={event.id} className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-56">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-tierra" />
                      <div>
                        <div className="flex justify-between items-center gap-2 mb-3">
                          <span className="text-[9px] font-bold bg-tierra/20 text-tierra border border-tierra/30 px-2 py-0.5 rounded">
                            {event.category}
                          </span>
                          <span className="text-[10px] font-semibold text-dorado">
                            {event.time}
                          </span>
                        </div>
                        <h3 className="font-display text-base font-bold text-white line-clamp-2 leading-tight">
                          {event.title}
                        </h3>
                        <p className="text-xs text-texto-muted mt-2.5 line-clamp-3 leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                      
                      <div className="text-[10px] font-bold text-white/50 border-t border-white/5 pt-3.5 uppercase tracking-wider">
                        📅 {new Date(event.date).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* MENSAJES & PREDICAS (VIDEOS) */}
      <section id="mensajes" className="relative z-10 py-24 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-bold text-tierra tracking-[0.2em] uppercase block mb-3">
              Recursos
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-white leading-tight">
              Predicas y Mensajes
            </h2>
            <div className="h-0.5 w-12 bg-dorado mx-auto mt-4 mb-6" />
            <p className="text-texto-muted text-sm leading-relaxed">
              Volvé a escuchar las predicaciones de nuestros domingos. Mensajes de fe, esperanza y enseñanzas prácticas basadas en la Palabra de Dios.
            </p>
          </div>

          {data.sermons.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center text-sm text-texto-muted">
              Aún no se han subido predicaciones en video.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.sermons.map((sermon: Sermon) => (
                <div key={sermon.id} className="glass-card rounded-2xl overflow-hidden group flex flex-col justify-between">
                  <div>
                    {/* Thumbnail placeholder */}
                    <div 
                      onClick={() => setSelectedVideo(sermon.videoUrl)}
                      className="relative h-48 bg-gradient-to-br from-monte-dark to-monte flex items-center justify-center cursor-pointer overflow-hidden border-b border-white/5"
                    >
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />
                      
                      {/* Play button indicator */}
                      <div className="w-14 h-14 rounded-full bg-dorado text-crema flex items-center justify-center text-lg pl-1 shadow-[0_0_30px_rgba(200,168,75,0.3)] group-hover:scale-110 transition-transform duration-300 z-10">
                        ▶
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="font-display text-base font-bold text-white leading-snug line-clamp-2">
                        {sermon.title}
                      </h3>
                      <p className="text-xs text-texto-muted mt-2">
                        Prepredicador: {sermon.preacher}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-texto-muted uppercase tracking-wider font-bold">
                    <span>⏱️ {sermon.duration}</span>
                    <span>📅 {new Date(sermon.date).toLocaleDateString("es-AR")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ESTUDIOS & PODCASTS (TABS INTERACTIVAS) */}
      <section className="relative z-10 py-24 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col items-center mb-12">
            {/* Tab switch buttons */}
            <div className="inline-flex p-1 rounded-full bg-monte-dark border border-white/5">
              <button
                onClick={() => setActiveTab("podcasts")}
                className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === "podcasts" 
                    ? "bg-dorado text-crema shadow-lg" 
                    : "text-texto-muted hover:text-white"
                }`}
              >
                🎙️ Podcasts (Audios)
              </button>
              <button
                onClick={() => setActiveTab("studies")}
                className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === "studies" 
                    ? "bg-dorado text-crema shadow-lg" 
                    : "text-texto-muted hover:text-white"
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
                <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center text-sm text-texto-muted">
                  No hay podcasts de audio disponibles en este momento.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {data.podcasts.map((pod: Podcast) => (
                    <div key={pod.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center gap-4 text-[10px] text-dorado font-bold uppercase tracking-wider mb-3">
                          <span>🎙️ Audio Mensaje</span>
                          <span>{pod.duration}</span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-white leading-snug">
                          {pod.title}
                        </h3>
                        <p className="text-xs text-texto-muted mt-2">
                          Por: {pod.speaker}
                        </p>
                      </div>

                      {/* Custom Audio player wrapper */}
                      <div className="mt-5 pt-5 border-t border-white/5">
                        <audio 
                          src={pod.audioUrl} 
                          controls 
                          className="w-full h-8 opacity-75 focus:opacity-100 hover:opacity-100 transition-opacity" 
                        />
                        <span className="text-[9px] text-texto-muted mt-2 block text-right font-bold uppercase tracking-widest">
                          Fecha: {new Date(pod.date).toLocaleDateString("es-AR")}
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
                <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center text-sm text-texto-muted">
                  Aún no se han publicado guías de estudio.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {data.studies.map((study: Study) => (
                    <div key={study.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-tierra font-bold uppercase tracking-wider block mb-2">
                          Guía de Célula / Estudio
                        </span>
                        <h3 className="font-display text-lg font-bold text-white leading-snug mb-3">
                          {study.title}
                        </h3>
                        <p className="text-xs text-texto-muted line-clamp-3 leading-relaxed">
                          {study.content}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-white/5 flex justify-between items-center">
                        <button
                          onClick={() => setSelectedStudy(study)}
                          className="text-xs font-bold text-dorado hover:text-dorado/80 transition-colors uppercase tracking-wider"
                        >
                          📖 Leer completo →
                        </button>
                        <span className="text-[10px] text-texto-muted font-semibold">
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
      <section id="galeria" className="relative z-10 py-24 border-b border-white/5 bg-monte-dark/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-bold text-tierra tracking-[0.2em] uppercase block mb-3">
              Momentos
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-white leading-tight">
              Nuestra Comunidad
            </h2>
            <div className="h-0.5 w-12 bg-dorado mx-auto mt-4 mb-6" />
            <p className="text-texto-muted text-sm leading-relaxed">
              Registros visuales de nuestras reuniones, bautismos, salidas y actividades en Oberá. La fe compartida en familia.
            </p>
          </div>

          {data.gallery.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center text-sm text-texto-muted">
              La galería de fotos está vacía.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.gallery.map((photo: string, idx: number) => (
                <button 
                  type="button"
                  key={idx} 
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/5 bg-monte group cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-dorado transition-all p-0 block"
                >
                  <img
                    src={photo}
                    alt={`Galería de iglesia ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/45 transition-colors duration-300 pointer-events-none" />
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
      <section id="ubicacion" className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Mapa e información */}
            <div>
              <span className="text-[10px] font-bold text-tierra tracking-[0.2em] uppercase block mb-3">
                Visitanos
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold text-white leading-tight mb-6">
                Te esperamos en Mensú 1177
              </h2>
              <p className="text-texto-muted text-sm leading-relaxed mb-8">
                Nuestras puertas están siempre abiertas. Si es tu primera vez, no dudes en escribirnos por WhatsApp o acercarte los domingos. Cualquiera de nuestros hermanos estará feliz de guiarte.
              </p>

              <div className="flex flex-col gap-4 text-sm mb-8">
                <div className="flex items-center gap-3">
                  <span className="text-dorado flex items-center justify-center w-5 h-5">
                    <img src="/social-maps.png" alt="Map" className="w-5 h-5 object-contain" />
                  </span>
                  <span>Calle Mensú 1177, Oberá, Misiones, Argentina</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-dorado flex items-center justify-center w-5 h-5">
                    <img src="/social-wa.png" alt="WhatsApp" className="w-5 h-5 object-contain" />
                  </span>
                  <span>WhatsApp: +54 3755 42-2319</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-dorado">✉️</span>
                  <span>contacto@buenasnuevas.com</span>
                </div>
              </div>

              {/* Iframe map */}
              <div className="rounded-3xl overflow-hidden border border-white/5 aspect-video w-full relative">
                <iframe
                  title="Mapa Iglesia Buenas Nuevas Oberá"
                  className="w-full h-full border-0 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                  loading="lazy"
                  src="https://www.google.com/maps?q=Mens%C3%BA+1177,+Ober%C3%A1,+Misiones&output=embed"
                />
              </div>
            </div>

            {/* Formulario */}
            <div className="glass-card rounded-3xl p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-dorado" />
              <h3 className="font-display text-2xl font-bold text-white mb-6">
                Envianos un mensaje
              </h3>
              
              <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Escribí tu nombre..."
                    className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-dorado focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Escribí tu número..."
                    className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-dorado focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block mb-1.5">
                    Mensaje o Petición de Oración
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Escribí aquí tu mensaje, duda o necesidad de oración..."
                    className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-dorado focus:outline-none transition-colors resize-none"
                  />
                </div>
                
                {contactSuccess && (
                  <div className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 text-center font-bold">
                    👍 {contactSuccess}
                  </div>
                )}

                {contactError && (
                  <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl p-3 text-center font-bold">
                    ⚠️ {contactError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="bg-dorado hover:bg-dorado/90 disabled:bg-dorado/50 text-crema font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition-all duration-300 mt-2 hover:shadow-[0_4px_20px_rgba(200,168,75,0.2)] flex items-center justify-center gap-2"
                >
                  {contactSubmitting ? (
                    <span className="w-4 h-4 rounded-full border-2 border-crema border-t-transparent animate-spin" />
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-monte rounded-3xl p-8 border border-white/10 shadow-2xl my-8">
            <button
              onClick={() => setSelectedStudy(null)}
              className="absolute top-4 right-4 bg-black/40 hover:bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>
            <span className="text-[10px] text-dorado font-bold uppercase tracking-wider block mb-2">
              Estudio Bíblico Completo
            </span>
            <h3 className="font-display text-2xl md:text-3xl font-extrabold text-white mb-2 leading-tight">
              {selectedStudy.title}
            </h3>
            <span className="text-xs text-texto-muted block mb-6">
              Escrito por: {selectedStudy.author} · Fecha: {new Date(selectedStudy.date).toLocaleDateString("es-AR")}
            </span>
            
            <div className="h-px bg-white/5 mb-6" />
            
            <p className="text-sm md:text-base text-texto/90 leading-relaxed whitespace-pre-wrap">
              {selectedStudy.content}
            </p>
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {selectedPhotoIndex !== null && data.gallery && data.gallery[selectedPhotoIndex] && (
        <div 
          onClick={() => setSelectedPhotoIndex(null)}
          className="fixed inset-0 flex items-center justify-center bg-black/95 p-4 md:p-8 backdrop-blur-md animate-fade-in"
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
                  className="bg-monte hover:bg-monte-light border border-white/20 text-dorado px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
                >
                  ← Anterior
                </button>
              )}

              <span className="text-texto-muted bg-monte/80 px-3 py-1.5 rounded-full border border-white/10 text-[11px]">
                {selectedPhotoIndex + 1} / {data.gallery.length}
              </span>

              {data.gallery.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedPhotoIndex((prev) => (prev !== null && prev < data.gallery.length - 1 ? prev + 1 : 0))}
                  className="bg-monte hover:bg-monte-light border border-white/20 text-dorado px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
                >
                  Siguiente →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
