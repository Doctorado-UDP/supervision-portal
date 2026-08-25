"use client";

import {
  Children,
  type ReactNode,
  useState,
} from "react";

type PaginatedListProps = {
  children: ReactNode;
  className?: string;
  pageSize?: number;
  ariaLabel?: string;
};

export default function PaginatedList({
  children,
  className,
  pageSize = 5,
  ariaLabel = "Pagination",
}: PaginatedListProps) {
  const [page, setPage] = useState(1);
  const items = Children.toArray(children);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleItems = items.slice(startIndex, startIndex + pageSize);

  return (
    <>
      <div className={className}>{visibleItems}</div>

      {totalPages > 1 && (
        <nav
          aria-label={ariaLabel}
          className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4"
        >
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-xs text-gray-500">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
}
