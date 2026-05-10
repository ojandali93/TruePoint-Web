export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ONBOARDING: '/onboarding',

  DASHBOARD: '/dashboard',

  CARDS: '/cards',
  SET: (setId: string) => `/cards/${setId}`,
  CARD: (setId: string, cardId: string) => `/cards/${setId}/${cardId}`,

  CENTERING: '/centering',
  CENTERING_REPORT: (reportId: string) => `/centering/${reportId}`,

  INVENTORY: '/inventory',
  INVENTORY_SEALED: '/inventory/sealed',
  INVENTORY_GRADED: '/inventory/graded',

  GRADING: '/grading',
  ARBITRAGE: '/grading/arbitrage',
  GRADING_LIFECYCLE: '/grading/submissions',

  PORTFOLIO: '/portfolio',

  MASTER_SETS: '/master-sets',
  MASTER_SET: (setId: string) => `/master-sets/${setId}`,

  SETTINGS: '/settings',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_BILLING: '/settings/billing',

  ADMIN: '/admin',
  ADMIN_VARIANTS: '/admin/variants',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_ANALYTICS_USERS: '/admin/analytics/users',
  ADMIN_ANALYTICS_COLLECTION: '/admin/analytics/collection',
} as const;
