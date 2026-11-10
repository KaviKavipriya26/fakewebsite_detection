export function validateUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Please enter a website URL." };
  if (raw.length > 2048) return { ok: false, error: "URL is too long (max 2048 characters)." };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
  if (!["http:", "https:"].includes(u.protocol)) return { ok: false, error: "Only http:// and https:// URLs can be scanned." };
  if (!u.hostname.includes(".") && u.hostname !== "localhost") return { ok: false, error: "Enter a full domain, e.g. example.com." };
  return { ok: true, url: raw.match(/^https?:\/\//i) ? raw : withScheme };
}
