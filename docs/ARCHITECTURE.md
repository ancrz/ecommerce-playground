# 🏗️ Architecture Overview

This document provides a high-level overview of the system architecture.

## Stack Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (SPA)                         │
│  React 18 + TypeScript + Vite + Zod                         │
│  Port: 5173                                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST (via Vite proxy)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (API)                           │
│  FastAPI + Pydantic v2 + PyJWT                              │
│  Port: 8000                                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Async SQLite (aiosqlite)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE                                │
│  SQLite (chunked by domain)                                 │
│  Path: data/database/*.db                                   │
└─────────────────────────────────────────────────────────────┘
```

## Layer Architecture

### Backend Layers

| Layer        | Location            | Responsibility                     |
| ------------ | ------------------- | ---------------------------------- |
| **API**      | `backend/api/`      | HTTP endpoints, request validation |
| **Services** | `backend/services/` | Business logic, orchestration      |
| **Models**   | `backend/models/`   | DTOs, schemas (Pydantic)           |
| **Database** | `backend/database/` | SQL queries, connection management |
| **Utils**    | `backend/utils/`    | Auth, RBAC guards                  |

### Frontend Layers

| Layer          | Location          | Responsibility                       |
| -------------- | ----------------- | ------------------------------------ |
| **Schemas**    | `src/schemas.ts`  | Zod validation schemas               |
| **Types**      | `src/types.ts`    | TypeScript types (inferred from Zod) |
| **API Client** | `src/api.ts`      | HTTP calls with validation           |
| **Pages**      | `src/pages/`      | Route components                     |
| **Components** | `src/components/` | Reusable UI components               |

## Contract Synchronization

The **contract** between frontend and backend is defined in:

1. **Backend**: `backend/models/base.py` (Pydantic DTOs)
2. **Frontend**: `frontend/src/schemas.ts` (Zod schemas)

**Rule**: When modifying a DTO in `base.py`, manually update the corresponding schema in `schemas.ts`.

## Module Map

| Module       | Backend Service            | API Router         | Frontend Page              |
| ------------ | -------------------------- | ------------------ | -------------------------- |
| Auth         | `user_service.py`          | `auth.py`          | `LoginModal.tsx`           |
| Users (RBAC) | `user_service.py`          | `user_admin.py`    | `UserManagementModule.tsx` |
| Products     | `product_service.py`       | `products.py`      | `ProductsModule.tsx`       |
| Sales        | `sales_service.py`         | `sales.py`         | `SalesModule.tsx`          |
| Cart         | `cart_service.py`          | `cart.py`          | `CartModal.tsx`            |
| Taxes        | `tax_service.py`           | `tax_admin.py`     | `TaxModule.tsx`            |
| Finance      | `finance_service.py`       | `finance.py`       | `FinanceModule.tsx`        |
| Content      | `business_service.py`      | `business.py`      | `ContentModule.tsx`        |
| Theme        | `customization_service.py` | `customization.py` | `ThemeModule.tsx`          |
| Images       | `image_service.py`         | `images.py`        | (used by other modules)    |

## RBAC Roles

| Role               | Access                     |
| ------------------ | -------------------------- |
| `admin`            | Full access to all modules |
| `products_manager` | Products module            |
| `sales_manager`    | Sales & POS module         |
| `finance_manager`  | Finance & Tax modules      |
| `content_manager`  | Content & Theme modules    |

---

_For detailed module documentation, see individual files in `docs/`._
