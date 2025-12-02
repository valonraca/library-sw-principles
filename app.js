class BookRepo {
  constructor(storage) {
    this.storage = storage;
    this.key = "LIB_BOOKS";
  }
  load() {
    return JSON.parse(this.storage.getItem(this.key) || "[]");
  }
  saveAll(books) {
    this.storage.setItem(this.key, JSON.stringify(books));
  }
}







class MemberRepo {
  constructor(storage) {
    this.storage = storage;
    this.key = "LIB_MEMBERS";
  }
  load() {
    return JSON.parse(this.storage.getItem(this.key) || "[]");
  }
  saveAll(members) {
    this.storage.setItem(this.key, JSON.stringify(members));
  }
}

class LibraryService {
  constructor(bookRepo, memberRepo, payment, notifier, logger = console) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.payment = payment;
    this.notifier = notifier;
    this.logger = logger;

    this.books = this.bookRepo.load();
    this.members = this.memberRepo.load();
  }

  _save() {
    this.bookRepo.saveAll(this.books);
    this.memberRepo.saveAll(this.members);
  }

  addBook(id, title, author) {
    if (!id || !title) throw Error("Missing fields");
    this.books.push({ id, title, author, available: true });
    this.logger.log("Book added:", title);
    this._save();
  }

  registerMember(id, name, email) {
    if (!email.includes("@")) throw Error("Invalid email");
    this.members.push({ id, name, email, fees: 0 });
    this.logger.log("Member registered:", name);
    this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
    this._save();
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
    const book = this.books.find(b => b.id === bookId);
    const mem = this.members.find(m => m.id === memberId);

    if (!book) throw Error("Book not found");
    if (!mem) throw Error("Member not found");
    if (!book.available) throw Error("Book already checked out");

    // Domain policy
    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;

    // Payment port
    if (fee > 0) {
      const res = this.payment.charge(fee, card);
      if (!res.ok) throw Error("Payment failed");
      mem.fees += fee;
    }

    book.available = false;
    this.logger.log(`Checked out ${book.title} to ${mem.name} (fee=$${fee}).`);
    this.notifier.send(mem.email, "Checkout", `You borrowed ${book.title}. Fee: $${fee}`);
    this._save();
  }


  search(term) {
    const t = term.trim().toLowerCase();
    return this.books.filter(b =>
      b.title.toLowerCase().includes(t) ||
      b.author.toLowerCase().includes(t)
    );




















  }
}

(function bootstrap() {
  const storage = localStorage;


  const paymentProvider = {
    charge(amount, card) {
      console.log(`[FakeStripe] Charging $${amount} to ${card}`);
      return { ok: true, txn: Math.random().toString(36).slice(2) };
    }
  };

  const notifier = {
    send(to, subject, body) {
      console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    }
  };

  const bookRepo = new BookRepo(storage);
  const memberRepo = new MemberRepo(storage);

  // Domain service (pure logic)
  const library = new LibraryService(bookRepo, memberRepo, paymentProvider, notifier);

  // DOM helpers
  const $ = sel => document.querySelector(sel);

  function renderInventory() {
    $('#app').innerHTML =
      `<h3>Inventory</h3><ul>` +
      library.books.map(b =>
        `<li><strong>${b.available ? '✓' : '✗'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`
      ).join('') +
      `</ul>`;
  }

  function renderMember(id) {
    const m = library.members.find(x => x.id === id);
    $('#member').innerHTML = m
      ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
      : `<em>No member selected.</em>`;
  }

  // Wire UI controls
  $('#add').onclick = () => {
    try {
      library.addBook($('#id').value, $('#title').value, $('#author').value);
      renderInventory();
    } catch (e) { alert(e.message); }
  };

  $('#reg').onclick = () => {
    try {
      library.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
    } catch (e) { alert(e.message); }
  };

  $('#checkout').onclick = () => {
    try {
      library.checkoutBook($('#bookId').value, $('#memberId').value);
      renderInventory();
      renderMember($('#memberId').value);
    } catch (e) { alert(e.message); }
  };

  $('#search').oninput = e => {
    library.search(e.target.value);
    renderInventory();
  };

  $('#seed').onclick = () => {
    if (library.books.length === 0) {
      library.addBook("b1", "Clean Code", "Robert C. Martin");
      library.addBook("b2", "Design Patterns", "GoF");
    }
    if (library.members.length === 0) {
      library.registerMember("m1", "Ada", "ada@example.com");
      library.registerMember("m2", "Linus", "linus@example.com");
    }
    renderInventory();
    alert("Seeded");
  };

  $('#reset').onclick = () => {
    localStorage.removeItem("LIB_BOOKS");
    localStorage.removeItem("LIB_MEMBERS");
    location.reload();
  };

  // Initial render
  renderInventory();
})();
