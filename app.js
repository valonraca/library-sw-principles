// =====================
// Domain Models
// =====================

class BookRecord {
  constructor(id, title, author, available = true) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.available = available;
  }
}

class Patron {
  constructor(id, fullName, email, fees = 0) {
    this.id = id;
    this.fullName = fullName;
    this.email = email;
    this.fees = fees;
  }
}

// =====================
// Storage Repositories
//  (separate responsibility: localStorage only)
// =====================

class LocalBookStorage {
  constructor(storageKey = 'LIB_BOOKS') {
    this.storageKey = storageKey;
  }

  fetchAll() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const data = raw ? JSON.parse(raw) : [];
      return data.map(b => new BookRecord(b.id, b.title, b.author, b.available));
    } catch (err) {
      console.error('[BookStorage] Failed to load books', err);
      return [];
    }
  }

  persistAll(books) {
    localStorage.setItem(this.storageKey, JSON.stringify(books));
  }
}

class LocalPatronStorage {
  constructor(storageKey = 'LIB_MEMBERS') {
    this.storageKey = storageKey;
  }

  fetchAll() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const data = raw ? JSON.parse(raw) : [];
      return data.map(m => new Patron(m.id, m.fullName ?? m.name, m.email, m.fees));
    } catch (err) {
      console.error('[PatronStorage] Failed to load patrons', err);
      return [];
    }
  }

  persistAll(patrons) {
    localStorage.setItem(this.storageKey, JSON.stringify(patrons));
  }
}

// =====================
// Notifier + Payment (extension points for OCP)
// =====================

class ConsoleEmailNotifier {
  send(to, subject, body) {
    console.log(`[Notifier] To: ${to} | Subject: ${subject}`);
    console.log(`[Notifier] Body: ${body}`);
    return true;
  }
}

class DummyPaymentGateway {
  process(amount, cardToken) {
    if (amount > 100) {
      console.log(`[PaymentGateway] Declined amount: $${amount.toFixed(2)}`);
      return { ok: false, txnId: null };
    }

    console.log(`[PaymentGateway] Charged $${amount.toFixed(2)} to card ${cardToken}`);
    return { ok: true, txnId: Math.random().toString(36).slice(2) };
  }
}

// =====================
// Late Fee Policy (small SRP helper)
// =====================

class LateFeePolicy {
  constructor({ freeDays = 14, dailyRate = 0.5 } = {}) {
    this.freeDays = freeDays;
    this.dailyRate = dailyRate;
  }

  calculateFee(daysRequested) {
    if (daysRequested <= this.freeDays) return 0;
    const lateDays = daysRequested - this.freeDays;
    return lateDays * this.dailyRate;
  }
}

// =====================
// LibraryService (Domain logic only)
// =====================

class LibraryService {
  constructor({ bookRepo, patronRepo, notifier, paymentGateway, feePolicy }) {
    this.bookRepo = bookRepo;
    this.patronRepo = patronRepo;
    this.notifier = notifier;
    this.paymentGateway = paymentGateway;
    this.feePolicy = feePolicy;

    this.books = this.bookRepo.fetchAll();
    this.patrons = this.patronRepo.fetchAll();
  }

  reloadFromStorage() {
    this.books = this.bookRepo.fetchAll();
    this.patrons = this.patronRepo.fetchAll();
    return { bookCount: this.books.length, patronCount: this.patrons.length };
  }

  persistToStorage() {
    this.bookRepo.persistAll(this.books);
    this.patronRepo.persistAll(this.patrons);
  }

  addNewBook(id, title, author) {
    if (!id || !title || !author) {
      throw new Error('All book fields (ID, title, author) are required.');
    }
    if (this.books.some(b => b.id === id)) {
      throw new Error(`A book with ID "${id}" already exists.`);
    }

    this.books.push(new BookRecord(id, title, author, true));
    this.persistToStorage();
  }

