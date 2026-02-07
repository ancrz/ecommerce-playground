/**
 * TouchButton - Touch-Optimized Button Component
 * ==============================================
 * 
 * Implements Apple/Google touch target standards (min 44x44px).
 * Responsive: Full-width on mobile, auto-width on desktop.
 * 
 * Gap Resolutions:
 * - Icon-only variant with square 44x44px minimum
 * - Consistent touch targets across all modules
 * 
 * Based on: ATS module button pattern (source of truth)
 */

import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

export interface TouchButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  children?: React.ReactNode;
  onClick?: () => void;
  fullWidthMobile?: boolean; // Default true
  iconOnly?: boolean; // Square button for icons
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  icon?: LucideIcon; // Optional icon
  loading?: boolean; // Loading state
  form?: string; // Form ID for submit buttons
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  variant = 'primary',
  children,
  onClick,
  fullWidthMobile = true,
  iconOnly = false,
  className = '',
  disabled = false,
  type = 'button',
  icon: Icon,
  loading = false,
  form,
}) => {
  // Base classes: Touch target minimum (44px), padding, transitions
  const baseClasses = 'min-h-[44px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Width classes: Full-width mobile or icon-only square
  const widthClasses = iconOnly
    ? 'min-w-[44px] w-auto px-2' // Square for icons
    : fullWidthMobile
    ? 'w-full sm:w-auto px-4 py-2.5'
    : 'w-auto px-4 py-2.5';
  
  // Variant-specific styles
  const variantClasses = {
    primary: 'bg-primary hover:opacity-90 active:scale-95 text-accent rounded-lg shadow-sm',
    secondary: 'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg',
    ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg',
    outline: 'bg-transparent border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg',
  };

  const IconComponent = loading ? Loader2 : Icon;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      form={form}
      className={`${baseClasses} ${widthClasses} ${variantClasses[variant]} ${className} flex items-center justify-center gap-2`}
    >
      {IconComponent && <IconComponent className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
      {children}
    </button>
  );
};

export default TouchButton;
