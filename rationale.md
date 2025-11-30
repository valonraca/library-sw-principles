### Rationale (SRP & OCP Refactor)

In this minimal refactor, we applied two small but meaningful improvements to the Library app:

1. **Extracted Logger**  
   All logging is now handled by a separate `Logger` object. This follows the **Single Responsibility Principle (SRP)** because the Library object no longer mixes domain logic with logging. Future changes to logging format or storage can be made in `Logger` without touching Library.

2. **Introduced SimpleSearch Strategy**  
   Searching books is now delegated to `SimpleSearch`. This follows the **Open/Closed Principle (OCP)**, allowing future search strategies (e.g., fuzzy search) to be added without modifying the Library object.

These minimal changes reduce tight coupling, isolate responsibilities, and make the code more maintainable. All core functionality (add, register, checkout, search) continues to work as before.
