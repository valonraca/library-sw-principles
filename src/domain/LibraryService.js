export default class LibraryService {
  constructor({ store, paymentProvider, notifier }) {
    this.store = store;
    this.paymentProvider = paymentProvider;
    this.notifier = notifier;

    this.books = [];
    this.members = [];
    this.log = [];
  }

  init() {
    const data = this.store.load();
    this.books = data.books || [];
    this.members = data.members || [];
    this._log(`Loaded ${this.books.length} books & ${this.members.length} members.`);
  }

  // --- Queries ---
  getSnapshot() {
    return {
      books: [...this.books],
      members: [...this.members],
      log: [...this.log]
    };
  }

  getMemberById(id) {
    return this.members.find(m => m.id === id) || null;
  }

  findBooks(term) {
    const q = (term || '').toLowerCase();
    if (!q) return this.getSnapshot().books;
    return this.books.filter(b =>
      b.id.toLowerCase().includes(q) ||
      b.title.toLowerCase().includes(q) ||
      (b.author || '').toLowerCase().includes(q)
    );
  }

  // --- Commands ---
  addBook(id, title, author) {
    if (!id || !title) return { ok: false, error: 'Missing fields' };
    if (this.books.some(b => b.id === id))
      return { ok: false, error: 'Book exists' };

    this.books.push({ id, title, author, available: true });
    this._persist();
    this._log(`Book added: ${title}`);
    return { ok: true };
  }

  registerMember(id, name, email) {
    if (!id || !name) return { ok: false, error: 'Missing fields' };
    if (!email.includes('@')) return { ok: false, error: 'Invalid email' };
    if (this.members.some(m => m.id === id))
      return { ok: false, error: 'Member exists' };

    this.members.push({ id, name, email, fees: 0 });
    this._persist();
    this._log(`Member registered: ${name}`);
    this.notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);

    return { ok: true };
  }

  checkoutBook(bookId, memberId, days = 21, card = '4111') {
    const b = this.books.find(x => x.id === bookId);
    const m = this.members.find(x => x.id === memberId);

    if (!b) return { ok: false, error: 'Book not found' };
    if (!m) return { ok: false, error: 'Member not found' };
    if (!b.available) return { ok: false, error: 'Not available' };

    const fee = days > 14 ? (days - 14) * 0.5 : 0;
    const pay = this.paymentProvider.charge(fee, card);

    if (!pay.ok) return { ok: false, error: 'Payment failed' };

    b.available = false;
    m.fees += fee;

    this._persist();
    this._log(`Checked out ${b.title} to ${m.name} (fee $${fee})`);

    return { ok: true, fee, txn: pay.txn, memberId: m.id };
  }

  _persist() {
    this.store.save({ books: this.books, members: this.members });
  }

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    console.log('[LOG]', msg);
  }
}
