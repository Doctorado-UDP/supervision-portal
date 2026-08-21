import Image from "next/image";
import Link from "next/link";

type AdminHeaderProps = {
  fullName: string;
};

export default function AdminHeader({
  fullName,
}: AdminHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/admin"
            className="flex items-center gap-4"
          >
            <Image
              src="/branding/udp.png"
              alt="Universidad Diego Portales"
              width={164}
              height={40}
              priority
              className="h-auto w-auto max-w-[164px]"
            />

            <span className="hidden border-l border-gray-200 pl-4 text-sm font-semibold text-gray-800 lg:block">
              Supervision Portal
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/admin/students"
              className="text-sm font-medium text-gray-700 hover:text-gray-950"
            >
              Students
            </Link>

            <Link
              href="/admin/supervisions"
              className="text-sm font-medium text-gray-600 hover:text-gray-950"
            >
              Supervisions
            </Link>

            <Link
              href="/admin/timetable"
              className="text-sm font-medium text-gray-700 hover:text-gray-950"
            >
              Timetable
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-gray-600 lg:inline">
            {fullName}
          </span>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}