  enrollPatron(id, fullName, email) {
    if (!email || !email.includes('@')) {
      throw new Error('Email address is not valid.');
    }
    if (this.patrons.some(p => p.id === id)) {
      throw new Error(`Patron with ID "${id}" already exists.`);
    }

    const patron = new Patron(id, fullName, email);
    this.patrons.push(patron);

    this.notifier.send(
      email,
      'Library Membership Confirmed',
      `Hi ${fullName}, your patron ID is ${id}. Welcome!`
    );

    this.persistToStorage();
  }

  borrowBook(bookId, patronId, days = 21, cardToken = '4111-1111') {
    const book = this.books.find(b => b.id === bookId);
    const patron = this.patrons.find(p => p.id === patronId);

    if (!book) throw new Error('Book not found.');
    if (!patron) throw new Error('Patron not found.');
    if (!book.available) throw new Error(`Book "${book.title}" is currently not available.`);

    const fee = this.feePolicy.calculateFee(days);

    if (fee > 0) {
      const paymentResult = this.paymentGateway.process(fee, cardToken);
      if (!paymentResult.ok) {
        throw new Error(`Payment failed for late fee of $${fee.toFixed(2)}.`);
      }
      patron.fees += fee;
    }

    book.available = false;

    this.notifier.send(
      patron.email,
      'Book Checkout Complete',
      `You borrowed "${book.title}". Applied fee: $${fee.toFixed(2)}.`
    );

    this.persistToStorage();

    return {
      bookTitle: book.title,
      patronName: patron.fullName,
      feePaid: fee
    };
  }

  searchBooks(term) {
    const cleaned = term.trim().toLowerCase();
    if (!cleaned) return this.books;

    return this.books.filter(
      b =>
        b.title.toLowerCase().includes(cleaned) ||
        b.author.toLowerCase().includes(cleaned)
    );
  }

  listBooks() {
    return this.books;
  }

  findPatronById(id) {
    return this.patrons.find(p => p.id === id);
  }
}

// =====================
// UI / DOM Wiring
// =====================

let libraryService;

const $ = sel => document.querySelector(sel);
const logEntries = [];

function renderInventory(searchTerm = '') {
  const container = $('#app');
  if (!container) return;

  const allBooks = libraryService.listBooks();
  const filtered = searchTerm
    ? libraryService.searchBooks(searchTerm)
    : allBooks;

  const bookCountEl = $('#book-count');
  if (bookCountEl) {
    bookCountEl.textContent = allBooks.length;
  }

  container.innerHTML =
    '<ul class="space-y-1 list-none p-0">' +
    filtered
      .map(
        b => `
        <li class="p-2 border-b border-gray-100 last:border-b-0">
          <strong class="${b.available ? 'ok' : 'no'}">
            ${b.available ? '✓' : '✗'}
          </strong>
          <span class="font-mono text-sm text-gray-500">${b.id}:</span>
          ${b.title} —
          <em class="text-gray-600">${b.author}</em>
        </li>`
      )
      .join('') +
    '</ul>';
}

function renderPatron(patronId, selector) {
  const container = document.querySelector(selector);
  if (!container) return;

  const p = libraryService.findPatronById(patronId);

  if (p) {
    container.innerHTML = `
      <p class="font-semibold text-gray-700">${p.fullName}</p>
      <p class="text-sm text-gray-500">${p.email}</p>
      <p class="text-sm font-bold text-red-500">
        Outstanding Fees: $${p.fees.toFixed(2)}
      </p>
    `;
  } else {
    container.innerHTML = '<em>No patron selected or found.</em>';
  }
}

function appendLog(msg) {
  const stamp = new Date().toLocaleTimeString();
  const entry = `${stamp} — ${msg}`;
  logEntries.push(entry);
  if (logEntries.length > 50) logEntries.shift();

  const logEl = $('#log-output');
  if (logEl) {
    logEl.innerHTML = logEntries.slice(-3).join('<br/>');
  }

  console.log('[AppLog]', msg);
}

