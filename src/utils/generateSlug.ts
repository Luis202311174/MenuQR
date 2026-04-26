export function generateSlug(id: string, name: string): string {
  const shortId = id.slice(0, 5);

  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove symbols
    .replace(/\s+/g, "-") // spaces -> hyphen
    .replace(/-+/g, "-") // remove duplicate hyphens
    .replace(/^-|-$/g, "") // trim hyphen edges
    .slice(0, 40); // limit length

  return `${shortId}-${cleanName}`;
}