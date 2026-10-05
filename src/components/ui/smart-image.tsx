import Image, { type ImageProps } from "next/image";

export const PLACEHOLDER_IMAGE = "/images/branding/brownie-placeholder.svg";

type Props = Omit<ImageProps, "src" | "alt"> & { src?: string | null; alt: string };

/** next/image wrapper: falls back to the brand placeholder and skips the optimizer for SVGs. */
export function SmartImage({ src, alt, ...rest }: Props) {
  const resolved = src || PLACEHOLDER_IMAGE;
  return <Image src={resolved} alt={alt} unoptimized={resolved.endsWith(".svg")} {...rest} />;
}
