## Refactor Rationale (SRP & OCP)

The original `Library` object violated SRP by mixing domain rules, persistence, logging, payment, email, and DOM rendering in a single module. It also violated OCP because payment and notification logic were hard-coded inside `Library`, so adding a new provider required modifying core domain code.

I refactored this into several focused components:

- **`LibraryService`** now contains only domain rules: adding books, registering members, checking out books, and searching. It never touches the DOM, `alert`, or `localStorage`. Each method returns a simple result object (`{ ok, error, message, ... }`), so the UI decides how to present errors.
- **Persistence** is handled through a small local “database” plus two repositories: `createLocalStorageStore` owns the serialization to/from `localStorage`, while `BookRepo` and `MemberRepo` expose domain-oriented operations (`getAll`, `findById`, `add`, `update`). `LibraryService` depends only on these abstractions, not on `localStorage` directly.
- **Logging** is handled by `createLogger`, which keeps an in-memory log and exposes `getRecent` so the UI can render it. The logger is injected into the other components.

For OCP, I introduced **ports** for external services:

- `paymentProvider` with a single `charge(amount, card)` method.
- `notifier` with a single `send(to, subject, body)` method.

These are plain JavaScript objects passed into `createLibraryService` in the bootstrap wiring. `LibraryService` knows only about the interfaces, not about the concrete implementations. To add a new payment provider or notifier, we can create another object with the same shape and change only the wiring in the bootstrap code, leaving `LibraryService` unchanged.

Finally, the I/O and UI logic live entirely in the bootstrap section: it wires DOM events, calls `LibraryService`, shows `alert` messages on error, and re-renders the inventory and member panels. This keeps domain logic testable in isolation while preserving the original flows (add/register/checkout/search) in the browser.
