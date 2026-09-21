# UI_UX_GUIDELINES.md — Design System

## 1. Philosophy

Calm, premium, mobile-first Hindi UI. Big touch targets, high contrast, orange brand. No decorative clutter; one primary action per screen.

## 2. Colors

| Token | Hex | Use |
|---|---|---|
| Primary gradient | `#ea580c → #f59e0b` (orange-600 → amber-500) | Header, brand |
| Primary action | `#f97316` (orange-500) | Save buttons |
| Success bg/text/border | `#f0fdf4 / #15803d / #bbf7d0` | Success toasts, cash badges |
| Error bg/text/border | `#fef2f2 / #b91c1c / #fecaca` | Error toasts, credit badges |
| Page bg | `#f9fafb` (gray-50) | Forced on html/body (defeats WebView dark mode) |
| Text | `#111827` (gray-900) | Body |
| Muted | `#6b7280` / `#9ca3af` | Secondary text |

Tailwind:
```js
// brand gradient: bg-gradient-to-r from-orange-600 to-amber-500
```

## 3. Typography

System stack (`system-ui, -apple-system, sans-serif`). No webfont (WHY: offline APK must render without network).
- App title: `text-xl font-bold`; section `text-lg font-bold`; body `text-sm`; micro `text-[10px]/text-[11px]`.
- Hindi first, Hinglish fallback.

## 4. Spacing / Radius / Shadow

- 8px rhythm (`p-3/p-4`, `gap-2/gap-3`, `space-y-4/space-y-5`).
- Cards `rounded-xl`, toasts/modals `rounded-lg/rounded-2xl`.
- Cards `shadow-sm`, toasts `shadow-md`, modals `shadow-2xl`.

## 5. Layout

- Max width `max-w-lg mx-auto`; app height `100dvh`, container `overflow:hidden`, middle scrolls.
- Header (orange gradient) top, `BottomNav` fixed bottom, content `pb-20`.
- Toasts: `sticky top-0 z-30` inside scroll area so they stay visible.

## 6. Breakpoints / Dark Mode / Icons / Motion

- Mobile-first single column; `sm:` only for modal centering.
- No dark mode: light colors forced via CSS + inline style.
- Icons: `lucide-react` only.
- Motion: `transition-colors`, `active:` states, `pill-enter` + `spin` keyframes, `animate-pulse` on splash.

## 7. Accessibility

- `aria-label` on nav, `role="tab"` + `aria-selected` on tabs.
- Contrast: white on orange-600 passes for large text; body gray-900 on gray-50 passes AAA.
- Touch targets ≥ 40px (`py-2.5/py-3`).
