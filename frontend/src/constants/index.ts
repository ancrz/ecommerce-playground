// Z-Index Hierarchy Registry
// Central source of truth for stacking contexts to avoid collisions.
export const Z_INDEX = {
  BASE: 0,
  BOTTOM_NAV: 40,   // Fixed bottom navigation on mobile
  STICKY_HEADER: 40, // Header
  DROPDOWN: 50,     // Dropdowns/Popovers
  OVERLAY: 60,      // Background overlays
  MODAL: 100,       // Modals (High priority for immersion)
  TOAST: 110,       // Toast notifications (Highest)
};

// Layout Dimensions
export const LAYOUT = {
  HEADER_HEIGHT_DESKTOP: '4rem', // 64px
  HEADER_HEIGHT_MOBILE: '3.5rem', // 56px
  BOTTOM_NAV_HEIGHT: '4rem',      // 64px
};

// API Paths
export const API_ROUTES = {
  AUTH: '/auth',
  PRODUCTS: '/products',
  CART: '/cart',
  BUSINESS: '/business',
  IMAGES: '/images',
  ADMIN: '/admin',
};

// Default Fallbacks
export const DEFAULTS = {
  APP_NAME: 'E-Commerce Core',
  CURRENCY: 'Bs.',
};
