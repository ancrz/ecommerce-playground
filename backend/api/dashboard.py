import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from .deps import is_admin

# Configure Logger
logger = logging.getLogger(__name__)

router = APIRouter()

# --- Helpers ---


def parse_json_safe(json_str: str | list | dict | None) -> Any:
    """Safely parse JSON from DB (handles text or already parsed objects)."""
    if not json_str:
        return []
    if isinstance(json_str, (dict, list)):
        return json_str
    try:
        if isinstance(json_str, str):
            return json.loads(json_str)
        return []
    except Exception:
        return []


# --- Endpoint ---


@router.get("/stats", dependencies=[Depends(is_admin)])
async def get_dashboard_stats(request: Request):
    """
    Get real-time dashboard statistics using DatabaseManager (Raw SQL).
    Aggregates data for Revenue, Orders, Products, Users, and Categories.
    """
    try:
        # 1. Dependency Injection (Manual via App State)
        if not hasattr(request.app.state, "user_service") or not request.app.state.user_service:
            logger.warning("UserService not found in app.state. Using mock data fallback.")
            raise HTTPException(status_code=503, detail="Database Service Unavailable")

        db = request.app.state.user_service.db_manager

        # --- 2. Data Fetching (Parallel-ish via async/await) ---

        # A. Sales Data (Completed)
        sales_rows = await db.fetchall(
            "sales", "SELECT id, total_with_tax, items, created_at FROM sales WHERE status = 'completed'"
        )

        # B. Pending Orders (New Orders)
        pending_rows = await db.fetchall(
            "sales", "SELECT COUNT(*) as count FROM sales WHERE status = 'pending' OR status = 'processing'"
        )
        new_orders_count = pending_rows[0]["count"] if pending_rows else 0

        # C. Total Orders
        total_orders_rows = await db.fetchall("sales", "SELECT COUNT(*) as count FROM sales")
        total_orders = total_orders_rows[0]["count"] if total_orders_rows else 0

        # D. Products Data (For Category Mapping & Stock)
        products_rows = await db.fetchall("products", "SELECT id, category, stock, price FROM products")

        # E. Users Data
        users_rows = await db.fetchall("users", "SELECT id, is_active, created_at, username FROM users")

        # F. Carts (For Active Guests) - Active in last 30 mins
        carts_rows = await db.fetchall("cart", "SELECT id, customer_id, updated_at FROM carts")

        # --- 3. Data Processing & Aggregation (Python) ---

        # > Process Products
        active_products = 0
        low_stock_products = 0
        product_map: dict[str, dict[str, Any]] = {}  # id -> {category, price}

        for p in products_rows:
            p_id = str(p["id"])
            stock = int(p["stock"] or 0)

            product_map[p_id] = {
                "category": str(p["category"] or "Uncategorized"),
                "price": Decimal(str(p["price"] or 0)),
            }

            if stock > 0:
                active_products += 1
            if stock <= 5:
                low_stock_products += 1

        # > Process Sales (Revenue, Categories, Monthly)
        total_revenue = Decimal(0)
        category_sales: defaultdict[str, Decimal] = defaultdict(Decimal)
        # Typehint for monthly_stats: str -> dict with 'revenue' (Decimal) and 'orders' (int)
        monthly_stats: defaultdict[str, dict[str, Any]] = defaultdict(lambda: {"revenue": Decimal(0), "orders": 0})

        recent_cutoff = datetime.now() - timedelta(days=30)
        revenue_recent = Decimal(0)

        # Sort for recent activity logic
        def get_sort_key(x):
            try:
                val = x.get("created_at", "")
                return str(val) if val else ""
            except Exception:
                return ""

        sales_rows.sort(key=get_sort_key, reverse=True)

        for sale in sales_rows:
            # 1. Revenue
            amount = Decimal(str(sale.get("total_with_tax") or 0))
            total_revenue += amount

            # 2. Monthly Stats
            try:
                created_at_raw = sale.get("created_at")
                created_at = None
                if isinstance(created_at_raw, str):
                    created_at = datetime.fromisoformat(created_at_raw.replace("Z", "+00:00"))
                else:
                    created_at = created_at_raw

                if created_at:
                    if created_at.tzinfo:
                        created_at = created_at.replace(tzinfo=None)

                    month_key = created_at.strftime("%b")  # Jan, Feb...

                    # Safe update with casting logic
                    current_rev = monthly_stats[month_key]["revenue"]
                    if isinstance(current_rev, Decimal):
                        monthly_stats[month_key]["revenue"] = current_rev + amount
                    else:
                        monthly_stats[month_key]["revenue"] = Decimal(str(current_rev)) + amount

                    current_orders = monthly_stats[month_key]["orders"]
                    if isinstance(current_orders, int):
                        monthly_stats[month_key]["orders"] = current_orders + 1
                    else:
                        monthly_stats[month_key]["orders"] = int(current_orders) + 1

                    if created_at > recent_cutoff:
                        revenue_recent += amount

            except Exception:
                # Log or ignore specific date parsing errors
                pass

            # 3. Category Aggregation
            items = parse_json_safe(sale.get("items"))
            for item in items:
                prod_id = str(item.get("product_id"))
                qty = int(item.get("quantity", 1))

                cat = product_map.get(prod_id, {}).get("category", "General")
                price_val = item.get("price")
                if not price_val:
                    price_val = product_map.get(prod_id, {}).get("price", 0)

                price = Decimal(str(price_val))

                category_sales[cat] += price * qty

        # > Process Users (Active/Staff)
        staff_count = sum(1 for u in users_rows if u.get("is_active"))
        total_users = len(users_rows)

        # > Process Guests (Active Carts)
        active_guests = 0
        now = datetime.utcnow()
        for c in carts_rows:
            try:
                updated_at_raw = c.get("updated_at")
                updated_at = None
                if isinstance(updated_at_raw, str):
                    updated_at = datetime.fromisoformat(updated_at_raw.replace("Z", "+00:00"))
                else:
                    updated_at = updated_at_raw

                if updated_at:
                    if updated_at.tzinfo:
                        updated_at = updated_at.replace(tzinfo=None)

                    if (now - updated_at).total_seconds() < 1800:
                        active_guests += 1
            except Exception:
                pass

        # --- 4. Format for Response ---

        # Monthly Performance (Last 6 months ordered)
        months_ordered = []
        for i in range(5, -1, -1):
            d = datetime.now() - timedelta(days=i * 30)
            m_name = d.strftime("%b")
            data = monthly_stats.get(m_name, {"revenue": Decimal(0), "orders": 0})
            months_ordered.append({"month": m_name, "revenue": float(data["revenue"]), "orders": int(data["orders"])})

        # Sales by Category
        sorted_cats = sorted(category_sales.items(), key=lambda x: x[1], reverse=True)
        total_cat_sales = sum(category_sales.values()) or Decimal(1)

        formatted_cats = []
        for cat, amount in sorted_cats[:4]:  # Top 4
            formatted_cats.append(
                {
                    "category": cat,
                    "amount": float(amount),
                    "percentage": round(float(amount / total_cat_sales * 100), 1),
                }
            )

        # Recent Activities
        recent_activities = []

        # Sales
        for sale in sales_rows[:3]:
            recent_activities.append(
                {
                    "type": "sale",
                    "icon": "shopping-bag",
                    "action": "Nueva Venta",
                    "target": f"Pedido #{str(sale.get('id', '?'))[:8]}",
                    "time": "Reciente",
                    "amount": float(sale.get("total_with_tax") or 0),
                    "status": "completed",
                    "color": "green",
                }
            )

        # Users
        users_rows.sort(key=get_sort_key, reverse=True)
        for user in users_rows[:2]:
            recent_activities.append(
                {
                    "type": "user",
                    "icon": "user",
                    "action": "Nuevo Usuario",
                    "target": f"{user.get('username', 'Usuario')}",
                    "time": "Reciente",
                    "color": "blue",
                }
            )

        revenue_change = Decimal(0)

        return {
            "total_revenue": float(total_revenue),
            "revenue_change": float(revenue_change),
            "new_orders": new_orders_count,
            "total_orders": total_orders,
            "active_products": active_products,
            "low_stock_products": low_stock_products,
            "total_users": total_users,
            "online_users": active_guests + staff_count,
            "user_breakdown": {"guests": active_guests, "staff": staff_count, "total": active_guests + staff_count},
            "sales_by_category": formatted_cats,
            "monthly_performance": months_ordered,
            "recent_activities": recent_activities,
        }

    except Exception as e:
        logger.error(f"Dashboard Stats Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e
