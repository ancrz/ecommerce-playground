<div align="center">

# 🛒 Minimalist E-Commerce Platform

**A modern, lightweight e-commerce demo built for testing, demonstration, and AI-driven development.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-4+-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue?style=flat-square)](LICENSE)

<p align="center">
  <strong>Designed for rapid prototyping, AI pair-programming, and containerized deployments.</strong>
</p>

</div>

---

## ✨ Overview

A **Single Page Application (SPA)** e-commerce platform designed as a development playground. Built with modern technologies and clean architecture, this project serves as:

- 🧪 **Testing Ground** — Experiment with new features and integrations
- 🎓 **Learning Platform** — Understand full-stack development patterns
- 🤖 **AI-Driven Development** — Optimized for pair-programming with AI assistants
- 📦 **Container-Ready** — Designed for easy deployment to containerized environments

---

## 🏗️ Tech Stack

<table>
<tr>
<td width="50%">

### Backend

| Technology      | Purpose                              |
| --------------- | ------------------------------------ |
| **FastAPI**     | High-performance async API framework |
| **Pydantic v2** | Data validation & serialization      |
| **SQLAlchemy**  | ORM (Relational Mapping)             |
| **Alembic**     | Database migrations                  |
| **PyJWT**       | Authentication & RBAC                |
| **aiosqlite**   | Async database driver                |

</td>
<td width="50%">

### Frontend

| Technology       | Purpose                   |
| ---------------- | ------------------------- |
| **React 18**     | UI component library      |
| **TypeScript**   | Type-safe development     |
| **Vite**         | Lightning-fast build tool |
| **React Query**  | State & Cache Management  |
| **Zod**          | Runtime schema validation |
| **Lucide React** | Modern icon library       |

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** with npm
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/ancrz/ecommerce-playground.git
cd ecommerce-playground

# Run the setup script
python setup.py
```

### Start Development Servers

```bash
# Start both backend and frontend
python start.local.py

# Access the application
# Frontend → http://localhost:5173
# Backend API → http://localhost:8042/docs
```

### Stop Servers

```bash
python stop.local.py
```

---

## 📁 Project Structure

```
ecommerce-playground/
├── backend/                 # FastAPI Backend
│   ├── api/                 # REST API Endpoints
│   ├── services/            # Business Logic Layer
│   ├── models/              # Pydantic DTOs & Schemas
│   ├── database/            # Database Manager
│   └── utils/               # Auth & Helpers
├── frontend/                # React SPA
│   └── src/
│       ├── schemas.ts       # Zod Validation Schemas
│       ├── types.ts         # TypeScript Types (inferred)
│       ├── api.ts           # API Client with validation
│       └── components/      # React Components
├── scripts/                 # Utility Scripts
├── docs/                    # Architecture Documentation
├── data/                    # Runtime Data (SQLite, uploads)
├── pyproject.toml           # Python Project Config
└── alembic.ini              # Database Migrations
```

---

## 🔑 Key Features

<table>
<tr>
<td>

### Core E-Commerce

- 🛍️ Product catalog with categories
- 🛒 Shopping cart with real-time updates
- 💳 Multi-payment support
- 📊 Sales & daily reports

</td>
<td>

### Administration

- 👥 Role-Based Access Control (RBAC)
- 🏪 Business customization
- 💰 Multi-currency support
- 📋 Regional tax management

</td>
</tr>
</table>

---

## 🔧 Configuration

All settings are managed via `.env` file:

```env
# Database
DB_TYPE=sqlite
DB_PATH=./data/database

# Servers
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Admin (change in production!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin2024

# Security
JWT_SECRET_KEY=your-generated-secret
```

---

## 🤖 AI-Driven Development

This project is optimized for **AI pair-programming**:

| Feature                | Benefit                                    |
| ---------------------- | ------------------------------------------ |
| **Clean Architecture** | Easy for AI to understand and navigate     |
| **Type Safety**        | Pydantic + Zod ensure contract consistency |
| **Modular Design**     | Changes are isolated and predictable       |
| **Documentation**      | Maps and guides for quick context          |
| **Script-Based Setup** | One command to initialize everything       |

### Development Philosophy

1. **Contract-First** — Backend DTOs (Pydantic) mirror Frontend schemas (Zod)
2. **Validation Everywhere** — Runtime validation on both ends
3. **Clean Separation** — API → Service → Database layers
4. **RBAC Security** — Role-based guards on all admin endpoints

---

## 📖 Documentation

| Document                             | Description                         |
| ------------------------------------ | ----------------------------------- |
| [Backend Map](docs/backend_map.md)   | Service architecture & dependencies |
| [Frontend Map](docs/frontend_map.md) | Component hierarchy & data flow     |
| [Global Map](docs/global_map.md)     | Full-stack integration guide        |

---

## 🚢 Container-Ready

This project is designed for easy containerization:

```bash
# Future: Docker deployment
docker-compose up -d
```

_Note: Docker support is planned for future iterations._

---

## 📄 License

Apache License 2.0 — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for learning, testing, and AI-assisted development.**

[⬆ Back to Top](#-minimalist-e-commerce-platform)

</div>
