import * as THREE from "three";

// Textures drawn once on a canvas: no font or image is fetched over the network.
const FONT = "600 {size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A single embossed-looking letter for a magnet face. */
export function letterTexture(letter: string, ink: string) {
  return canvasTexture(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.font = FONT.replace("{size}", "92");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillText(letter, 66, 70);
    ctx.fillStyle = ink;
    ctx.fillText(letter, 64, 66);
  });
}

/** Zero-centre galvanometer dial: ticks from −5 to +5, the 0 mark and the instrument symbol. */
export function dialTexture() {
  return canvasTexture(512, 320, (ctx) => {
    ctx.fillStyle = "#f6f2e6";
    ctx.fillRect(0, 0, 512, 320);
    const cx = 256, cy = 292, radius = 220;
    ctx.strokeStyle = "#2a2a28";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
    for (let i = -10; i <= 10; i++) {
      const angle = -Math.PI / 2 + (i / 10) * (Math.PI / 4);
      const major = i % 2 === 0;
      const inner = radius - (major ? 26 : 14);
      ctx.lineWidth = major ? 3 : 1.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();
      if (major) {
        ctx.font = FONT.replace("{size}", "22");
        ctx.fillStyle = "#2a2a28";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = Math.abs(i / 2).toString();
        ctx.fillText(label, cx + Math.cos(angle) * (inner - 22), cy + Math.sin(angle) * (inner - 22));
      }
    }
    ctx.font = FONT.replace("{size}", "44");
    ctx.fillStyle = "#2a2a28";
    ctx.textAlign = "center";
    ctx.fillText("G", cx, cy - 92);
    ctx.font = FONT.replace("{size}", "30");
    ctx.fillText("−", cx - 150, cy - 40);
    ctx.fillText("+", cx + 150, cy - 40);
  });
}

/** Board label for the LED pair. */
export function boardLabelTexture() {
  return canvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = "#1d5a3c";
    ctx.fillRect(0, 0, 256, 128);
    ctx.font = FONT.replace("{size}", "40");
    ctx.fillStyle = "#e9efe6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("A", 72, 92);
    ctx.fillText("B", 184, 92);
  });
}

/** Soft radial glow used by LED halos (additive sprites). */
export function glowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(.25, "rgba(255,255,255,.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  });
}
