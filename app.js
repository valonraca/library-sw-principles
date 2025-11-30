// === Payment interface (port) ===
function PaymentPort() {}
PaymentPort.prototype.charge = function(amount, card) {
  throw new Error("PaymentPort.charge not implemented");
};

// === Notifier interface (port) ===
function NotifierPort() {}
NotifierPort.prototype.send = function(to, subject, body) {
  throw new Error("NotifierPort.send not implemented");
};

// === Concrete Payment adapter (fake Stripe) ===
function StripeAdapter() {}
StripeAdapter.prototype = Object.create(PaymentPort.prototype);
StripeAdapter.prototype.charge = function(amount, card) {
  console.log(`[FakeStripe] Charging $${amount} to ${card}`);
  return { ok: true, txn: Math.random().toString(36).slice(2) };
};

// === Concrete Notifier adapter (fake Email) ===
function EmailAdapter() {}
EmailAdapter.prototype = Object.create(NotifierPort.prototype);
EmailAdapter.prototype.send = function(to, subject, body) {
  console.log(`[Email] to=${to} subject=${subject} body=${body}`);
  return true;
};

// === Repository for Books (handles localStorage) ===
function BookRepo(storage) {
  this.storage = storage;
  this.key = "LIB_BOOKS";
}
BookRepo.prototype.load = function() {
  return JSON.parse(this.storage.getItem(this.key) || "[]");
};
BookRepo.prototype.saveAll = function(books) {
  this.storage.setItem(this.key, JSON.stringify(books));
};
BookRepo.prototype.saveOne = function(book) {
  const books = this.load();
  books.push(book);
  this.saveAll(books);
};
BookRepo.prototype.update = function(updatedBook) {
  const books = this.load();
  const idx = books.findIndex(b => b.id === updatedBook.id);
  if (idx >= 0) {
    books[idx] = updatedBook;
    this.saveAll(books);
  }
};

// === Repository for Members (handles localStorage) ===
function MemberRepo(storage) {
  this.storage = storage;
  this.key = "LIB_MEMBERS";
}
MemberRepo.prototype.load = function() {
  return JSON.parse(this.storage.getItem(this.key) || "[]");
};
MemberRepo.prototype.saveAll = function(members) {
  this.storage.setItem(this.key, JSON.stringify(members));
};
MemberRepo.prototype.saveOne = function(member) {
  const members = this.load();
  members.push(member);
  this.saveAll(members);
};
MemberRepo.prototype.update = function(updatedMember) {
  const members = this.load();
  const idx = members.findIndex(m => m.id === updatedMember.id);
  if (idx >= 0) {
    members[idx] = updatedMember;
    this.saveAll(members);
  }
};

// === Domain logic service - no UI, no storage, no alerts ===
function LibraryService(bookRepo, memberRepo, payment, notifier, logger) {
  this.bookRepo = bookRepo;
  this.memberRepo = memberRepo;
  this.payment = payment;
  this.notifier = notifier;
  this.log = logger || function() {};
}

LibraryService.prototype.addBook = function(id, title, author) {
  if (!id || !title) return { error: "Missing fields" };
  const book = { id, title, author, available: true };
  this.bookRepo.saveOne(book);
  this.log(`Book added: ${title}`);
  return { ok: true, book };
};

LibraryService.prototype.registerMember = function(id, name, email) {
  if (!email || !email.includes("@")) return { error: "Invalid email" };
  const member = { id, name, email, fees: 0 };
  this.memberRepo.saveOne(member);
  this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
  this.log(`Member registered: ${name}`);
  return { ok: true, member };
};

