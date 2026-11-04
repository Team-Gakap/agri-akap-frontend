# 🌾 AGRI-AKAP — Frontend (Ionic Vue 3 + Capacitor PWA)

> **Agricultural Assistance and Knowledge Access Portal** > **Institution:** Isabela State University – Echague Campus | CCSICT  
> **Target Agency:** Municipal Agriculture Office (MAO) of Echague, Isabela  
> **Degree Program:** BSIT – Web & Mobile Applications Track  

---

## 👥 Proponents & Capstone Group Members

* **John Mitchel M. Dupitas** — *Lead Full-Stack Architect & Project Lead* ([@JohnMitchelDupitas](https://github.com/JohnMitchelDupitas))
* **Justin R. Iddurut** — *Front-End Developer & UI/UX Lead* ([@IDDUJUSTIN](https://github.com/IDDUJUSTIN))
* **Dave Raphael M. Ignacio** — *Quality Assurance & Documentation Lead*

---

## 📌 Frontend System Overview

This repository contains the client-side presentation layer for **AGRI-AKAP**. It is built as a Progressive Web Application (PWA) with hybrid mobile functionality (Android) using Ionic Framework, Vue 3, and Capacitor.

### 📱 Core Frontend Capabilities
* **Offline-First Field Queue:** Uses local `IndexedDB` storage to record offline field transactions in signal dead spots and syncs automatically upon re-establishing internet connection.
* **Camera-Based QR Scanner:** Instant beneficiary verification for quick distribution logging.
* **Responsive Administrative Dashboard:** Web interface equipped with interactive data tables, GIS map views, and chart visualizers.
* **Priority Beneficiary Tags:** Visual badges and color coding for Senior Citizens and PWD cardholders.

---

## 🔗 Related Repositories

* **Backend Repository (Laravel 11 REST API):** 👉 [https://github.com/JohnMitchelDupitas/agri-akap-backend](https://github.com/JohnMitchelDupitas/agri-akap-backend)


---

## 🛠️ Frontend Tech Stack

* **Framework:** Ionic v7.x + Vue 3 (Composition API)
* **Mobile Runtime:** Capacitor v5.x
* **Language:** TypeScript / JavaScript
* **State Management:** Pinia
* **Styling:** Tailwind CSS / Ionic Utilities
* **Build Tool:** Vite

---

## Local development

Requirements: Node.js 20.19+ and npm. Start the Laravel API first (see the backend's **Local development** instructions), then from this directory run:

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite (normally `http://localhost:5173`). In Vite development mode, API requests use `http://127.0.0.1:8000/api` instead of the production URL configured in `.env`. Set a different `VITE_API_URL` in `.env.development.local` only if you need to test against another API, then restart Vite.

On localhost, the CAPTCHA widget uses Cloudflare's public test site key (`1x00000000000000000000AA`) when `VITE_TURNSTILE_SITE_KEY` is unset. Configure the matching public test secret in the backend's local `.env` as described in the backend's **Local development** instructions; otherwise a configured real secret will reject the test token. Do not use the test keys in a deployment.

---

## 📂 Directory Structure

```text
agri-akap-frontend/
├── public/                # Static web assets & PWA manifest
├── src/
│   ├── assets/            # Global styles, icons, and images
│   ├── components/        # Reusable UI components
│   ├── router/            # Route guards and navigation paths
│   ├── stores/            # Pinia stores (Auth, Offline Queue, Farmers)
│   ├── utils/             # Helpers (API client, QR scanner, formatters)
│   └── views/             # Admin web dashboards & Mobile field views
├── capacitor.config.ts    # Native Capacitor configuration
├── ionic.config.json      # Ionic CLI settings
├── package.json           # Node dependencies
└── vite.config.ts         # Vite build settings