function displayMessage(type, message) {
  const el = $('#status-message');
  if (el) {
    el.innerHTML = `<div class="${type}-message">${message}</div>`;
    setTimeout(() => (el.innerHTML = ''), 4000);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// =====================
// DOMContentLoaded: wire buttons to LibraryService
// =====================

document.addEventListener('DOMContentLoaded', () => {
  const addBtn = $('#add');
  const regBtn = $('#reg');
  const checkoutBtn = $('#checkout');
  const searchInput = $('#search');
  const seedBtn = $('#seed');
  const resetBtn = $('#reset');

  if (addBtn) {
    addBtn.onclick = () => {
      const id = $('#id')?.value.trim() || '';
      const title = $('#title')?.value.trim() || '';
      const author = $('#author')?.value.trim() || '';

      try {
        libraryService.addNewBook(id, title, author);
        appendLog(`Book added: ${title}`);
        displayMessage('success', `Book "${title}" added.`);
      } catch (err) {
        appendLog(`Failed to add book: ${err.message}`);
        displayMessage('error', err.message);
      } finally {
        const term = searchInput?.value.trim() || '';
        renderInventory(term);
      }
    };
  }

  if (regBtn) {
    regBtn.onclick = () => {
      const id = $('#mid')?.value.trim() || '';
      const name = $('#mname')?.value.trim() || '';
      const email = $('#memail')?.value.trim() || '';

      try {
        libraryService.enrollPatron(id, name, email);
        appendLog(`Patron enrolled: ${name}`);
        displayMessage('success', `Patron "${name}" registered and notified.`);
      } catch (err) {
        appendLog(`Patron registration failed: ${err.message}`);
        displayMessage('error', err.message);
      }
    };
  }

  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      const bookId = $('#bookId')?.value.trim() || '';
      const patronId = $('#memberId')?.value.trim() || '';
      const days = 21;
      const cardToken = '4111-1111';

      try {
        const result = libraryService.borrowBook(bookId, patronId, days, cardToken);
        appendLog(
          `Checked out "${result.bookTitle}" to ${result.patronName} (Fee: $${result.feePaid.toFixed(
            2
          )}).`
        );
        displayMessage(
          'success',
          `Checkout ok. Book: ${result.bookTitle}, Fee: $${result.feePaid.toFixed(2)}.`
        );
        renderPatron(patronId, '#member');
      } catch (err) {
        appendLog(`Checkout failed: ${err.message}`);
        displayMessage('error', err.message);
      } finally {
        const term = searchInput?.value.trim() || '';
        renderInventory(term);
      }
    };
  }

  if (searchInput) {
    searchInput.oninput = e => {
      const term = e.target.value.trim();
      appendLog(`Search executed: '${term}'`);
      renderInventory(term);
    };
  }

  if (seedBtn) {
    seedBtn.onclick = () => {
      try {
        if (libraryService.listBooks().length === 0) {
          libraryService.addNewBook('b1', 'Clean Code', 'Robert C. Martin');
          libraryService.addNewBook('b2', 'Design Patterns', 'GoF');
        }

        if (!libraryService.findPatronById('m1')) {
          libraryService.enrollPatron('m1', 'Ada', 'ada@example.com');
          libraryService.enrollPatron('m2', 'Linus', 'linus@example.com');
        }
      } catch (err) {
        // ignore duplicates during seeding
      }

      appendLog('Seeded default data.');
      displayMessage('success', 'Seed data loaded.');
      renderInventory();
      const patronId = $('#memberId')?.value || 'm1';
      renderPatron(patronId, '#member');
    };
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      localStorage.removeItem('LIB_BOOKS');
      localStorage.removeItem('LIB_MEMBERS');
      location.reload();
    };
  }

  // ---- Composition Root: create service with its dependencies ----

  const bookRepo = new LocalBookStorage();
  const patronRepo = new LocalPatronStorage();
  const notifier = new ConsoleEmailNotifier();
  const paymentGateway = new DummyPaymentGateway();
  const feePolicy = new LateFeePolicy();

  libraryService = new LibraryService({
    bookRepo,
    patronRepo,
    notifier,
    paymentGateway,
    feePolicy
  });

  const loadInfo = libraryService.reloadFromStorage();
  appendLog(
    `App started. Loaded ${loadInfo.bookCount} books and ${loadInfo.patronCount} patrons.`
  );

  renderInventory();
  const initialPatronId = $('#memberId')?.value || 'm1';
  renderPatron(initialPatronId, '#member');
});
