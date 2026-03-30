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
        alt="Recalls Atlas globe logo"
        width={44}
        height={44}
        className={imgClassName}
        decoding="async"
      />
      <span className="site-brand-wordmark" aria-hidden="true">
        <span className="site-brand-wordmark-emphasis">Recalls</span> Atlas
      </span>
    </Link>
  );
}
