// ============================================
// Event Bus (Optional Observer Pattern Support)
// ============================================
const eventBus = {
  listeners: {},

  subscribe(event, handler) {
    this.listeners[event] ||= [];
    this.listeners[event].push(handler);
  },

  publish(event, payload) {
    (this.listeners[event] || []).forEach(h => h(payload));
  }
};


// ============================================
// Repositories (Persistence Layer) — SRP
// ============================================

function createBookRepo(storageKey = 'library-books') {
  const load = () => JSON.parse(localStorage.getItem(storageKey) || "[]");
  const save = books => localStorage.setItem(storageKey, JSON.stringify(books));

  return {
    getAll() { return load(); },
    add(book) {
      const books = load();
      books.push(book);
      save(books);
    },
    update(updatedBook) {
      const books = load().map(b => b.id === updatedBook.id ? updatedBook : b);
      save(books);
    }
  };
}

function createMemberRepo(storageKey = 'library-members') {
  const load = () => JSON.parse(localStorage.getItem(storageKey) || "[]");
  const save = members => localStorage.setItem(storageKey, JSON.stringify(members));

  return {
    getAll() { return load(); },
    add(member) {
      const members = load();
      members.push(member);
      save(members);
    },
    update(updatedMember) {
      const members = load().map(m => m.id === updatedMember.id ? updatedMember : m);
      save(members);
    }
  };
}


// ============================================
// Fee Policy Strategies (Strategy Pattern) — OCP
// ============================================

const flatFeePolicy = (fee = 5) => ({
  compute() {
    return fee;
  }
});

const premiumDiscountPolicy = {
  compute(member) {
    return member.email.endsWith("@premium.com") ? 0 : 5;
  }
};

// ACTIVE POLICY (you can switch)
const feePolicy = flatFeePolicy(5);
// const feePolicy = premiumDiscountPolicy;


// ============================================
// Payment Ports (DIP)
// ============================================

const fakeStripePayment = {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true, txn: Math.random().toString(36).slice(2) };
  }
};

const freeModePayment = {
  charge(amount, card) {
    console.log(`[FreeMode] Pretending to charge $${amount} to ${card}`);
    return { ok: true, txn: "FREE-MODE" };
  }
};

const useFreeMode = false;
const paymentPort = useFreeMode ? freeModePayment : fakeStripePayment;


// ============================================
// Notifier (DIP — can be replaced by Email/SMS/Slack/etc.)
// ============================================

const multiNotifier = {
  notifyCheckoutSuccess(member, book, amount, txnId) {
    alert(
      `Checkout successful!\n` +
      `Member: ${member.name}\n` +
      `Book: ${book.title}\n` +
      `Charged: $${amount}\n` +
      `Txn: ${txnId}`
    );

    console.log(
      `[Email] to=${member.email} subject="Receipt" body="Hi ${member.name}, you checked out ${book.title}. Fee: $${amount}."`
    );
  },

  notifyMemberRegistered(member) {
    console.log(
      `[Email] to=${member.email} subject="Welcome" body="Welcome ${member.name}! Your member ID is ${member.id}."`
    );
  }
};


// ============================================
// Domain Service (CORE BUSINESS LOGIC) — SRP, DIP, High Cohesion
// ============================================

function createLibraryService({ bookRepo, memberRepo, payment, notifier }) {

  function addBook(id, title, author) {
    const books = bookRepo.getAll();
    if (books.some(b => b.id === id)) throw new Error("Book ID already exists");
    bookRepo.add({ id, title, author, available: true });
  }

  function registerMember(id, name, email) {
    const members = memberRepo.getAll();
    if (members.some(m => m.id === id)) throw new Error("Member ID already exists");
    memberRepo.add({ id, name, email, fees: 0 });
  }

  function checkoutBook(bookId, memberId, card = "4111-1111") {
    const books = bookRepo.getAll();
    const members = memberRepo.getAll();

    const book = books.find(b => b.id === bookId);
    const member = members.find(m => m.id === memberId);

    if (!book || !member) throw new Error("Book or member not found");
    if (!book.available) throw new Error("Book not available");

    const amount = feePolicy.compute(member, book);
    const result = payment.charge(amount, card);
    if (!result.ok) throw new Error("Payment failed");

    book.available = false;
    member.fees += amount;

    bookRepo.update(book);
    memberRepo.update(member);

    notifier.notifyCheckoutSuccess(member, book, amount, result.txn);
  }

  function search(term) {
    const books = bookRepo.getAll();
    const t = term.trim().toLowerCase();
    if (!t) return books;

    return books.filter(b =>
      b.id.toLowerCase().includes(t) ||
      b.title.toLowerCase().includes(t) ||
      b.author.toLowerCase().includes(t)
    );
  }

  return { addBook, registerMember, checkoutBook, search };
}