LibraryService.prototype.checkoutBook = function(bookId, memberId, days = 21, card = "4111-1111") {
  const books = this.bookRepo.load();
  const members = this.memberRepo.load();

  const book = books.find(b => b.id === bookId);
  if (!book) return { error: "Book not found" };

  const member = members.find(m => m.id === memberId);
  if (!member) return { error: "Member not found" };

  if (!book.available) return { error: "Book already checked out" };

  let fee = 0;
  if (days > 14) fee = (days - 14) * 0.5;

  if (fee > 0) {
    const paymentResult = this.payment.charge(fee, card);
    if (!paymentResult.ok) return { error: "Payment failed" };
    member.fees += fee;
  }

  book.available = false;

  this.notifier.send(member.email, "Checkout", `You borrowed ${book.title}. Fee: $${fee}`);
  this.log(`Checked out ${book.title} to ${member.name} for ${days} days (fee=$${fee}).`);

  // Update repos
  this.bookRepo.update(book);
  this.memberRepo.update(member);

  return { ok: true, book, member };
};

LibraryService.prototype.searchBooks = function(term) {
  const t = term.trim().toLowerCase();
  const books = this.bookRepo.load();
  return books.filter(b => b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t));
};

// === UI Rendering (still separate from domain) ===
function renderInventory(books, log, sel) {
  const el = document.querySelector(sel);
  if (!el) return;
  el.innerHTML = `<h3>Inventory</h3>` +
    `<ul>` + books.map(b => `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`).join('') + `</ul>` +
    `<div class="muted">${log.slice(-3).join('<br/>')}</div>`;
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

// === Logger utility ===
function Logger() {
  this.log = [];
}
Logger.prototype.add = function(msg) {
  const stamp = new Date().toLocaleTimeString();
  this.log.push(`${stamp} — ${msg}`);
  if (this.log.length > 50) this.log.shift();
  console.log('[LOG]', msg);
};
Logger.prototype.getLast = function(count = 3) {
  return this.log.slice(-count);
};

// === Bootstrap & wiring ===
(function bootstrap() {
  const logger = new Logger();

  // Instantiate repositories
  const bookRepo = new BookRepo(localStorage);
  const memberRepo = new MemberRepo(localStorage);

  // Instantiate services
  const paymentService = new StripeAdapter();
  const notifierService = new EmailAdapter();

  // Create the domain service with injected dependencies
  const libraryService = new LibraryService(bookRepo, memberRepo, paymentService, notifierService, msg => logger.add(msg));

  // Load initial data and UI
  const books = bookRepo.load();
  const members = memberRepo.load();

  renderInventory(books, logger.getLast(), '#app');

  // Helper to reload UI after changes
  function reloadUI() {
    renderInventory(bookRepo.load(), logger.getLast(), '#app');
  }
  function renderMemberUI(memberId) {
    const member = memberRepo.load().find(m => m.id === memberId);
    renderMember(member, '#member');
  }

  const $ = sel => document.querySelector(sel);

  // Event handlers wired to UI
  $('#add').onclick = () => {
    const res = libraryService.addBook($('#id').value, $('#title').value, $('#author').value);
    if (res.error) return alert(res.error);
    reloadUI();
  };

  $('#reg').onclick = () => {
    const res = libraryService.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
    if (res.error) return alert(res.error);
    alert('Member registered.');
  };

  $('#checkout').onclick = () => {
    const res = libraryService.checkoutBook($('#bookId').value, $('#memberId').value);
    if (res.error) return alert(res.error);
    reloadUI();
    renderMemberUI($('#memberId').value);
  };

  $('#search').oninput = e => {
    const results = libraryService.searchBooks(e.target.value);
    renderInventory(results, logger.getLast(), '#app');
  };

  $('#seed').onclick = () => {
    if (bookRepo.load().length === 0) {
      libraryService.addBook('b1', 'Clean Code', 'Robert C. Martin');
      libraryService.addBook('b2', 'Design Patterns', 'GoF');
    }
    if (memberRepo.load().length === 0) {
      libraryService.registerMember('m1', 'Ada', 'ada@example.com');
      libraryService.registerMember('m2', 'Linus', 'linus@example.com');
    }
    alert('Seeded.');
    reloadUI();
  };

  $('#reset').onclick = () => {
    localStorage.clear();
    location.reload();
  };
})();
