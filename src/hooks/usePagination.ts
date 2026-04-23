import { useState, useMemo } from 'react';

export function usePagination(totalItems: number, pageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const setPage = (page: number) => setCurrentPage(Math.min(Math.max(1, page), totalPages));

  return {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    setPage,
    startIndex: (currentPage - 1) * pageSize,
    endIndex: Math.min(currentPage * pageSize, totalItems),
    pageSize,
  };
}
