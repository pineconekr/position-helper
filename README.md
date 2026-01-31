# Position Helper (포지션 헬퍼)

📸 **고등부 영상팀 포지션 배정 도우미**

Vue 3 + Vite + TypeScript based application for managing volunteer team assignments, checking rotation rules, and visualizing participation statistics.

## ✨ Key Features

- **Smart Assignment Grid**: Interactive drag-and-drop interface for weekly role scheduling.
- **Rotation Warnings**: Real-time alerts for consecutive assignments or role fatigue.
- **Statistics Dashboard**: 📊 **[NEW]** Visualize member workload and role distribution using Apache ECharts.
- **Member Management**: Easily add/remove members and manage active status.
- **Stitch Dark Mode**: "Igeootte" dark mode design system integration.
- **History Tracking**: Undo/Redo capability for assignment actions.

## 🛠️ Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: Shadcn Vue + Headless UI
- **Visualization**: [Apache ECharts](https://echarts.apache.org/)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm to pnpm

### Installation

```bash
# Clone the repository
git clone [repo-url]

# Install dependencies
npm install
```

### Development

```bash
# Start dev server (localhost:3000)
npm run dev
```

### Build

```bash
npm run build
```

## 📂 Documentation

- **[Architecture Overview](docs/CODEMAPS/INDEX.md)** - System design and structure.
- **[Frontend Map](docs/CODEMAPS/frontend.md)** - Detailed component and state breakdown.
- **[Design System](DESIGN_SYSTEM.md)** - Colors, typography, and UI guidelines.

## 🤝 Contributing

1.  Check the `src/features` directory for modular logic.
2.  Use `npm run type-check` before committing.
3.  Follow the [Stitch Design System](DESIGN_SYSTEM.md).
