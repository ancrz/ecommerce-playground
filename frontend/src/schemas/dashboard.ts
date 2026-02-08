import { z } from 'zod';

export const DashboardStatsSchema = z.object({
  total_revenue: z.number(),
  revenue_change: z.number(),
  new_orders: z.number(),
  total_orders: z.number(),
  active_products: z.number(),
  low_stock_products: z.number(),
  total_users: z.number(),
  online_users: z.number(), // Deprecated in favor of user_breakdown, but kept for compatibility
  
  // New: Breakdown
  sales_by_category: z.array(z.object({
    category: z.string(),
    amount: z.number(),
    percentage: z.number()
  })).optional(),
  
  user_breakdown: z.object({
      guests: z.number(), // Active carts
      staff: z.number(),  // Registered users/staff
      total: z.number()   // Combined
  }).optional(),

  monthly_performance: z.array(z.object({
    month: z.string(),
    revenue: z.number(),
    orders: z.number(),
    visitors: z.number().optional()
  })),
  recent_activities: z.array(z.object({
    type: z.string(),
    icon: z.string(),
    action: z.string(),
    target: z.string(),
    time: z.string(),
    amount: z.number().optional(),
    status: z.string().optional(),
    color: z.string().optional(),
  }))
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
