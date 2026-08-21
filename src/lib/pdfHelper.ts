/**
 * Helper to force direct download of PDF files, transforming Google Drive links
 * and using Blob URLs for direct cross-origin files.
 */
export async function triggerPdfDownload(url: string, title?: string): Promise<void> {
  if (!url || typeof window === "undefined") return;

  const safeTitle = (title || "estudio-biblico")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const filename = `${safeTitle || "estudio"}.pdf`;

  // 1. Google Drive URLs (convert view link to export=download)
  if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
    const match = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      const directDriveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      window.open(directDriveUrl, "_blank");
      return;
    }
  }

  // 2. Dropbox URLs (convert dl=0 to dl=1 for force download)
  if (url.includes("dropbox.com")) {
    let directDropboxUrl = url.replace(/([?&])dl=0/, "$1dl=1");
    if (!directDropboxUrl.includes("dl=1")) {
      directDropboxUrl += (directDropboxUrl.includes("?") ? "&" : "?") + "dl=1";
    }
    window.open(directDropboxUrl, "_blank");
    return;
  }

  // 3. Fetch as blob to force browser native save dialog
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 200);
  } catch (error) {
    console.warn("Direct blob fetch failed (CORS or network), opening link:", error);
    // Fallback: create temporary download link
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 200);
  }
}
