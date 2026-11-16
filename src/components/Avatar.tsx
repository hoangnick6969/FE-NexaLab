import { useState } from "react";

/** Avatar image with an initial as fallback (also while the private image URL loads or if it fails). */
export function Avatar({ name, url, className = "avatar" }: { name: string; url?: string | null; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initial = name.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase() ?? "?";
  const showImage = Boolean(url && url !== failedUrl);
  return showImage ? (
    <img
      className={`${className} avatar-image`}
      src={url!}
      alt=""
      decoding="async"
      onError={() => setFailedUrl(url!)}
    />
  ) : (
    <span className={className} aria-hidden="true">{initial}</span>
  );
}
