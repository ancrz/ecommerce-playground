import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TouchButton } from '../common/TouchButton';

interface PaginationProps {
  currentPage: number;
  totalPages?: number; // Optional if we only know "hasMore"
  hasMore?: boolean;   // For infinite scroll style pagination
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  hasMore, 
  onPageChange,
  className = ''
}: PaginationProps) {
  
  // Logic to determine if we can go next
  const canNext = totalPages ? currentPage < totalPages : hasMore;
  const canPrev = currentPage > 1;

  // Generate page numbers for Desktop (e.g., 1 ... 4 5 6 ... 10)
  const getPageNumbers = () => {
    if (!totalPages) return [];
    
    const pages: (number | string)[] = [];
    const maxVisible = 5; // Max 5 page numbers buttons

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first and last
    // Show current, prev, next
    
    // Add 1
    pages.push(1);

    if (currentPage > 3) pages.push('...');

    // Neighbors
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) {
            pages.push(i);
        }
    }

    if (currentPage < totalPages - 2) pages.push('...');

    // Add last
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex flex-col md:flex-row justify-center items-center gap-4 py-4 ${className}`}>
      
      {/* Mobile: Simplified Prev/Next */}
      <div className="flex md:hidden items-center justify-between w-full px-4 gap-4">
        <TouchButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canPrev}
          variant="secondary"
          className="flex-1 justify-center"
          icon={ChevronLeft}
        >
          Anterior
        </TouchButton>
        
        <span className="text-gray-600 font-medium whitespace-nowrap">
          Pág. {currentPage}
        </span>

        <TouchButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canNext}
          variant="secondary"
          className="flex-1 justify-center"
        >
          Siguiente <ChevronRight size={16} className="ml-1" />
        </TouchButton>
      </div>

      {/* Desktop: Numbered Pagination */}
      <div className="hidden md:flex items-center gap-2">
        <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canPrev}
            className={`p-2 rounded-lg border transition-colors ${!canPrev ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-blue-600'}`}
        >
            <ChevronLeft size={20} />
        </button>

        {totalPages ? (
            <div className="flex items-center gap-1">
                {pageNumbers.map((page, idx) => (
                    typeof page === 'number' ? (
                        <button
                            key={idx}
                            onClick={() => onPageChange(page)}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors border ${
                                page === currentPage 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-blue-600'
                            }`}
                        >
                            {page}
                        </button>
                    ) : (
                        <span key={idx} className="px-2 text-gray-400 select-none">...</span>
                    )
                ))}
            </div>
        ) : (
            <span className="px-4 text-gray-600 font-medium">
                Página {currentPage}
            </span>
        )}

        <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canNext}
            className={`p-2 rounded-lg border transition-colors ${!canNext ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-blue-600'}`}
        >
            <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
