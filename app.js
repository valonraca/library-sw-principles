import LibraryService from './src/domain/LibraryService.js';
import LocalStorageLibraryStore from './src/infra/LocalStorageLibraryStore.js';
import FakeStripePaymentProvider from './src/infra/FakeStripePaymentProvider.js';
import ConsoleEmailNotifier from './src/infra/ConsoleEmailNotifier.js';
import LibraryUI from './src/ui/LibraryUI.js';

const service = new LibraryService({
  store: new LocalStorageLibraryStore('LIB_DATA'),
  paymentProvider: new FakeStripePaymentProvider(),
  notifier: new ConsoleEmailNotifier()
});

const ui = new LibraryUI(service, {
  inventorySel: '#app',
  memberSel: '#member'
});

ui.init();

// Optional: for debugging in the console
window.libraryService = service;
