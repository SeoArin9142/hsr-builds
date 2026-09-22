import Image from "next/image";
import { assetUrl } from "@/lib/mihomo";

/** StarRailRes 경로(또는 절대 URL)를 받아 그리는 next/image 래퍼 */
function resolve(path: string): string {
  return /^https?:\/\//.test(path) ? path : assetUrl(path);
}

export default function GameImage({
  path,
  alt,
  width,
  height,
  className,
  fill,
  sizes,
  priority,
}: {
  path: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}) {
  if (fill) {
    return (
      <Image
        src={resolve(path)}
        alt={alt}
        fill
        sizes={sizes ?? "100vw"}
        className={className}
        priority={priority}
      />
    );
  }
  return (
    <Image
      src={resolve(path)}
      alt={alt}
      width={width ?? 64}
      height={height ?? 64}
      className={className}
      priority={priority}
    />
  );
}
