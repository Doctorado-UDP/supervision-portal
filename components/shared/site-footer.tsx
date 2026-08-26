import Link from "next/link";

import { SITE_CONFIG } from "@/lib/config/site";
import { currentRelease } from "@/lib/releases";

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-5 text-center text-sm text-gray-500">
        <p>
          <Link
            href="/release-notes"
            className="font-semibold text-gray-700 underline-offset-4 hover:text-gray-950 hover:underline"
          >
            Supervision Portal - {currentRelease.version} &quot;
            {currentRelease.codename}&quot;
          </Link>
        </p>
        <p className="mt-1">
          <a
            href={SITE_CONFIG.personalWebsiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-700 hover:text-gray-950"
          >
            Dr. Bastián González-Bustamante
          </a>
          , developed by{" "}
          <a
            href={SITE_CONFIG.empiriaLabUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-700 hover:text-gray-950"
          >
            Empiria Lab
          </a>
        </p>
      </div>
    </footer>
  );
}