// ============================================
// Instantiate Repos + Service
// ============================================

const bookRepo = createBookRepo();
const memberRepo = createMemberRepo();

const libraryService = createLibraryService({
  bookRepo,
  memberRepo,
  payment: paymentPort,
  notifier: multiNotifier
});


// ============================================
// UI Rendering (Controller Layer — GRASP Controller)
// ============================================

function inventoryTemplate(books, logs) {
  return `
    <h3>Inventory</h3>
    <ul>
      ${books.map(b => `
        <li>
          <strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong>
          ${b.id}: ${b.title} — ${b.author}
        </li>
      `).join("")}
    </ul>
    <div class="muted">${logs.slice(-3).join("<br/>")}</div>
  `;
}

const Library = {
  log: [],

  load() {
    const books = bookRepo.getAll();
    const members = memberRepo.getAll();
    this._log(`Loaded ${books.length} books and ${members.length} members.`);
    this.renderInventory('#app');
  },

  addBook(id, title, author) {
    if (!id || !title) return alert("Missing fields");

    try {
      libraryService.addBook(id, title, author);
      this._log(`Book added: ${title}`);
      this.renderInventory('#app');
    } catch (err) {
      alert(err.message);
    }
  },

  registerMember(id, name, email, silent = false) {
    if (!email.includes("@")) return !silent && alert("Invalid email");

    try {
      libraryService.registerMember(id, name, email);
      this._log(`Member registered: ${name}`);
      this.renderMember(id, '#member');
      if (!silent) alert(`Member registered: ${name}`);
      multiNotifier.notifyMemberRegistered({ id, name, email });
    } catch (err) {
      !silent && alert(err.message);
    }
  },

  checkoutBook(bookId, memberId, card) {
    try {
      libraryService.checkoutBook(bookId, memberId, card);
      this._log(`Checked out: ${bookId} → ${memberId}`);
      this.renderInventory('#app');
      this.renderMember(memberId, '#member');
    } catch (err) {
      alert(err.message);
    }
  },

  search(term) {
    const results = libraryService.search(term);
    this._log(`Search '${term}' → ${results.length} results`);
    this.renderInventory('#app', results);
    return results;
  },

  renderInventory(sel, booksOverride) {
    const books = booksOverride || bookRepo.getAll();
    document.querySelector(sel).innerHTML = inventoryTemplate(books, this.log);
  },

  renderMember(memberId, sel) {
    const member = memberRepo.getAll().find(m => m.id === memberId);
    document.querySelector(sel).innerHTML = member
      ? `<h3>${member.name}</h3><p>${member.email}</p><p>Fees: $${member.fees}</p>`
      : `<em>No member selected.</em>`;
  },

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log("[LOG]", msg);
  }
};


// ============================================
// Bootstrap (Application Startup)
// ============================================

(function bootstrap() {
  Library.load();

  const $ = sel => document.querySelector(sel);

  $('#add').onclick = () => Library.addBook($('#id').value, $('#title').value, $('#author').value);
  $('#reg').onclick = () => Library.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
  $('#checkout').onclick = () => Library.checkoutBook($('#bookId').value, $('#memberId').value);
  $('#search').oninput = e => Library.search(e.target.value);

  $('#seed').onclick = () => {
    if (bookRepo.getAll().length === 0) {
      Library.addBook("b1", "Clean Code", "Robert C. Martin");
      Library.addBook("b2", "Design Patterns", "GoF");
    }
    if (memberRepo.getAll().length === 0) {
      Library.registerMember("m1", "Ada", "ada@example.com", true);
      Library.registerMember("m2", "Linus", "linus@example.com", true);
    }
    alert("Seeded.");
  };

  $('#reset').onclick = () => {
    localStorage.removeItem("library-books");
    localStorage.removeItem("library-members");
    location.reload();
  };
})();
