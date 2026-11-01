import * as THREE from "three";

const cache = new Map<string, { texture: THREE.CanvasTexture; aspect: number }>();

/**
 * Pill-shaped text label drawn to a canvas (no font download). Used for ruler
 * numbers and short codes such as "Met" or "5'"; prose stays in the DOM.
 */
export function textTexture(text: string, { fill = "rgba(10, 24, 34, 0.82)", ink = "#f2f7fb", weight = 650 }: { fill?: string; ink?: string; weight?: number } = {}) {
  const key = `${text}|${fill}|${ink}|${weight}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  const font = `${weight} 56px system-ui, "Segoe UI", sans-serif`;
  context.font = font;
  const width = Math.ceil(context.measureText(text).width + 44);
  canvas.width = width;
  canvas.height = 84;
  context.font = font;
  context.fillStyle = fill;
  context.beginPath();
  context.roundRect(2, 2, width - 4, 80, 38);
  context.fill();
  context.fillStyle = ink;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, width / 2, 45);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const entry = { texture, aspect: width / 84 };
  cache.set(key, entry);
  return entry;
}

/** Sprite carrying a text label at a world height of `height` scene units. */
export function TextLabel({ text, height = 0.28, fill, ink, position, depthTest = true }: {
  text: string; height?: number; fill?: string; ink?: string; position?: readonly [number, number, number]; depthTest?: boolean;
}) {
  const { texture, aspect } = textTexture(text, { fill, ink });
  return <sprite position={position ? [...position] : undefined} scale={[height * aspect, height, 1]} renderOrder={6}>
    <spriteMaterial map={texture} transparent depthWrite={false} depthTest={depthTest} toneMapped={false} />
  </sprite>;
}
