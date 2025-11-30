// ===== Storage + Repository Layer =====

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


// ===== Domain Layer (SRP/OCP) =====

class LibraryService {
  constructor(bookRepo, memberRepo, paymentProvider, notifier, logger) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.paymentProvider = paymentProvider;
    this.notifier = notifier;
    this.logger = logger;
  }

  load() {
    this.books = this.bookRepo.getAll();
    this.members = this.memberRepo.getAll();
    this.logger("Loaded data from repos");
  }

  addBook(id, title, author) {
    if (!id || !title) {
      throw new Error("Missing fields");
    }

    const books = this.bookRepo.getAll();
    books.push({ id, title, author, available: true });
    this.bookRepo.saveAll(books);

    this.logger(`Book added: ${title}`);
    return books;
  }

  registerMember(id, name, email) {
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email");
    }

    const members = this.memberRepo.getAll();
    members.push({ id, name, email, fees: 0 });
    this.memberRepo.saveAll(members);

    this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
    this.logger(`Member registered: ${name}`);

    return members;
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
      const books = this.bookRepo.getAll();
      const members = this.memberRepo.getAll();

      const b = books.find(x => x.id === bookId);
      const m = members.find(x => x.id === memberId);

      if (!b) throw new Error("Book not found");
      if (!m) throw new Error("Member not found");
      if (!b.available) throw new Error("Book already checked out");

      let fee = 0;
      if (days > 14) fee = (days - 14) * 0.5;

      if (fee > 0) {
        const res = this.paymentProvider.charge(fee, card);
        if (!res.ok) throw new Error("Payment failed");

        m.fees += fee;
      }

      b.available = false;

      this.bookRepo.saveAll(books);
      this.memberRepo.saveAll(members);

      this.notifier.send(m.email, "Checkout", `You borrowed ${b.title}. Fee: $${fee}`);
      this.logger(`Checked out ${b.title} to ${m.name}`);

      return { books, member: m };
  }

  search(term) {
    const t = term.trim().toLowerCase();
    const books = this.bookRepo.getAll();
    return books.filter(b =>
      b.title.toLowerCase().includes(t) ||
      b.author.toLowerCase().includes(t)
    );
  }
}

// ===== UI Layer (DOM only, no business rules) =====

const uiLog = [];

function uiLogger(msg) {
  const stamp = new Date().toLocaleTimeString();
  const entry = `${stamp} — ${msg}`;
  uiLog.push(entry);
  if (uiLog.length > 50) uiLog.shift();
  console.log('[LOG]', msg);
}

function renderInventory(books, sel) {
  const el = document.querySelector(sel);
  if (!el) return;

  el.innerHTML =
    `<h3>Inventory</h3>` +
    `<ul>` +
    books
      .map(
        (b) =>
          `<li><strong>${
            b.available
              ? '<span class="ok">✓</span>'
              : '<span class="no">✗</span>'
          }</strong> ${b.id}: ${b.title} — ${b.author}</li>`
      )
      .join('') +
    `</ul>` +
    `<div class="muted">${uiLog.slice(-3).join('<br/>')}</div>`;
}

function renderMember(member, sel) {
  const el = document.querySelector(sel);
  if (!el) return;

  if (!member) {
    el.innerHTML = '<em>No member selected.</em>';
  } else {
    el.innerHTML = `<h3>${member.name}</h3><p>${member.email}</p><p>Fees: $${member.fees}</p>`;
  }
}


/*
// --- Minimal wiring (STILL tightly coupled) ---
(function bootstrap(){
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

*/

// --- New wiring using LibraryService (no DOM in domain) ---
(function bootstrap() {
  const storage = new LocalStorageLibraryStorage();
  const bookRepo = new LocalStorageBookRepo(storage);
  const memberRepo = new LocalStorageMemberRepo(storage);

  // Adapters for payment + notifier (OCP: easy to swap later)
  const paymentProvider = {
    charge(amount, card) {
      console.log(`[FakeStripe] Charging $${amount} to ${card}`);
      return { ok: true, txn: Math.random().toString(36).slice(2) };
    }
  };

  const notifier = {
    send(to, subject, body) {
      console.log(`[Email] to=${to} subject=${subject} body=${body}`);
      return true;
    }
  };

  const service = new LibraryService(
    bookRepo,
    memberRepo,
    paymentProvider,
    notifier,
    uiLogger
  );

  // initial load + first render
  service.load();
  renderInventory(bookRepo.getAll(), '#app');

  const $ = sel => document.querySelector(sel);

  $('#add').onclick = () => {
    try {
      service.addBook($('#id').value, $('#title').value, $('#author').value);
      renderInventory(bookRepo.getAll(), '#app');
    } catch (e) {
      alert(e.message);
    }
  };

  $('#reg').onclick = () => {
    try {
      service.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
      renderInventory(bookRepo.getAll(), '#app');
    } catch (e) {
      alert(e.message);
    }
  };

  $('#checkout').onclick = () => {
    try {
      const result = service.checkoutBook(
        $('#bookId').value,
        $('#memberId').value
      );
      renderInventory(bookRepo.getAll(), '#app');
      renderMember(result.member, '#member');
    } catch (e) {
      alert(e.message);
    }
  };

  $('#search').oninput = e => {
    const results = service.search(e.target.value);
    // show only search results in inventory
    renderInventory(results, '#app');
  };

  $('#seed').onclick = () => {
    try {
      if (bookRepo.getAll().length === 0) {
        service.addBook('b1', 'Clean Code', 'Robert C. Martin');
        service.addBook('b2', 'Design Patterns', 'GoF');
      }
      if (memberRepo.getAll().length === 0) {
        service.registerMember('m1', 'Ada', 'ada@example.com');
        service.registerMember('m2', 'Linus', 'linus@example.com');
      }
      alert('Seeded.');
      renderInventory(bookRepo.getAll(), '#app');
    } catch (e) {
      alert(e.message);
    }
  };

  $('#reset').onclick = () => {
    storage.reset();
    location.reload();
  };
})();

