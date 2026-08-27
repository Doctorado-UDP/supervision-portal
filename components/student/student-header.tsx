import Image from "next/image";
import Link from "next/link";

type StudentHeaderProps = {
  fullName: string;
};

export default function StudentHeader({ fullName }: StudentHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-4">
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
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/account"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-950"
          >
            <span className="sm:hidden">Account</span>
            <span className="hidden sm:inline">{fullName}</span>
          </Link>

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
