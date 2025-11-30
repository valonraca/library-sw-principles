Rationale (SRP & OCP Refactor)

I applied minimal refactoring to improve the Single Responsibility Principle (SRP) and the Open/Closed Principle (OCP). First, I extracted a small BookRepo class to handle all localStorage operations. Previously, the Library object was responsible for domain logic, persistence, UI rendering, and notifications, making it a “God object.” Moving storage to BookRepo ensures Library now handles only domain rules.

Second, I introduced two OCP extension points: a paymentProvider and notifier. The original code contained hard-coded payment and email logic inside Library, so switching to PayPal, Stripe, SMS, or other services would require editing Library directly. With dependency injection (paymentProvider and notifier passed into the constructor), Library becomes open to extension but closed to modification. New providers can be added without changing Library’s code.

These small changes remove tight coupling, reduce responsibilities, and make the system more maintainable and testable while keeping the overall project structure intact.