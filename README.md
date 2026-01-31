<div align="center">

# 🚀 Optimio

### Your Personal Workspace

**Calendar · Tasks · Goals · Notes**

[![CI](https://github.com/ethereal-coding/Optimio/actions/workflows/ci.yml/badge.svg)](https://github.com/ethereal-coding/Optimio/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/ethereal-coding/Optimio/releases)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)

[Demo](https://optimio.app) · [Documentation](https://docs.optimio.app) · [Report Bug](https://github.com/ethereal-coding/Optimio/issues)

</div>

---

## 📸 Screenshots

<div align="center">
  <img src="docs/screenshot-dashboard.png" alt="Dashboard" width="800">
</div>

---

## ✨ Features

| Feature | Description | Status |
|---------|-------------|--------|
| 📅 **Calendar** | Google Calendar integration with offline support | ✅ |
| ✅ **Tasks** | Smart todo management with priorities | ✅ |
| 🎯 **Goals** | Track progress with milestones | ✅ |
| 📝 **Notes** | Rich text notes with search | ✅ |
| 🔍 **Search** | Global search across all content | ✅ |
| ☁️ **Sync** | Automatic background sync | ✅ |
| 📱 **PWA** | Install as app, works offline | ✅ |
| 🌙 **Dark Mode** | Beautiful dark theme | ✅ |

---

## 🛠 Tech Stack

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![Dexie](https://img.shields.io/badge/Dexie-4-FF1493)
![Zod](https://img.shields.io/badge/Zod-4-3068B7)

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + Radix UI
- **State:** React Context + TanStack Query
- **Storage:** IndexedDB (Dexie) + LocalStorage
- **Sync:** Google Calendar API
- **Validation:** Zod
- **Testing:** Vitest + React Testing Library
- **CI/CD:** GitHub Actions

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Google OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ethereal-coding/Optimio.git
   cd Optimio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:5173`

---

## 🏗 Architecture

```
optimio/
├── .github/              # GitHub Actions workflows
├── public/               # Static assets
│   ├── manifest.json     # PWA manifest
│   ├── sw.js            # Service worker
│   └── _headers         # Security headers
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components
│   │   └── *.tsx        # Feature components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and services
│   │   ├── api/         # API clients
│   │   ├── sync/        # Sync logic
│   │   └── *.ts         # Utilities
│   ├── schemas/         # Zod validation schemas
│   ├── sections/        # Page sections
│   ├── providers/       # React context providers
│   └── types/           # TypeScript types
├── tests/               # Test files
└── docs/                # Documentation
```

### Data Flow

```
User Action → React Component → Hook → Service → IndexedDB
                                    ↓
                              Google Calendar API (if online)
```

---

## 🧪 Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Statements | 70% |
| Branches | 60% |
| Functions | 70% |
| Lines | 70% |

---

## 📦 Deployment

### Vercel (Recommended)

1. Install Vercel CLI
   ```bash
   npm i -g vercel
   ```

2. Deploy
   ```bash
   vercel --prod
   ```

### Netlify

1. Connect repository to Netlify
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables

### Manual

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🤝 Contributing

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/dark-mode` |
| Bugfix | `bugfix/description` | `bugfix/sync-error` |
| Hotfix | `hotfix/description` | `hotfix/auth-bug` |
| Docs | `docs/description` | `docs/api-reference` |
| Refactor | `refactor/description` | `refactor/state-management` |

### Commit Convention

We use [Conventional Commits](https://conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code change
- `test`: Tests
- `chore`: Maintenance

Example:
```
feat(calendar): add recurring events support

- Implement RRULE parsing
- Add weekly/monthly options
- Store recurrence in IndexedDB

Closes #123
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Checklist
- [ ] Tests pass
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Documentation updated
```

---

## 📄 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for more information.

---

## 🙏 Acknowledgments

- [Radix UI](https://radix-ui.com/) for accessible components
- [Lucide](https://lucide.dev/) for beautiful icons
- [Google Calendar API](https://developers.google.com/calendar) for sync capabilities

---

<div align="center">

**[⬆ Back to Top](#-optimio)**

Made with ❤️ by the Optimio team

</div>
