export const PLACEHOLDER_IMAGE = "/placeholder.svg";

type ImageLike = string | { src: string };

/** First image's src, or the placeholder when a product has no photo yet. */
export function imageSrc(img: ImageLike | undefined): string {
  if (!img) return PLACEHOLDER_IMAGE;
  return typeof img === "string" ? img : img.src;
}
