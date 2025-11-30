# LibraryApp Refactor: Applying SRP, OCP, and DIP

## Rationale

The original LibraryApp violated the Single Responsibility Principle by placing every concern—domain logic, UI rendering, storage, notifications, and payments—inside a single “god object.” This made the code tightly coupled, hard to extend, and difficult to test.

My refactor separates these responsibilities into **distinct files and modules**:

- **BookRepo.js** and **MemberRepo.js**: handle persistence of books and members  
- **Storage.js (LocalStorageAdapter)**: the only class that interacts with localStorage  
- **LibraryService.js**: contains domain rules and business logic only  
- **NotificationPort.js** and **PaymentPort.js**: abstractions for external services  
- **FeePolicy.js**: encapsulates fee calculation logic, making rules pluggable  
- **app.js**: serves as the application layer, wiring DOM events to the service  
- **index.html**: loads each module separately, ensuring clear boundaries  

### Principles Applied

- **SRP**: Each file has one clear responsibility. For example, `LibraryService` no longer touches the DOM or storage.  
- **OCP**: Fee calculation is extracted into `FeePolicy`. New fee rules can be added without modifying `LibraryService`.  
- **DIP**: `LibraryService` depends on injected abstractions (`Notifier`, `PaymentProvider`, `FeePolicy`) rather than concrete implementations.  

### Benefits

- Modular design with files that can be swapped or extended independently  
- Easier to test — domain logic can be tested without UI or storage  
- Extensible — new storage backends, fee policies, or notification methods can be added without changing core logic  
- Clearer separation of concerns, aligned with SOLID and GRASP principles (Pure Fabrication, Indirection, Controller)  
