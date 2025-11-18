## Pascal's Rationale

### SRP: Clear Responsibilities
- Split the former “god” `Library` object into `LibraryService` (domain rules only) and `LibraryUI` (DOM wiring, inputs, rendering, alerts).
- Introduced adapters—`LocalStorageBookRepo`, `LocalStorageMemberRepo`, `LocalStorageGateway`—so persistence happens outside the domain layer.
- Result: policy changes no longer require touching UI or storage code; each class does one job.

### OCP: Extension Points
- `LibraryService` depends on narrow ports (`paymentProvider.charge`, `notifier.send`, repo load/save methods) injected via the `createService` bootstrap in `app.js`.
- Concrete adapters (`FakePaymentProvider`, `ConsoleNotifier`, `LocalStorageBookRepo`, `LocalStorageMemberRepo`) live only in the wiring layer, keeping the domain closed for modification yet open to new implementations.

### Swapping Providers
Adding a real payment provider—or notifier—is just an injection change:

```
const paymentProvider = new RealStripeProvider(realStripeClient);
const notifier = new PostmarkNotifier(apiKey);

const service = new LibraryService({
  bookRepo,
  memberRepo,
  paymentProvider,
  notifier
});
```

`LibraryService.checkoutBook` still calls `this.paymentProvider.charge` and `this.notifier.send` without knowing about the concrete classes, so no domain changes are needed. The same swap-friendly approach applies to storage backends.

### Testing
- Open `index.html` in a browser, then run plain test functions from the console: `testAddBook()`, `testRegisterMember()`, `testCheckoutBook()`.
- Each test creates isolated `LibraryService` instances with in-memory repos and stubbed adapters, verifying domain logic without touching the UI or localStorage.