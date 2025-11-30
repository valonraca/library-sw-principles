export default class LibraryService {
  constructor({ store, paymentProvider, notifier }) {
    this.store = store;
    this.paymentProvider = paymentProvider;
    this.notifier = notifier;

    this.books = [];   // [{id, title, author, available}]
    this.members = []; // [{id, name, email, fees}]
    this.log = [];
  }

  init() {
    const data = this.store.load();
    this.books = data.books || [];
    this.members = data.members || [];
    this._log(`Loaded ${this.books.length} books & ${this.members.length} members.`);
  }

  // Read-only snapshot for UI
  getSnapshot() {
    return {
      books: [...this.books],
      members: [...this.members],
      log: [...this.log]
    };
  }

  addBook(id, title, author) {
    if (!id || !title) {
      throw new Error('Book ID and title are required.');
    }

    const existing = this.books.find(b => b.id === id);
    if (existing) {
      throw new Error('Book with this ID already exists.');
    }

    this.books.push({ id, title, author: author || 'Unknown', available: true });
    this._log(`Book added: ${title}`);
    this._persist();
  }

  registerMember(id, name, email) {
    if (!id || !name || !email) {
      throw new Error('Member ID, name and email are required.');
    }
    if (!email.includes('@')) {
      throw new Error('Invalid email address.');
    }

    const existing = this.members.find(m => m.id === id);
    if (existing) {
      throw new Error('Member with this ID already exists.');
    }

    const member = { id, name, email, fees: 0 };
    this.members.push(member);
    this._log(`Member registered: ${name}`);

    // OCP: notifier is injected, can be swapped without touching this class
    this.notifier?.send(
      member.email,
      'Welcome to the Library',
      `Hi ${member.name}, your member id is ${member.id}.`
    );

    this._persist();
  }

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const book = this.books.find(b => b.id === bookId);
    if (!book) throw new Error('Book not found.');

    const member = this.members.find(m => m.id === memberId);
    if (!member) throw new Error('Member not found.');

    if (!book.available) {
      throw new Error('Book is already checked out.');
    }

    // Simple “policy” rule: fee after 14 days
    let fee = 0;
    if (days > 14) {
      fee = (days - 14) * 0.5;
    }

    if (fee > 0 && this.paymentProvider) {
      const res = this.paymentProvider.charge(fee, card);
      if (!res || !res.ok) {
        throw new Error('Payment failed.');
      }
      member.fees += fee;
    }

    book.available = false;

    this._log(
      `Checked out "${book.title}" to ${member.name} for ${days} days (fee=$${fee}).`
    );

    this.notifier?.send(
      member.email,
      'Book checkout',
      `You borrowed "${book.title}". Fee: $${fee}`
    );

    this._persist();
  }

  search(term) {
    const t = term.trim().toLowerCase();
    if (!t) {
      this._log('Search cleared.');
      return [...this.books];
    }

    const results = this.books.filter(
      (b) =>
        b.title.toLowerCase().includes(t) ||
        b.author.toLowerCase().includes(t)
    );

    this._log(`Search "${term}" → ${results.length} results.`);
    return results;
  }

  // --- internal helpers (no DOM, no alert) ---

  _persist() {
    this.store.save({ books: this.books, members: this.members });
  }

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log('[LibraryService]', msg);
  }
}

