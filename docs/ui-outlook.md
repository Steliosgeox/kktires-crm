# Outlook UI Style Guide

This app includes an "Outlook-like" email UI under `/email`.

## Goals

- Keep a single source of truth for theme (`useUIStore.theme`).
- Prefer Tailwind utilities for layout/spacing/typography.
- Keep `src/styles/outlook-theme.css` as a token file (CSS variables, keyframes, scrollbars) and avoid expanding bespoke class soup.

## Where Styles Live

- Global app styles: `src/app/globals.css`
- Outlook tokens/theme: `src/styles/outlook-theme.css`
- Outlook components:
  - `src/components/email/outlook-layout.tsx`
  - `src/components/email/outlook-sidebar.tsx`
  - `src/components/email/outlook-list.tsx`
  - `src/components/email/outlook-editor.tsx`

## Practical Conventions

- Use CSS variables from `outlook-theme.css` for colors/shadows and reference them via Tailwind where practical.
- If a style is purely structural (grid, flex, spacing), keep it in Tailwind.
- If a style is a token (color, glow, scrollbar, keyframe), keep it in CSS.

## Do/Don't

- Do: keep a small number of semantic wrappers, but migrate repeated per-element styles to Tailwind.
- Don't: try to "convert the entire CSS file to Tailwind utilities" in one pass. That tends to regress visuals and wastes time.

