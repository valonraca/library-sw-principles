Rationale

The original Library object violated the Single Responsibility Principle by combining domain rules, persistence, UI rendering, alerts, email notifications, payment processing, logging, and event wiring inside one module. This “God Object” made the system hard to test, hard to extend, and impossible to reuse in another environment. My refactor addresses this by separating concerns into clear, single-purpose components.

First, I extracted a LibraryService that contains only pure domain rules such as validation, fee calculation, membership operations, and checkout logic. This service does not know anything about the DOM, alerts, or localStorage. It simply receives abstractions via its constructor and performs its logic. This satisfies SRP because domain behavior now lives in a dedicated class with one responsibility: enforcing library policies.

Second, I introduced OCP-friendly extension points by defining the PaymentPort and NotifierPort interfaces. The domain depends on these interfaces instead of concrete implementations. Concrete adapters (FakeStripe, ConsoleMailer) implement the ports and can be swapped without modifying LibraryService. If I want to replace FakeStripe with PayPal or switch to a real email provider, the change happens only in the wiring layer, not in the domain. This fulfills the Open/Closed Principle because the core logic is closed for modification but open for extension through new adapters.

Third, I separated persistence into BookRepo and MemberRepo. These repositories handle loading and saving data to localStorage, allowing LibraryService to remain storage-agnostic. The UI layer (rendering and event listeners) now exists independently and communicates with the domain through minimal event handlers.

Together, these changes produce a clean architecture where domain rules are isolated, infrastructure dependencies are injected through interfaces, and swapping providers or persistence mechanisms requires no changes to the core logic. The application remains fully functional in the browser while becoming significantly more maintainable, testable, and extensible.

