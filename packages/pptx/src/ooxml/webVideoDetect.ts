// src/ooxml/webVideoDetect.ts — YouTube/Vimeo URL detection for web video embedding

export interface WebVideoInfo {
  platform: "youtube" | "vimeo";
  videoId: string;
  embedUrl: string;
  watchUrl: string;
  posterUrl: string;  // YouTube: hqdefault.jpg; Vimeo: empty (resolved via oEmbed in media.ts)
}

export function parseWebVideoUrl(src: string): WebVideoInfo | null {
  // Try YouTube first
  const ytId = extractYouTubeId(src);
  if (ytId) {
    return {
      platform: "youtube",
      videoId: ytId,
      embedUrl: `https://www.youtube.com/embed/${ytId}`,
      watchUrl: `https://www.youtube.com/watch?v=${ytId}`,
      posterUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
    };
  }

  // Try Vimeo
  const vimeoId = extractVimeoId(src);
  if (vimeoId) {
    return {
      platform: "vimeo",
      videoId: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      watchUrl: `https://vimeo.com/${vimeoId}`,
      posterUrl: "",  // Resolved via oEmbed API in media.ts
    };
  }

  return null;
}

export function isWebVideoUrl(src: string): boolean {
  return parseWebVideoUrl(src) !== null;
}

function extractYouTubeId(src: string): string | null {
  // Handle all YouTube URL patterns:
  // youtube.com/watch?v={id}, youtu.be/{id}, youtube.com/embed/{id},
  // m.youtube.com/watch?v={id}, youtube-nocookie.com/embed/{id}
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && isValidYouTubeId(id) ? id : null;
    }
    const embedMatch = /^\/embed\/([a-zA-Z0-9_-]{11})/.exec(url.pathname);
    if (embedMatch) return embedMatch[1];
  }

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return id && isValidYouTubeId(id) ? id : null;
  }

  return null;
}

function extractVimeoId(src: string): string | null {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "vimeo.com") {
    const match = /^\/(\d{6,})/.exec(url.pathname);
    return match ? match[1] : null;
  }

  if (host === "player.vimeo.com") {
    const match = /^\/video\/(\d{6,})/.exec(url.pathname);
    return match ? match[1] : null;
  }

  return null;
}

function isValidYouTubeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}
