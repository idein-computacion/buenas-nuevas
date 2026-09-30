"use client";

import { useEffect, useRef, useState } from "react";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

interface StreamPlayerProps {
  url?: string;
  title?: string;
  className?: string;
}

declare global {
  interface Window {
    Hls?: any;
  }
}

export default function StreamPlayer({
  url = "https://iptv.ixfo.com.ar:30443/live/ClassicaTvObera/playlist.m3u8",
  title = "Transmisión en Vivo - Iglesia Buenas Nuevas",
  className = "",
}: StreamPlayerProps) {
  const currentUrl = (url || "https://iptv.ixfo.com.ar:30443/live/ClassicaTvObera/playlist.m3u8").trim();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isM3u8 = currentUrl.includes(".m3u8");
  const isYouTube = currentUrl.includes("youtube.com") || currentUrl.includes("youtu.be");

  useEffect(() => {
    if (!isM3u8) return;

    setHasError(false);
    setIsLoading(true);

    const video = videoRef.current;
    if (!video) return;

    let hls: any = null;
    let isCleanedUp = false;

    const setupPlayer = () => {
      if (isCleanedUp) return;

      const safePlay = () => {
        const p = video.play();
        if (p !== undefined) {
          p.catch((err: any) => {
            if (err?.name === "NotAllowedError") {
              video.muted = true;
              video.play().catch(() => {});
            }
          });
        }
      };

      // 1. Soporte nativo para Safari (iOS y macOS)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = currentUrl;
        video.addEventListener("loadedmetadata", () => {
          setIsLoading(false);
          safePlay();
        });
        video.addEventListener("error", () => {
          setIsLoading(false);
          setHasError(true);
        });
        return;
      }

      // 2. Soporte para Chrome, Edge, Firefox, Android mediante Hls.js
      const initHlsInstance = () => {
        if (!window.Hls || !window.Hls.isSupported() || isCleanedUp) {
          setIsLoading(false);
          setHasError(true);
          return;
        }

        try {
          hls = new window.Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 60,
          });

          hls.loadSource(currentUrl);
          hls.attachMedia(video);

          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            if (!isCleanedUp) {
              setIsLoading(false);
              safePlay();
            }
          });

          hls.on(window.Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) {
              switch (data.type) {
                case window.Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case window.Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  if (!isCleanedUp) {
                    setIsLoading(false);
                    setHasError(true);
                  }
                  break;
              }
            }
          });
        } catch {
          if (!isCleanedUp) {
            setIsLoading(false);
            setHasError(true);
          }
        }
      };

      if (window.Hls) {
        initHlsInstance();
      } else {
        // Cargar script de HLS.js local con fallback a CDN
        const script = document.createElement("script");
        script.src = "/hls.min.js";
        script.async = true;
        script.onload = () => {
          initHlsInstance();
        };
        script.onerror = () => {
          const cdnScript = document.createElement("script");
          cdnScript.src = "https://cdn.jsdelivr.net/npm/hls.js@1";
          cdnScript.async = true;
          cdnScript.onload = () => initHlsInstance();
          cdnScript.onerror = () => {
            if (!isCleanedUp) {
              setIsLoading(false);
              setHasError(true);
            }
          };
          document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
      }
    };

    setupPlayer();

    return () => {
      isCleanedUp = true;
      if (hls) {
        hls.destroy();
      }
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [currentUrl, isM3u8]);

  // Si es un video o directo de YouTube
  if (isYouTube) {
    const embedUrl = getYouTubeEmbedUrl(currentUrl);
    return (
      <div className={`relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 ${className}`}>
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          frameBorder="0"
        />
      </div>
    );
  }

  // Si es una transmisión HLS / M3U8 (IPTV)
  if (isM3u8) {
    return (
      <div className={`relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 flex items-center justify-center ${className}`}>
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          title={title}
          className="w-full h-full object-contain bg-black"
        />

        {/* Spinner de carga */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none gap-3">
            <div className="w-10 h-10 border-4 border-dorado/30 border-t-dorado rounded-full animate-spin" />
            <p className="text-xs text-white/80 font-medium">Conectando con la señal en vivo...</p>
          </div>
        )}

        {/* Mensaje de error / fuera de línea */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xl font-bold">
              ✕
            </div>
            <p className="text-sm font-semibold text-white">Transmisión fuera de línea</p>
            <p className="text-xs text-texto-muted max-w-md">
              La señal en vivo no está emitiendo en este momento o el servidor de streaming está en reposo.
            </p>
            <button
              type="button"
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                const v = videoRef.current;
                if (v) {
                  v.src = currentUrl;
                  v.load();
                }
              }}
              className="mt-2 bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2 rounded-lg transition-colors"
            >
              Reintentar conexión
            </button>
          </div>
        )}
      </div>
    );
  }

  // Cualquier otro reproductor embebido (SelvaPlay, Facebook, etc.)
  return (
    <div className={`w-full rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 flex justify-center ${className}`}>
      <iframe
        src={currentUrl}
        width="100%"
        height="360"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        title={title}
        className="w-full border-0 block"
        style={{ minHeight: "260px" }}
      />
    </div>
  );
}
