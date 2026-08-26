"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminHeaderProps = {
  fullName: string;
  globalSupervisor: boolean;
};

type NavigationItem = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminHeader({
  fullName,
  globalSupervisor,
}: AdminHeaderProps) {
  const pathname = usePathname();

  const navigation: NavigationItem[] = [
    { href: "/admin/students", label: "Students" },
    { href: "/admin/supervisions", label: "Supervisions" },
    { href: "/admin/timetable", label: "Timetable" },
    ...(globalSupervisor
      ? [{ href: "/admin/access", label: "Access" }]
      : []),
  ];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="inline-flex items-center">
              <Image
                src="/branding/udp.png"
                alt="Universidad Diego Portales"
                width={164}
                height={40}
                priority
                className="h-auto w-auto max-w-[164px]"
              />
            </Link>

            <div className="hidden h-10 w-px bg-gray-200 sm:block" />

            <Link
              href="/admin"
              className="hidden text-sm font-semibold text-gray-800 transition hover:text-gray-950 sm:inline"
            >
              Supervision Portal
            </Link>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav
              className="flex flex-wrap items-center gap-1"
              aria-label="Main navigation"
            >
              {navigation.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
                        : "rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-950"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden h-8 w-px bg-gray-200 sm:block" />

            <div className="flex items-center gap-3">
              <Link
                href="/account"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-950"
              >
                <span className="xl:hidden">Account</span>
                <span className="hidden xl:inline">{fullName}</span>
              </Link>

              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
