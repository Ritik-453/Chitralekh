<p align="center">
  <img src="chitralekh-icon.jpg" width="120" height="120" alt="Chitralekh Icon" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);" />
</p>

<h1 align="center">Chitralekh (चित्रलेख)</h1>

<p align="center">
  <strong>The Visual Notes Studio & Academic Knowledge Repository</strong>
</p>

<!-- MOVING CHARACTERS / ANIMATED TYPING SVG -->
<p align="center">
  <a href="https://chitralekh-frontend.onrender.com">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&duration=3000&pause=1200&color=6366F1&center=true&vCenter=true&width=650&lines=Chitralekh+(चित्रलेख)+—+Visual+Notes+Studio;Craft+Markdown+%2B+Mermaid+Flowcharts;Instant+Guest+Mode+%E2%9A%A1+Zero+Signup+Required;Central+Academic+Knowledge+Repository;Pass+down+knowledge+across+college+batches!" alt="Typing Header" />
  </a>
</p>

<p align="center">
  <a href="https://chitralekh-frontend.onrender.com"><img src="https://img.shields.io/badge/🚀%20Live%20Demo-chitralekh--frontend.onrender.com-6366F1?style=for-the-badge&logo=render&logoColor=white" alt="Live Demo" /></a>
  <a href="https://chitralekh-backend-fj80.onrender.com/docs"><img src="https://img.shields.io/badge/⚡%20API%20Docs-FastAPI%20Swagger-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="API Docs" /></a>
  <a href="https://github.com/Ritik-453/Chitralekh/stargazers"><img src="https://img.shields.io/github/stars/Ritik-453/Chitralekh?style=for-the-badge&color=F59E0B&logo=github" alt="Stars" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Mermaid.js-Diagrams-FF3670?style=flat-square&logo=mermaid&logoColor=white" alt="Mermaid" />
</p>

---

## 🌟 The Philosophy behind "चित्रलेख" (Chitralekh)

> *"चित्रं च लेखं च यत्र मिलतः, तत्र ज्ञानं प्रकाशते।"*  
> *(Where imagery and mindful writing unite, knowledge illuminates.)*

The name blends two classical Sanskrit roots:
* **चित्र (Chitra)**: Visual imagery, blueprints, diagrams, and architecture.
* **लेख (Lekha)**: Mindful inscription, notes, documentation, and literature.

Every semester, students solve complex proofs, whiteboard system designs, and build study guides — yet **90% of that student knowledge vanishes** across batch transitions. **Chitralekh** transforms private ephemeral notes into persistent visual artifacts and a shared academic legacy.

---

## 📸 Visual Showcase

<p align="center">
  <img src="assets/hero-showcase.jpg" width="100%" alt="Chitralekh Hero Showcase" style="border-radius: 12px; border: 1px solid #334155;" />
</p>

<table width="100%">
  <tr>
    <td width="50%" align="center">
      <strong>💻 Visual Note & Flowchart Studio</strong><br/><br/>
      <img src="assets/editor-preview.jpg" width="100%" alt="Editor Preview" style="border-radius: 8px;" />
    </td>
    <td width="50%" align="center">
      <strong>🏛️ Central Academic Repository</strong><br/><br/>
      <img src="assets/central-repository.jpg" width="100%" alt="Central Repository" style="border-radius: 8px;" />
    </td>
  </tr>
</table>

---

## ✨ Core Superpowers

