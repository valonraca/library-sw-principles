class LocalStorageLibraryStorage {
  constructor(storageKey = 'LIB_DATA') {
    this.storageKey = storageKey;
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    } catch (e) {
      console.error('Failed to parse storage', e);
      return {};
    }
  }

  save(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  reset() {
    localStorage.removeItem(this.storageKey);
  }
}

class LocalStorageBookRepo {
  constructor(storage) {
    this.storage = storage;
  }

  getAll() {
    const data = this.storage.load();
    return data.books || [];
  }

  saveAll(books) {
    const data = this.storage.load();
    data.books = books;
    this.storage.save(data);
  }
}

class LocalStorageMemberRepo {
  constructor(storage) {
    this.storage = storage;
  }

  getAll() {
    const data = this.storage.load();
    return data.members || [];
  }

  saveAll(members) {
    const data = this.storage.load();
    data.members = members;
    this.storage.save(data);
  }
}

const paymentPort = {
  charge(amount, card) {
    console.log("[Payment] charging", amount, "to card", card);
    return { ok: true };
  }
};

const notifierPort = {
  send(to, subject, body) {
    console.log("[Email]", to, subject, body);
    return true;
  }
};

const loggerPort = {
  log(msg) {
    const stamp = new Date().toLocaleTimeString();
    console.log("[LOG]", `${stamp} — ${msg}`);
  }
};



class LibraryService {
  constructor({ bookRepo, memberRepo, payment, notifier, logger }) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.payment = payment;
    this.notifier = notifier;
    this.logger = logger || { log: () => {} };
  }

  addBook(id, title, author) {
    if (!id || !title || !author) {
      return { ok: false, error: "All fields are required." };
    }

    const books = this.bookRepo.getAll();
    if (books.some(b => b.id === id)) {
      return { ok: false, error: "Book ID already exists." };
    }

    books.push({ id, title, author, available: true });
    this.bookRepo.saveAll(books);
    this.logger.log(`Book added: ${title}`);

    return { ok: true };
  }

  registerMember(id, name, email) {
    if (!id || !name || !email) {
      return { ok: false, error: "All fields are required." };
    }

    if (!email.includes("@")) {
      return { ok: false, error: "Invalid email." };
    }

    const members = this.memberRepo.getAll();
    if (members.some(m => m.id === id)) {
      return { ok: false, error: "Member ID already exists." };
    }

    members.push({ id, name, email, fees: 0 });
    this.memberRepo.saveAll(members);
    this.logger.log(`Member registered: ${name}`);
    this.notifier.send(email, "Welcome!", `Hello ${name}, your ID is ${id}.`);

    return { ok: true };
  }

  checkoutBook(bookId, memberId, days = 14, card = "4111-1111") {
    const books = this.bookRepo.getAll();
    const members = this.memberRepo.getAll();

    const book = books.find(b => b.id === bookId);
    const member = members.find(m => m.id === memberId);

    if (!book) return { ok: false, error: "Book not found." };
    if (!member) return { ok: false, error: "Member not found." };
    if (!book.available) return { ok: false, error: "Book already borrowed." };

    let fee = 0;
    if (days > 14) {
      fee = (days - 14) * 0.5;
      const result = this.payment.charge(fee, card);
      if (!result.ok) return { ok: false, error: "Payment failed." };
      member.fees += fee;
    }

    book.available = false;
    this.bookRepo.saveAll(books);
    this.memberRepo.saveAll(members);

    this.logger.log(`Checkout: ${book.title} -> ${member.name}, fee: ${fee}`);
    this.notifier.send(member.email, "Checkout", `Borrowed ${book.title}`);

    return { ok: true, fee };
  }

  search(term) {
    const t = term.trim().toLowerCase();
    const books = this.bookRepo.getAll();
    return books.filter(
      b =>
        b.title.toLowerCase().includes(t) ||
        b.author.toLowerCase().includes(t) ||
        b.id.toLowerCase().includes(t)
    );
  }
}




