# System Architecture

**Last Updated:** 2026-01-31

## Overview

**Position Helper** is a Vue 3 + Vite application designed to manage team assignments, rotation warnings, and statistics for a volunteer video team. It utilizes a **Feature-Sliced Design (FSD)** inspired architecture to ensure modularity and scalability.

## High-Level Structure

```mermaid
graph TD
    App[App Entry] --> Router
    Router --> Features
    
    subgraph Features
        Assignment[Assignment Management]
        Members[Member Management]
        Stats[Statistics & Visualization]
    end
    
    subgraph Shared
        UI[UI Components (Shadcn/Stitch)]
        Utils[Utilities]
        Types[Domain Types]
    end
    
    subgraph State
        Pinia[Pinia Stores]
    end
    
    Features --> Shared
    Features --> State
```

## Core Modules

| Module | Description | Key Tech |
|--------|-------------|----------|
| **Assignment** | Manages weekly role assignments (Main, Sub, etc.) | Pinia, Drag-n-Drop |
| **Members** | Manage team member roster and active status | CRUD |
| **Stats** | Visualize workload and role distribution | Apache ECharts |
| **Shared** | Reusable UI components and utilities | Shadcn Vue, Tailwind |

## Codemaps

- [Frontend Architecture](./frontend.md) – Detailed view of components, stores, and routes.
