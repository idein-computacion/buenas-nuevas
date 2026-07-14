import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-monte-dark border-t border-dorado/15 text-texto/70 pt-16 pb-8">
      <div className="mx-auto max-w-6xl px-6 grid gap-10 md:grid-cols-4 pb-12 border-b border-white/5">
        {/* Columna Marca */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-dorado/20">
              <img 
                src="/logo.jpg" 
                alt="Logo Buenas Nuevas" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base font-bold text-texto tracking-tight leading-none">
                Buenas Nuevas
              </span>
              <span className="text-[9px] text-dorado font-bold uppercase tracking-wider leading-none mt-0.5">
                Para Todos
              </span>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-texto-muted max-w-sm">
            Iglesia Evangélica Bautista en el corazón de Oberá. No somos una organización religiosa, somos el Pueblo de Dios con las puertas abiertas para recibirte.
          </p>
        </div>

        {/* Columna Ubicación */}
        <div>
          <p className="text-xs font-bold text-dorado uppercase tracking-[0.15em] mb-4">
            Ubicación
          </p>
          <p className="text-sm text-texto/80 leading-relaxed">
            Calle Mensú 1177
            <br />
            Oberá, Misiones, Argentina
            <br />
            <span className="text-texto/60 mt-1 block">📞 Tel: 03755 42-2319</span>
          </p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Mens%C3%BA+1177+Ober%C3%A1+Misiones"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110 p-0.5 mt-3.5 inline-flex"
            title="Abrir en Google Maps"
          >
            <img src="/social-maps.png" alt="Google Maps" className="w-full h-full object-contain" />
          </a>
        </div>

        {/* Columna Contacto */}
        <div>
          <p className="text-xs font-bold text-dorado uppercase tracking-[0.15em] mb-4">
            Contacto & Redes
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://www.facebook.com/buenasnuevasobera/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110 p-0.5"
              title="Facebook"
            >
              <img src="/social-fb.png" alt="Facebook" className="w-full h-full object-contain" />
            </a>
            <a
              href="https://www.instagram.com/bnobera/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110 p-0.5"
              title="Instagram"
            >
              <img src="/social-ig.png" alt="Instagram" className="w-full h-full object-contain" />
            </a>
            <a
              href="https://wa.me/543755422319"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110 p-0.5"
              title="WhatsApp"
            >
              <img src="/social-wa.png" alt="WhatsApp" className="w-full h-full object-contain" />
            </a>
            <a
              href="https://www.youtube.com/channel/UCHJigZ0DrVc3pcxg1wQFLMw"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110 p-0.5"
              title="YouTube"
            >
              <img src="/social-yt.png" alt="YouTube" className="w-full h-full object-contain" />
            </a>
            <a
              href="mailto:info@buenasnuevas.com"
              className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110 p-0.5"
              title="Enviar Correo Electrónico"
            >
              <img src="/social-gmail.png" alt="Gmail" className="w-full h-full object-contain" />
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-texto-muted gap-4">
        <div>
          © {new Date().getFullYear()} Iglesia Buenas Nuevas · Oberá, Misiones.
        </div>
        <div>
          Desarrollado por <a href="https://idein.com.ar" className="text-dorado hover:underline" target="_blank" rel="noopener noreferrer">Pedro Turcheñuk - IDeIn Computación - 3754406435</a>
        </div>
      </div>
    </footer>
  );
}