const Library = {
   
  _storage: new LocalStorageLibraryStorage(),
  _bookRepo: null,
  _memberRepo: null,
  _service: null,

  books: [], // [{id, title, author, available}]
  members: [], // [{id, name, email, fees}]
  log: [],

  // Hard-coded concrete services (tight coupling)
  paymentProvider: {
    charge(amount, card) {
      console.log(`[FakeStripe] Charging $${amount} to ${card}`);
      return { ok: true, txn: Math.random().toString(36).slice(2) };
    }
  },
  mailer: {
    send(to, subject, body) {
      console.log(`[Email] to=${to} subject=${subject} body=${body}`);
      return true;
    }
  },

  // Persistence mixed with domain (uses localStorage to keep it simple)
  load() {
    try {
      const data = JSON.parse(localStorage.getItem('LIB_DATA') || '{}');
      this.books = data.books || [];
      this.members = data.members || [];
      this._log(`Loaded ${this.books.length} books & ${this.members.length} members from localStorage.`);
    } catch (e) {
      this._log('Load failed. Resetting.');
      this.books = []; this.members = [];
    }
    this.renderInventory('#app');
  },
  save() {
    localStorage.setItem('LIB_DATA', JSON.stringify({ books: this.books, members: this.members }));
    this._log('Saved data to localStorage.');
  },

  // Domain operations (validation + policies + I/O + UI side-effects all jumbled)
  addBook(id, title, author) {
    if (!id || !title) { alert('Missing fields'); return; }
    this.books.push({ id, title, author, available: true });
    this._log(`Book added: ${title}`);
    this.save();
    this.renderInventory('#app');
  },
  registerMember(id, name, email) {
    if (!email || email.indexOf('@') < 0) { alert('Invalid email'); return; }
    this.members.push({ id, name, email, fees: 0 });
    this._log(`Member registered: ${name}`);
    this.mailer.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
    this.save();
  },
  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const b = this.books.find(x => x.id === bookId);
    const m = this.members.find(x => x.id === memberId);
    if (!b) return alert('Book not found');
    if (!m) return alert('Member not found');
    if (!b.available) return alert('Book already checked out');

    let fee = 0; // Nonsense rule baked in here (policy + payment together)
    if (days > 14) fee = (days - 14) * 0.5;
    if (fee > 0) {
      const res = this.paymentProvider.charge(fee, card);
      if (!res.ok) return alert('Payment failed');
      m.fees += fee; // double-duty meaning as outstanding + history
    }
    b.available = false;
    this._log(`Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee}).`);
    this.mailer.send(m.email, 'Checkout', `You borrowed ${b.title}. Fee: $${fee}`);
    this.save();
    this.renderInventory('#app');
    this.renderMember(m.id, '#member');
  },

  search(term) {
    const t = term.trim().toLowerCase();
    const res = this.books.filter(b => b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t));
    this._log(`Search '${term}' → ${res.length} results.`);
    this.renderInventory('#app');
    return res;
  },

  // UI rendering tightly coupled
  renderInventory(sel) {
    const el = document.querySelector(sel);
    el.innerHTML = `<h3>Inventory</h3>` +
      `<ul>` + this.books.map(b => `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`).join('') + `</ul>` +
      `<div class="muted">${this.log.slice(-3).join('<br/>')}</div>`;
  },
  renderMember(memberId, sel) {
    const m = this.members.find(x => x.id === memberId);
    const el = document.querySelector(sel);
    el.innerHTML = m ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>` : '<em>No member selected.</em>';
  },

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log('[LOG]', msg);
  }
};

// --- Minimal wiring (STILL tightly coupled) ---
(function bootstrap(){

  Library._bookRepo = new LocalStorageBookRepo(Library._storage);
  Library._memberRepo = new LocalStorageMemberRepo(Library._storage);
  Library._service = new LibraryService({
    bookRepo: Library._bookRepo,
    memberRepo: Library._memberRepo,
    payment: paymentPort,
    notifier: notifierPort,
    logger: loggerPort
  });

  Library.load();

  const $ = sel => document.querySelector(sel);
  $('#add').onclick = () => Library.addBook($('#id').value, $('#title').value, $('#author').value);
  $('#reg').onclick = () => Library.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
  $('#checkout').onclick = () => Library.checkoutBook($('#bookId').value, $('#memberId').value);
  $('#search').oninput = e => Library.search(e.target.value);
  $('#seed').onclick = () => {
    if (Library.books.length === 0) {
      Library.addBook('b1', 'Clean Code', 'Robert C. Martin');
      Library.addBook('b2', 'Design Patterns', 'GoF');
    }
    if (Library.members.length === 0) {
      Library.registerMember('m1', 'Ada', 'ada@example.com');
      Library.registerMember('m2', 'Linus', 'linus@example.com');
    }
    alert('Seeded.');
  };
  $('#reset').onclick = () => { localStorage.removeItem('LIB_DATA'); location.reload(); };
})();
