# Refactor Rationale — Library App

## Summary

The original implementation combined **domain logic**, **UI rendering**, **persistence**, and **infrastructure services** within a single `Library` object. This violated the **Single Responsibility Principle (SRP)** because methods mixed validation, business rules, storage, and DOM updates. Even minor changes risked affecting unrelated functionality, making maintenance difficult.

## Responsibilities Moved (SRP)

In the refactor, responsibilities were separated into dedicated classes:

- **Repositories** (`BookRepository` and `MemberRepository`) now handle only data storage and retrieval.  
- **LibraryService** focuses strictly on **business rules**: fee calculation, checkout policies, membership registration, and logging.  
- **NotificationService** and **PaymentService** abstract infrastructure operations, removing side effects from the domain layer.  
- **UIManager** handles all DOM updates, keeping the presentation layer independent of business logic.

## Extension Points (OCP)

This design supports the **Open/Closed Principle (OCP)**:

- `LibraryService` depends only on abstract interfaces (`notifier` and `paymentProcessor`), allowing new implementations—such as Stripe, PayPal, or a different email provider—to be added **without modifying LibraryService**.  
- Repositories can be replaced with API-based persistence layers without touching domain logic.

## Benefits

By introducing clear extension points and isolating responsibilities, the system is now:

- Maintainable  
- Testable  
- Extensible  

New services or features can be added safely, ensuring the core library logic remains stable while adapting to future requirements.

