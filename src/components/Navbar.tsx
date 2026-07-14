"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#horarios", label: "Horarios" },
  { href: "/#eventos", label: "Eventos" },
  { href: "/#mensajes", label: "Mensajes" },
  { href: "/#galeria", label: "Galería" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <nav className="mx-auto max-w-6xl px-6 py-3.5 flex items-center justify-between">
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-14 h-14 rounded-full overflow-hidden border border-dorado/30 group-hover:border-dorado transition-colors shadow-md">
            <img 
              src="/logo.jpg" 
              alt="Logo Buenas Nuevas" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-base md:text-lg font-bold text-texto leading-none tracking-tight">
              Buenas Nuevas
            </span>
            <span className="text-[10px] text-tierra font-semibold tracking-[0.1em] uppercase mt-0.5 leading-none">
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
              className="text-xs font-semibold text-texto/80 hover:text-dorado tracking-wide uppercase transition-colors"
            >
              {l.label}
            </Link>
          ))}
          
          <div className="h-4 w-px bg-white/10" />

          {/* PANEL ACCESS */}
          <Link
            href="/admin"
            className="text-xs font-semibold border border-texto/30 hover:border-dorado text-texto hover:text-dorado px-4 py-2 rounded transition-colors tracking-wide uppercase flex items-center gap-1.5"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="w-3.5 h-3.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Acceso
          </Link>
        </div>

        {/* MOBILE TOGGLE */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex flex-col gap-1.5 p-2 rounded hover:bg-white/5 transition-colors"
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          <span className="w-6 h-0.5 bg-texto" />
          <span className="w-6 h-0.5 bg-texto" />
          <span className="w-6 h-0.5 bg-texto" />
        </button>
      </nav>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden px-6 pb-6 flex flex-col gap-4 border-t border-white/5 pt-4 bg-monte-dark/95 backdrop-blur-lg">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-texto/80 hover:text-dorado tracking-wide uppercase"
            >
              {l.label}
            </Link>
          ))}
          <div className="h-px bg-white/5 my-2" />
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="text-sm font-semibold text-dorado border border-dorado/30 hover:border-dorado px-4 py-2.5 rounded text-center transition-colors uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Acceso Panel
          </Link>
        </div>
      )}
    </header>
  );
}
