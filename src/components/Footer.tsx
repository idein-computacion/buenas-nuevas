import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t-4 border-tierra text-slate-300 pt-16 pb-8">
      <div className="mx-auto max-w-6xl px-6 grid gap-10 md:grid-cols-4 pb-12 border-b border-slate-800">
        {/* Columna Marca */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-700 bg-white">
              <img 
                src="/logo.jpg" 
                alt="Logo Buenas Nuevas" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-white tracking-tight leading-none">
                Buenas Nuevas
              </span>
              <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider leading-none mt-1">
                Para Todos
              </span>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
            Iglesia Evangélica Bautista en el corazón de Oberá. No somos una organización religiosa, somos el Pueblo de Dios con las puertas abiertas para recibirte.
          </p>
        </div>

        {/* Columna Ubicación */}
        <div>
          <p className="text-xs font-bold text-white uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-tierra"></span>
            Ubicación
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Calle Mensú 1177
            <br />
            Oberá, Misiones, Argentina
            <br />
            <a href="tel:+543755629896" className="text-slate-400 hover:text-sky-400 mt-1 block transition-colors">📞 Tel: 3755 629896</a>
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
          <p className="text-xs font-bold text-white uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-tierra"></span>
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
              href="https://wa.me/5493755629896"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110 p-0.5"
              title="WhatsApp"
            >
              <img src="/social-wa.png" alt="WhatsApp" className="w-full h-full object-contain" />
            </a>
            <a
              href="https://www.youtube.com/@iglesiabuenasnuevasparatodos"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110 p-0.5"
              title="YouTube (@iglesiabuenasnuevasparatodos)"
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

      <div className="mx-auto max-w-6xl px-6 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <div>
          © {new Date().getFullYear()} Iglesia Buenas Nuevas · Oberá, Misiones.
        </div>
        <div>
          Desarrollado por <a href="https://idein.com.ar" className="text-sky-400 hover:underline" target="_blank" rel="noopener noreferrer">Pedro Turcheñuk - IDeIn Computación - 3754406435</a>
        </div>
      </div>
    </footer>
  );
}
