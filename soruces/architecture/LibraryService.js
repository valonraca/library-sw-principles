// LibraryService: pure domain logic, no DOM or console side-effects here.
// Accepts adapters via constructor (storage, payment, notifier).

export class LibraryService {
  constructor({ storage = null, payment = null, notifier = null } = {}) {
    this.storage = storage;
    this.payment = payment;
    this.notifier = notifier;
    this.books = [];
    this.members = [];
    this.log = [];
  }

  // --- persistence helpers ---
  async restore() {
    if (!this.storage) return this._snapshot();
    const data = await this.storage.load();
    if (data) {
      this.books = data.books || [];
      this.members = data.members || [];
      this.log = data.log || [];
    }
    return this._snapshot();
  }

  async persist() {
    if (!this.storage) return;
    await this.storage.save(this._snapshot());
  }

  _snapshot() {
    // deep clone minimal structure
    return {
      books: JSON.parse(JSON.stringify(this.books || [])),
      members: JSON.parse(JSON.stringify(this.members || [])),
      log: JSON.parse(JSON.stringify(this.log || []))
    };
  }

  // --- domain ops ---
  addBook(id, title, author) {
    if (!id) id = `b${Date.now().toString(36).slice(-6)}`;
    const exists = this.books.find(b => b.id === id);
    if (exists) throw new Error('Book id already exists');
    const book = { id, title: title || 'Untitled', author: author || 'Unknown', available: true, borrowerId: null };
    this.books.push(book);
    this.log.push({ when: new Date().toISOString(), action: 'addBook', id, title });
    this.persist();
    return book;
  }

  registerMember(id, name, email) {
    if (!id) id = `m${Date.now().toString(36).slice(-6)}`;
    const exists = this.members.find(m => m.id === id);
    if (exists) throw new Error('Member id already exists');
    const member = { id, name: name || 'NoName', email: email || '', fees: 0 };
    this.members.push(member);
    this.log.push({ when: new Date().toISOString(), action: 'registerMember', id, name });
    this.persist();
    return member;
  }

  findBook(id) {
    return this.books.find(b => b.id === id) || null;
  }

  findMember(id) {
    return this.members.find(m => m.id === id) || null;
  }

  search(q) {
    if (!q || !q.trim()) return this._snapshot();
    const term = q.toLowerCase();
    const books = this.books.filter(b => (b.title + ' ' + b.author + ' ' + b.id).toLowerCase().includes(term));
    const members = this.members.filter(m => (m.name + ' ' + m.email + ' ' + m.id).toLowerCase().includes(term));
    return { books: JSON.parse(JSON.stringify(books)), members: JSON.parse(JSON.stringify(members)) };
  }

  async checkout(bookId, memberId, card = 'card-placeholder') {
    const book = this.findBook(bookId);
    if (!book) throw new Error('Book not found');
    if (!book.available) throw new Error('Book not available');

    const member = this.findMember(memberId);
    if (!member) throw new Error('Member not found');

    // charge a small fee (example)
    const amount = 1.50; // USD
    let paymentResult = { ok: true, txn: null };
    if (this.payment && typeof this.payment.charge === 'function') {
      paymentResult = await this.payment.charge(amount, card);
    }

    if (!paymentResult || !paymentResult.ok) {
      this.log.push({ when: new Date().toISOString(), action: 'checkout_failed_payment', bookId, memberId });
      await this.persist();
      throw new Error('Payment failed');
    }

    book.available = false;
    book.borrowerId = member.id;
    member.fees = (member.fees || 0) + amount;
    this.log.push({ when: new Date().toISOString(), action: 'checkout', bookId, memberId, txn: paymentResult.txn });

    // notify asynchronously but don't block
    if (this.notifier && typeof this.notifier.send === 'function') {
      try {
        this.notifier.send(member.email, 'Checked out', `You borrowed "${book.title}" (id: ${book.id}). Txn: ${paymentResult.txn}`);
      } catch (e) {
        // notifier errors should not break domain state
        this.log.push({ when: new Date().toISOString(), action: 'notify_failed', error: String(e) });
      }
    }

    await this.persist();
    return { book: JSON.parse(JSON.stringify(book)), member: JSON.parse(JSON.stringify(member)), txn: paymentResult.txn };
  }

  async returnBook(bookId) {
    const book = this.findBook(bookId);
    if (!book) throw new Error('Book not found');
    if (book.available) throw new Error('Book is not checked out');

    const member = this.findMember(book.borrowerId) || null;
    book.available = true;
    const previousBorrowerId = book.borrowerId;
    book.borrowerId = null;
    this.log.push({ when: new Date().toISOString(), action: 'return', bookId, returnedBy: previousBorrowerId });

    if (member && this.notifier && typeof this.notifier.send === 'function') {
      try {
        this.notifier.send(member.email, 'Returned', `You returned "${book.title}" (id: ${book.id}).`);
      } catch (e) {
        this.log.push({ when: new Date().toISOString(), action: 'notify_failed', error: String(e) });
      }
    }

    await this.persist();
    return JSON.parse(JSON.stringify(book));
  }

  // helper to seed sample data if empty
  seedIfEmpty() {
    if (this.books.length === 0) {
      this.addBook('b1', 'Clean Code', 'Robert C. Martin');
      this.addBook('b2', 'Design Patterns', 'Gamma, Helm, Johnson, Vlissides');
      this.addBook('b3', 'You Don\'t Know JS', 'Kyle Simpson');
    }
    if (this.members.length === 0) {
      this.registerMember('m1', 'Ada Lovelace', 'ada@example.com');
      this.registerMember('m2', 'Grace Hopper', 'grace@example.com');
    }
  }
}
