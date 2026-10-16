export function avatarValidationError(file: { type: string; size: number }): string | null {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    return "Choose a JPG, PNG, WebP or GIF image.";
  }
  if (!file.size || file.size > 5 * 1024 * 1024) return "Choose a photo smaller than 5 MB that isn’t empty.";
  return null;
}
