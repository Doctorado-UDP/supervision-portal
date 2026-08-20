import { SITE_CONFIG } from "@/lib/config/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-5 text-center text-sm text-gray-500">
        Developed by{" "}
        <a
          href={SITE_CONFIG.empiriaLabUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 hover:text-gray-950"
        >
          Empiria Lab
        </a>
      </div>
    </footer>
  );
}