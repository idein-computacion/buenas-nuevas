/**
 * Utility functions for Stream URL handling, embed generation, and thumbnail extraction.
 */

export function cleanStreamUrl(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  // If an iframe snippet is pasted, extract the src URL
  const iframeMatch = trimmed.match(/<iframe.*?src=["'](.*?)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    return iframeMatch[1].trim();
  }
  return trimmed;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const clean = cleanStreamUrl(url);
  // Matches watch?v=ID, youtu.be/ID, live/ID, embed/ID, shorts/ID, v/ID
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/#]{11})/i;
  const match = clean.match(regExp);
  return match && match[1] ? match[1] : null;
}

export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@iglesiabuenasnuevasparatodos";
export const YOUTUBE_CHANNEL_ID = "UCxlqHEZLFoS40ZQt5duzZZw";
export const YOUTUBE_UPLOADS_PLAYLIST_ID = "UUxlqHEZLFoS40ZQt5duzZZw";
export const YOUTUBE_PLAYLIST_EMBED_URL = "https://www.youtube-nocookie.com/embed/videoseries?list=UUxlqHEZLFoS40ZQt5duzZZw";
export const YOUTUBE_SUBSCRIBE_URL = "https://www.youtube.com/@iglesiabuenasnuevasparatodos?sub_confirmation=1";

export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  try {
    const clean = cleanStreamUrl(url);

    // Check for YouTube playlist (e.g. list=...)
    const listMatch = clean.match(/[?&]list=([^#&?]+)/i);
    if (listMatch && listMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${listMatch[1]}&rel=0`;
    }

    // 1. Check for standard YouTube video or live URL
    const ytId = extractYouTubeId(clean);
    if (ytId) {
      return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
    }

    // 2. Check for YouTube channel live URL (e.g. /channel/UC.../live)
    const channelMatch = clean.match(/youtube\.com\/channel\/([^/?#]+)\/live/i);
    if (channelMatch && channelMatch[1]) {
      return `https://www.youtube.com/embed/live_stream?channel=${channelMatch[1]}&autoplay=1`;
    }

    // 3. Check for Facebook (Videos, Reels, Watch)
    if (clean.includes("facebook.com") || clean.includes("fb.watch")) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(clean)}&show_text=false&width=560&autoplay=true`;
    }

    // 4. Check for Twitch
    if (clean.includes("twitch.tv/")) {
      const twitchMatch = clean.match(/twitch\.tv\/([^/?#]+)/i);
      if (twitchMatch && twitchMatch[1]) {
        const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
        return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${hostname}&autoplay=true`;
      }
    }

    // 5. If already an embed URL (e.g. selvaplay embed or custom host)
    return clean;
  } catch {
    return url;
  }
}

export function getYouTubeThumbnail(url: string): string | null {
  if (!url) return null;
  try {
    const ytId = extractYouTubeId(url);
    if (ytId) {
      return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
  } catch {
    // ignore
  }
  return null;
}

