(function attachLibraryService(global) {
  // Module-scoped constant so adapters can reuse the same storage key
  const STORAGE_KEY = 'LIB_DATA';

  // Lightweight wrapper that reads/writes a JSON blob from localStorage
  class LocalStorageGateway {
    constructor(storageKey = STORAGE_KEY) {
      this.key = storageKey;
    }

    read() {
      try {
        const raw = global.localStorage.getItem(this.key);
        if (!raw) return {};
        return JSON.parse(raw);
      } catch (err) {
        console.warn('[LibraryGateway] Failed to read storage. Resetting.', err);
        return {};
      }
    }

    write(data) {
      global.localStorage.setItem(this.key, JSON.stringify(data));
    }
  }

  // Repo responsible only for book persistence logic
  class LocalStorageBookRepo {
    constructor(gateway = new LocalStorageGateway()) {
      this.gateway = gateway;
    }

    loadAll() {
      const data = this.gateway.read();
      const books = data.books || [];
      return books.map(book => ({ ...book }));
    }

    saveAll(books) {
      const data = this.gateway.read();
      data.books = books.map(book => ({ ...book }));
      this.gateway.write(data);
    }
  }

  // Repo responsible only for member persistence logic
  class LocalStorageMemberRepo {
    constructor(gateway = new LocalStorageGateway()) {
      this.gateway = gateway;
    }

    loadAll() {
      const data = this.gateway.read();
      const members = data.members || [];
      return members.map(member => ({ ...member }));
    }

    saveAll(members) {
      const data = this.gateway.read();
      data.members = members.map(member => ({ ...member }));
      this.gateway.write(data);
    }
  }

  // Default notifier adapter: logs to console instead of sending real email
  class ConsoleNotifier {
    send(to, subject, body) {
      console.log(`[Email] to=${to} subject=${subject} body=${body}`);
      return true;
    }
  }

  // Default payment adapter: prints fake Stripe charges
  class FakePaymentProvider {
    charge(amount, cardNumber = '4111-1111') {
      console.log(`[FakeStripe] Charging $${amount} to ${cardNumber}`);
      return { ok: true, txn: Math.random().toString(36).slice(2) };
    }
  }

  // Core domain service containing validation & policies only
  class LibraryService {
    // Acceptance: domain rules live here only—no DOM/localStorage/alerts inside
    constructor({
      bookRepo,
      memberRepo,
      paymentProvider,
      notifier
    } = {}) {
      // Dependencies get injected so we can swap implementations in one place
      this.bookRepo = bookRepo;
      this.memberRepo = memberRepo;
      this.paymentProvider = paymentProvider || { charge: () => ({ ok: true }) };
      this.notifier = notifier || { send: () => true };
      this.books = [];
      this.members = [];
      this.log = [];
    }

    initialize() {
      // Load initial state from the repos; failures just reset to empty arrays
      this.books = this._safeLoad(() => this.bookRepo?.loadAll()) || [];
      this.members = this._safeLoad(() => this.memberRepo?.loadAll()) || [];
      this._log(`Loaded ${this.books.length} books & ${this.members.length} members.`);
      return this._success({ books: this.getBooks(), members: this.getMembers() });
    }

    getBooks() {
      // Return copies so UI code cannot change service state directly
      return this.books.map(book => ({ ...book }));
    }

    getMembers() {
      return this.members.map(member => ({ ...member }));
    }

    getMemberById(id) {
      return this.members.find(member => member.id === id) || null;
    }

    getLog() {
      return [...this.log];
    }

    addBook({ id, title, author }) {
      // Pure validation + state updates; no DOM or alerts here
      if (!id || !title) return this._error('Missing fields');
      const book = { id, title, author, available: true };
      this.books.push(book);
      this._log(`Book added: ${title}`);
      this._persist();
      return this._success({ book: { ...book } });
    }

    registerMember({ id, name, email }) {
      // Notify via injected notifier to keep policy code independent
      if (!email || email.indexOf('@') < 0) return this._error('Invalid email');
      const member = { id, name, email, fees: 0 };
      this.members.push(member);
      this._log(`Member registered: ${name}`);
      this.notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
      this._persist();
      return this._success({ member: { ...member } });
    }

    checkoutBook({ bookId, memberId, days = 21, card = '4111-1111' }) {
      const book = this.books.find(b => b.id === bookId);
      if (!book) return this._error('Book not found');

      const member = this.members.find(m => m.id === memberId);
      if (!member) return this._error('Member not found');

      if (!book.available) return this._error('Book already checked out');

      let fee = 0;
      if (days > 14) fee = (days - 14) * 0.5;

      if (fee > 0) {
        // Payment provider port lets us plug in Stripe, etc.
        const paymentResult = this.paymentProvider.charge(fee, card);
        if (!paymentResult?.ok) return this._error('Payment failed');
        member.fees += fee;
      }

      book.available = false;
      this._log(`Checked out ${book.title} to ${member.name} for ${days} days (fee=$${fee}).`);
      this.notifier.send(member.email, 'Checkout', `You borrowed ${book.title}. Fee: $${fee}`);
      this._persist();
      return this._success({ book: { ...book }, member: { ...member }, fee });
    }

    search(term = '') {
      // Searching is purely in-memory and side-effect free aside from logging
      const normalized = term.trim().toLowerCase();
      const results = this.books.filter(b => {
        return (
          b.title.toLowerCase().includes(normalized) ||
          (b.author || '').toLowerCase().includes(normalized)
        );
      }).map(book => ({ ...book }));
      this._log(`Search '${term}' → ${results.length} results.`);
      return this._success({ results });
    }

    _persist() {
      // Save both aggregates through their repos; no direct localStorage calls
      if (this.bookRepo && this.memberRepo) {
        this.bookRepo.saveAll(this.books);
        this.memberRepo.saveAll(this.members);
        this._log('Saved data to storage.');
      }
    }

    // Utility: wraps repo calls so bad JSON never crashes the app
    _safeLoad(fn) {
      try {
        return typeof fn === 'function' ? fn() : [];
      } catch (err) {
        this._log('Load failed. Resetting.');
        return [];
      }
    }

    // Centralized logger so UI can read recent entries
    _log(message) {
      const stamp = new Date().toLocaleTimeString();
      this.log.push(`${stamp} — ${message}`);
      if (this.log.length > 50) this.log.shift();
      console.log('[LibraryLog]', message);
    }

    // Acceptance nice-to-have: return structured success objects instead of alerts
    _success(data = {}) {
      return { ok: true, data };
    }

    _error(message) {
      return { ok: false, error: message };
    }
  }

  global.LibraryAdapters = {
    LocalStorageGateway,
    LocalStorageBookRepo,
    LocalStorageMemberRepo,
    ConsoleNotifier,
    FakePaymentProvider
  };
  global.LibraryService = LibraryService;
})(window);

