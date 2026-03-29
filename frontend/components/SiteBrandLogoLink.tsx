"use client";

import Link from "next/link";
import { BRAND_LOGO_SRC } from "@/lib/brand-assets";

type Props = {
  linkClassName?: string;
  imgClassName?: string;
};

export default function SiteBrandLogoLink({
  linkClassName = "site-title site-brand-link",
  imgClassName = "site-brand-logo",
}: Props) {
  return (
    <Link href="/" className={linkClassName} aria-label="Recalls Atlas — home">
      <img
        src={BRAND_LOGO_SRC}
        alt=""
        width={200}
        height={40}
        className={imgClassName}
        decoding="async"
      />
    </Link>
  );
}
