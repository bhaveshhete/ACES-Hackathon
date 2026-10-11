# ADR 001: Technology Stack and Minimal Dependency Strategy

## Status
Accepted

## Context
Phase 1 of the P2P Micro-Lending Matchmaker requires building a responsive, accessible fintech decision-support dashboard with client-side financial calculations, budget allocation logic, and transparent explanations. The architecture must lay the foundation for future Phase 2 integration with Hugging Face (`JensBender/loan-default-prediction-pipeline`) and Phase 3 production services, without introducing premature backend infrastructure, databases, authentication, or heavyweight third-party libraries.

## Decision
1. **Framework**: Next.js 14 (App Router) with React 18 and TypeScript.
2. **Styling**: Tailwind CSS configured with a custom institutional dark color palette tokens (`globals.css` and `tailwind.config.ts`).
3. **Icons**: Lucide React for consistent financial iconography.
4. **Testing**: Vitest with `@testing-library/react` and `jsdom` for test-driven development.
5. **No Heavy Component Frameworks**: In accordance with the Ponytail skill (minimum sufficient code, avoiding unnecessary wrapper components and libraries for sliders/dialogs), native HTML elements (`<input type="range">`, `<input type="number">`, `<button>`) styled with Tailwind and accessible ARIA attributes are used.
6. **State Management**: React local state (`useState`, `useMemo`, `useCallback`) within the page component, passing down deterministic props. No external global state management (such as Redux or Zustand) was added because Phase 1 operates within a single cohesive dashboard flow.

## Consequences
- **Positive**: Zero bloat, rapid client-side rendering and instant reactive recalculation, complete control over accessibility attributes and keyboard navigation, minimal bundle size (first-load JS ~98 kB).
- **Trade-offs**: Form controls and sliders require custom CSS styling and ARIA attributes rather than pre-packaged UI library behaviors. State is held in-memory and resets upon page reload (acceptable for Phase 1 prototype).
