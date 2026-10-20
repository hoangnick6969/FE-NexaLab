/** Avatar image with an initial as fallback (also while the private image URL loads). */
export function Avatar({ name, url, className = "avatar" }: { name: string; url?: string | null; className?: string }) {
  const initial = name.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase() ?? "?";
  return url ? <img className={`${className} avatar-image`} src={url} alt="" /> : <span className={className} aria-hidden="true">{initial}</span>;
}
