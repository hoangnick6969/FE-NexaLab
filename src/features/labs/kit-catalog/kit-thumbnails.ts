import type { KitGroup } from "./kit-catalog";

const images = import.meta.glob<string>("../assets/thumbnails/kit/*/*.webp", {
  eager: true,
  import: "default",
  query: "?url&no-inline",
});

export function kitThumbnail(group: KitGroup, key: string): string | undefined {
  return images[`../assets/thumbnails/kit/${group}/${key}.webp`];
}
