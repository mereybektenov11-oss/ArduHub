// Replacement for next/image inside the desktop app.
import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src: string };
  priority?: boolean;
  fill?: boolean;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
};

export default function Image({
  src,
  priority: _p,
  fill: _f,
  quality: _q,
  placeholder: _ph,
  blurDataURL: _blur,
  alt = "",
  ...rest
}: Props) {
  return (
    <img src={typeof src === "string" ? src : src.src} alt={alt} {...rest} />
  );
}
