import Image from "next/image";
import Link from "next/link";

import SiteFooter from "@/components/shared/site-footer";
import { releases } from "@/lib/releases";

function formatReleaseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export default function ReleaseNotesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white px-6 py-5">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/dashboard" className="flex items-center gap-4">
            <Image
              src="/branding/udp.png"
              alt="Universidad Diego Portales"
              width={164}
              height={40}
              priority
              className="h-auto w-auto max-w-[164px]"
            />
            <span className="border-l border-gray-200 pl-4 text-sm font-semibold text-gray-800">
              Supervision Portal
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-700 underline-offset-4 hover:text-gray-950 hover:underline"
          >
            Back to portal
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Release notes
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-gray-950">
              What changed between versions
            </h1>
            <p className="mt-4 text-base leading-7 text-gray-600">
              A plain-language history of the Supervision Portal. Each release
              focuses on changes that affect supervision work, account access or
              everyday use rather than implementation details.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            {releases.map((release) => (
              <article
                key={release.version}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-gray-950">
                        {release.version} &quot;{release.codename}&quot;
                      </h2>

                      {release.status && (
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {release.status}
                        </span>
                      )}

                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                        {formatReleaseDate(release.releaseDate)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium text-gray-700">
                      {release.comparison}
                    </p>
                  </div>
                </div>

                <p className="mt-5 max-w-4xl text-sm leading-6 text-gray-600">
                  {release.summary}
                </p>

                <div className="mt-7 grid gap-6 lg:grid-cols-2">
                  {release.sections.map((section) => (
                    <section
                      key={section.title}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-5"
                    >
                      <h3 className="text-lg font-semibold text-gray-900">
                        {section.title}
                      </h3>

                      <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                        {section.items.map((item) => (
                          <li key={item} className="flex gap-3">
                            <span
                              aria-hidden="true"
                              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-700"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