| Feature | Description | Status |
| :--- | :--- | :---: |
| ⚡ **Instant Guest Mode** | Try the full editor & diagrams in **1-click** with zero signup friction. Notes save to local IndexedDB. | ✅ Live |
| 📊 **Mermaid.js Flowcharts** | Real-time code-to-diagram engine for system architectures, algorithms, state machines, and mindmaps. | ✅ Live |
| 📐 **LaTeX Math Engine** | Native rendering for complex mathematical equations, proofs, and machine learning formulations. | ✅ Live |
| 🏛️ **Central Knowledge Hub** | Pass down curriculum notes across college batches. Search, study, like, and download community notes. | ✅ Live |
| 🔄 **Heritage & Version Forking** | Fork any peer note into your workspace or contribute updated versions (`v1 → v2`) preserving credit. | ✅ Live |
| 📷 **Document Scanner & OCR** | Convert physical whiteboard snaps, lecture PDFs, and paper docs into clean editable Markdown. | ✅ Live |
| 💾 **Local-First + Cloud Sync** | Draft zero-latency offline notes stored locally with instant cloud backup upon login. | ✅ Live |
| 🎨 **Theme & Customization** | Dark, Light, and Cyberpunk high-contrast themes with custom monospace fonts and split layouts. | ✅ Live |

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User([👤 User / Student]) --> ModeCheck{Authentication?}
    
    %% Guest Pathway
    ModeCheck -- "Guest Mode (1-Click)" --> GuestPath["⚡ Instant Local Session"]
    GuestPath --> IndexedDB[("💾 Browser IndexedDB\nZero Latency Offline Storage")]
    GuestPath --> PreviewStudio["🎨 Live Markdown + Mermaid + KaTeX Editor"]
    
    %% Registered Pathway
    ModeCheck -- "Login / OAuth" --> AuthAPI["🔐 FastAPI JWT Auth\nGoogle • GitHub • Microsoft"]
    AuthAPI --> CloudDB[("🐘 PostgreSQL Cloud Database")]
    
    %% Central Repository Hub
    PreviewStudio -. "Want Cloud Save / Upload?" .-> Gatekeep{"Sign In Prompt"}
    Gatekeep -- Authenticated --> CentralRepo["🏛️ Central Academic Repository"]
    CloudDB <--> CentralRepo
    
    CentralRepo --> FutureBatch["🎓 Future Student Batches\nFork, Learn, & Contribute Versions"]
```

---

## ⚡ Quick Start

### 1. Try Live in Browser (Zero Setup)
No installation or signup required:
👉 **[Open Chitralekh Live](https://chitralekh-frontend.onrender.com)** and click **"Continue as Guest (Try app instantly) 🚀"**

---

### 2. Run Locally with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/Ritik-453/Chitralekh.git
cd Chitralekh

# Configure environment variables
cp backend/.env.example backend/.env

# Spin up backend, frontend, database, and redis
docker-compose up -d

# Open in your browser:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs
```

---

### 3. Local Development Setup

#### Backend (FastAPI + Python 3.12)
```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend (React 18 + Vite + TypeScript)
```bash
cd frontend
npm install
npm run dev
```

---

## ⌨️ Productivity Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | **Global Search** | Instant full-text fuzzy note search |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>N</kbd> | **New Note** | Instantiate a blank note with template picker |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>S</kbd> | **Save Note** | Save locally (IndexedDB) or sync to cloud |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>/</kbd> | **Toggle Split** | Switch between code, split, and full diagram preview |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>B</kbd> | **Bold** | Format selected text as bold |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>I</kbd> | **Italic** | Format selected text as italic |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>E</kbd> | **Code Snippet** | Wrap inline code syntax |
| <kbd>⌘</kbd> / <kbd>Shift</kbd> + <kbd>F</kbd> | **Zen Mode** | Distraction-free fullscreen editor |

---

## 📂 Repository Organization

```
Chitralekh/
├── assets/                  # High-res UI mockups, diagrams, and media
├── backend/                 # FastAPI REST application
│   ├── app/
│   │   ├── api/v1/          # Endpoints: Notes, Folders, Repository, OCR, Flowcharts
│   │   ├── core/            # Config, Security, JWT & OAuth providers
│   │   ├── models/          # SQLAlchemy async ORM models
│   │   └── services/        # OCR Tesseract, WebP compression, Central repo logic
│   ├── alembic/             # Database migration revisions
│   └── requirements.txt
├── frontend/                # React 18 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/      # UI components (Editor, Flowcharts, GuestBanner, Modals)
│   │   ├── context/         # AuthContext with 1-Click Guest Mode support
│   │   ├── hooks/           # useNotes, useEditor, useFlowcharts
│   │   ├── pages/           # NoteEditor, CentralRepository, Login, Dashboard
│   │   └── services/        # Axios API client & IndexedDB localStorageService
├── docker-compose.yml       # Multi-container orchestration
└── render.yaml              # Production Render Blueprint configuration
```

---

## 🤝 Contributing

Contributions make open-source an inspiring place to learn and build.
1. **Fork** the Project
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to the Branch (`git push origin feat/AmazingFeature`)
5. Open a **Pull Request**

---

## 📜 License & Acknowledgments

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

Crafted with ❤️ for students, researchers, and engineers by [Ritik](https://github.com/Ritik-453).

<p align="center">
  <a href="#chitralekh-चित्रलेख">⬆ Back to Top</a>
</p>