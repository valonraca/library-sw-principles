# LibraryApp (Broken) — Refactor Exercise

**Goal:** Apply SRP (Single Responsibility Principle) and OCP (Open/Closed Principle) to this tiny browser-only app.
You will refactor *one or two classes/modules* and submit **diffs + rationale**.

## How to Run
- Open `index.html` in a browser.
  
## What’s Intentionally Wrong (spot at least 4)
- **God Object**: `Library` handles domain rules, persistence (localStorage), UI rendering (DOM), payments, and emails.
- **Tight Coupling**: Payment and email are *hard-coded* inside `Library`.
- **UI in Domain**: Domain methods call `render*` and `alert` directly.
- **No Extension Points**: Changing payment/email requires editing `Library` (violates OCP).
- **Global Mutable State**: Single `Library` object used everywhere.

## Your Task (minimum)
1. **SRP Split**: Extract a `LibraryService` that contains only domain rules — no DOM, no `alert`, no storage.
2. **OCP Ports**: Define tiny interfaces (plain JS objects) for `notifier` and `payment` and **inject** them.
3. Storage access should happen via a `BookRepo` and `MemberRepo` abstraction (e.g., backed by localStorage).

## Deliverables
- **Git diffs** (or a `patch` file) showing your changes.
- A short **rationale** (200–400 words) explaining:
  - What responsibilities you moved and why (SRP).
  - Where/why you introduced extension points (OCP).
  - How your design allows adding a new payment provider (or notifier) **without** changing `LibraryService`.

## Acceptance Check
- Domain rules run without touching the DOM.
- Swapping `payment` or `notifier` requires changing only wiring, not domain logic.
- Basic flows still work in the browser (add/register/checkout/search).

## Nice-to-have (optional)
- Basic error objects instead of `alert`.
- Unit-ish tests using plain functions in the console.
