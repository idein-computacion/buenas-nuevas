"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCachedDbData, getDbDataClient, subscribeToLiveStreamClient } from "@/lib/apiClient";

const LINKS = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#horarios", label: "Horarios" },
  { href: "/#eventos", label: "Eventos" },
  { href: "/#mensajes", label: "Mensajes" },
  { href: "/#galeria", label: "Galería" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    // 1. Initial check from fast cache
    const cached = getCachedDbData();
    if (cached?.liveStream) {
      setIsLive(Boolean(cached.liveStream.active));
    }

    // 2. Real-time subscription to Firestore
    const unsubscribe = subscribeToLiveStreamClient((data) => {
      if (data) {
        setIsLive(Boolean(data.active));
      }
    });

    // 3. Local tab listener for instant sync
    const handleLocalUpdate = (e: any) => {
      if (e?.detail) {
        setIsLive(Boolean(e.detail.active));
      }
    };
    window.addEventListener("livestream-updated", handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener("livestream-updated", handleLocalUpdate);
    };
  }, []);

  const handleLiveClick = () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-livestream"));
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <nav className="mx-auto max-w-6xl px-6 py-3.5 flex items-center justify-between">
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-slate-200 group-hover:border-tierra transition-colors shadow-sm bg-white">
            <img 
              src="/logo.jpg" 
              alt="Logo Buenas Nuevas" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-base md:text-lg font-bold text-slate-900 leading-none tracking-tight">
              Buenas Nuevas
            </span>
            <span className="text-[10px] text-tierra font-bold tracking-[0.12em] uppercase mt-1 leading-none">
              Para Todos
            </span>
          </div>
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs font-bold text-slate-700 hover:text-tierra tracking-wider uppercase transition-colors"
            >
              {l.label}
            </Link>
          ))}

          {/* BOTON VER EN VIVO */}
          <Link
            href="/#mensajes"
            onClick={handleLiveClick}
            className={`text-xs font-bold px-4 py-2 rounded-full transition-all flex items-center gap-2 uppercase tracking-wider ${
              isLive
                ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80"
            }`}
          >
            {isLive ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
            ) : (
              <span className="inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            )}
            Ver En Vivo
          </Link>
          
          <div className="h-4 w-px bg-slate-200"></div>
          
          <Link
            href="/admin"
            className="text-xs font-bold border-2 border-tierra text-tierra hover:bg-tierra hover:text-white px-4 py-1.5 rounded-full transition-all tracking-wider uppercase flex items-center gap-1.5 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Acceso
          </Link>
        </div>

        {/* MOBILE ACTIONS */}
        <div className="flex md:hidden items-center gap-3">
          {/* Boton compacto en vivo para moviles */}
          <Link
            href="/#mensajes"
            onClick={handleLiveClick}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 uppercase tracking-wider ${
              isLive
                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse"
                : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            {isLive ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            ) : (
              <span className="inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
            )}
            En Vivo
          </Link>

          {/* MOBILE TOGGLE */}
          <button
            onClick={() => setOpen(!open)}
            className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <span className="w-6 h-0.5 bg-slate-800" />
            <span className="w-6 h-0.5 bg-slate-800" />
            <span className="w-6 h-0.5 bg-slate-800" />
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden px-6 pb-6 flex flex-col gap-3.5 border-t border-slate-100 pt-4 bg-white/98 shadow-xl backdrop-blur-xl">
          {/* BOTON EN VIVO DESTACADO EN MOVIL */}
          <Link
            href="/#mensajes"
            onClick={handleLiveClick}
            className={`text-xs font-bold px-4 py-3 rounded-full transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-center ${
              isLive
                ? "bg-red-600 text-white shadow-md animate-pulse"
                : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            {isLive ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
            ) : (
              <span className="inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            )}
            Ver En Vivo
          </Link>

          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm font-bold text-slate-800 hover:text-tierra tracking-wide uppercase py-1 border-b border-slate-50"
            >
              {l.label}
            </Link>
          ))}
          
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="text-sm font-bold text-tierra tracking-wide uppercase flex items-center gap-2 mt-1 pt-3 border-t border-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Acceso Admin
          </Link>
        </div>
      )}
    </header>
  );
}
