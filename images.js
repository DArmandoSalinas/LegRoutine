/* Sketch generation + image helpers for ARMATUS studio */
window.ArmatusImages = (() => {
  const STYLE =
    "Minimal athletic coaching sketch illustration on pure black background. Clean white and warm orange (#FF6B35) line-art only. Professional fitness education diagram style, high contrast, generous negative space, no text, no labels, no watermarks, no photorealism, no 3D render.";

  function buildPrompt(title, extra = "") {
    const focus = [title, extra].filter(Boolean).join(". ");
    return `${STYLE} Athlete performing: ${focus}. Clear side or three-quarter view showing correct exercise form.`;
  }

  function pollinationsUrl(prompt) {
    const q = encodeURIComponent(prompt);
    // seed keeps results more stable per exercise name
    const seed = Math.abs(
      [...prompt].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
    );
    return `https://image.pollinations.ai/prompt/${q}?width=1280&height=720&nologo=true&enhance=true&seed=${seed}&v=${Date.now()}`;
  }

  function loadImage(src, crossOrigin = true) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
      img.src = src;
    });
  }

  async function toJpegDataUrl(img, maxW = 1280, quality = 0.88) {
    const scale = Math.min(1, maxW / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  }

  async function fileToDataUrl(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url, false);
      return await toJpegDataUrl(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function generateSketch(title, extra = "") {
    const prompt = buildPrompt(title, extra);
    const remote = pollinationsUrl(prompt);
    // Try fetch as blob first (better CORS control), fallback to Image
    try {
      const res = await fetch(remote, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      try {
        const img = await loadImage(obj, false);
        return await toJpegDataUrl(img);
      } finally {
        URL.revokeObjectURL(obj);
      }
    } catch (_) {
      const img = await loadImage(remote, true);
      return await toJpegDataUrl(img);
    }
  }

  /** Convert same-origin path images to data URLs so PDF never loses them */
  async function ensureEmbeddable(src) {
    if (!src) return "";
    if (src.startsWith("data:")) return src;
    try {
      const img = await loadImage(src, src.startsWith("http") ? true : false);
      return await toJpegDataUrl(img);
    } catch (_) {
      return src;
    }
  }

  return { buildPrompt, generateSketch, fileToDataUrl, ensureEmbeddable, toJpegDataUrl, loadImage };
})();
