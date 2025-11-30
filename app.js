// Entry point: wires modules together, boots the frontend.
// Keep this file minimal — it composes concrete implementations and starts the UI.

import { LibraryService } from './soruces/architecture/LibraryService.js';
import { LocalStorageAdapter } from './soruces/architecture/StorageLibrary.js';
import { FakeStripe } from './soruces/architecture/LibraryPayment.js';
import { ConsoleNotifier } from './soruces/architecture/Notification.js';
import { Frontend } from './soruces/front/Frontend.js';

const STORAGE_KEY = 'LIB_DATA_V1';

// concrete adapters
const storage = new LocalStorageAdapter(STORAGE_KEY);
const payment = new FakeStripe();
const notifier = new ConsoleNotifier();

// domain service using the adapters
const library = new LibraryService({ storage, payment, notifier });

// bootstrap: load persisted state (if any), then initialize UI
await library.restore(); // restore returns a resolved promise (safe in modern browsers)
Frontend.init({ library, storage, notifier });
