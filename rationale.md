Rationale for Refactored Library App

Before refactoring, the original Library object violated the Single Responsibility Principle (SRP) by combining multiple unrelated responsibilities: domain logic (adding books, registering members, checkout and fee calculation), persistence (localStorage), UI rendering (DOM), and infrastructure (payment and email). It also violated the Open/Closed Principle (OCP) because payment and notification logic were hard-coded, requiring modification of domain methods whenever a new provider was needed.

SRP Fix:
I extracted a dedicated LibraryService class containing only domain operations: addBook, registerMember, checkoutBook, and search. It knows nothing about the DOM, alerts, or storage mechanisms. All persistence logic was moved into BookRepo and MemberRepo, which handle loading and saving lists to localStorage. UI rendering and event handling were separated into a UI module. This ensures that domain logic is isolated, testable, and deterministic, while the UI layer handles browser-specific interactions.

OCP Fix:
Instead of hard-coding payment and email logic, the service now accepts injected objects (payments and notifier) that implement a simple interface (.charge() and .send()). This allows swapping providers without modifying LibraryService. For example, replacing the fake Stripe or email service requires only changes in the composition root wiring.

Benefits:

Domain rules run without touching the DOM.

UI updates are centralized and modular.

Payment or notifier providers can be swapped easily without touching domain code.

The app’s core logic is easier to maintain, test, and extend.

Result:
The app now respects SRP and OCP: responsibilities are clearly separated, and the system is open for extension but closed for modification, meeting the assignment’s refactoring goals while retaining all functionality in the browser.