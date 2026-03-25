# Fast Hands

Fast Hands is a browser-based Cubase shortcut trainer for audio creators. Upload your key commands file, study by category, quiz yourself, and explore a searchable reference to build speed and muscle memory.

## Features

- Upload and parse Cubase key command exports
- Auto-detect shortcut OS style (Mac/Windows)
- Train with dedicated modes: Quiz, Study, Explore, and Reference
- Persist loaded commands in local storage between sessions
- Optional Author Mode in development using `?__author`
- Light and dark theme support

## Tech Stack

- React 18
- TypeScript
- Vite

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## How To Use

1. Start the app.
2. Upload your Cubase key commands file.
3. Choose a tab:
   - **Quiz Yourself** for recall practice
   - **Study** for focused review
   - **Explore** for browsing
   - **Reference** for complete command lookup

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - generate descriptions, type-check, and build
- `npm run preview` - preview built app
- `npm run generate:descriptions` - generate command descriptions data

## Repository

GitHub: [elvisbates-commits/ao-fast-hands](https://github.com/elvisbates-commits/ao-fast-hands)
