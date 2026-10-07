export function avatarUrl(image: string | null | undefined, userId: string) {
  if (!image) return undefined;
  if (image.startsWith("avatars/")) {
    return `/api/avatar/${encodeURIComponent(userId)}`;
  }
  if (/\.(?:public|private)\.blob\.vercel-storage\.com(?:\/|$)/i.test(image)) {
    return undefined;
  }
  return image;
}
