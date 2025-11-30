# LibraryApp (Broken) — Refactor Exercise
## Rationale

The original Library implementation violated several SOLID principles, mainly the Single Responsibility Principle (SRP) and the Open/Closed Principle (OCP). The Library object handled UI rendering, validation, storage, business logic, email notifications, and payment processing all in one place, making the code difficult to maintain and extend. By refactoring the app into smaller components—BookRepo, MemberRepo, and LibraryService—each part now has one clear responsibility, improving modularity and testability (SRP). Introducing dependency injection for the notifier and payment provider allows new implementations to be added without modifying existing core logic, ensuring the system is open for extension but closed for modification (OCP). The UI layer now delegates all business logic to the service, avoiding direct logic handling. The original code is preserved in app-original.js for comparison.

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
