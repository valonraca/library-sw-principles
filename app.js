// =========================
// Repositories (storage)
// =========================

class BookRepo {
  constructor() {
    this.books = [];
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem("LIB_DATA") || "{}");
      this.books = data.books || [];
    } catch (e) {
      this.books = [];
    }
  }

  toJSON() {
    return this.books;
  }

  addBook(id, title, author) {
    this.books.push({
      id,
      title,
      author,
      available: true,
      borrowerId: null,
      dueDate: null,
    });
  }

  findById(id) {
    return this.books.find((b) => b.id === id);
  }

  search(term) {
    const t = term.trim().toLowerCase();
    if (!t) return this.books.slice();
    return this.books.filter(
      (b) =>
        b.id.toLowerCase().includes(t) ||
        b.title.toLowerCase().includes(t) ||
        (b.author || "").toLowerCase().includes(t)
    );
  }
}

class MemberRepo {
  constructor() {
    this.members = [];
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem("LIB_DATA") || "{}");
      this.members = data.members || [];
    } catch (e) {
      this.members = [];
    }
  }

  toJSON() {
    return this.members;
  }

  addMember(id, name, email) {
    this.members.push({
      id,
      name,
      email,
      fees: 0,
      active: true,
    });
  }

  findById(id) {
    return this.members.find((m) => m.id === id);
  }
}

// =========================
// Infrastructure services
// =========================

class PaymentProvider {
  charge(amount, card) {
    console.log(`[Payment] Charging $${amount} to ${card}`);
    return { ok: true };
  }
}

class Mailer {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
}

class Logger {
  constructor() {
    this.entries = [];
  }

  add(msg) {
    const stamp = new Date().toLocaleTimeString();
    const line = `${stamp} – ${msg}`;
    this.entries.push(line);
    if (this.entries.length > 50) {
      this.entries.shift();
    }
    console.log("[LOG]", line);
  }

  recent(count = 3) {
    return this.entries.slice(-count);
  }
}

// =========================
// Domain service (rules only)
// =========================

class LibraryService {
  constructor(bookRepo, memberRepo, paymentProvider, mailer, logger) {
    this.books = bookRepo;
    this.members = memberRepo;
    this.payment = paymentProvider;
    this.mailer = mailer;
    this.logger = logger;
  }

  addBook(id, title, author) {
    if (!id || !title) {
      throw new Error("Book ID and title are required.");
    }
    if (this.books.findById(id)) {
      throw new Error(`Book with ID ${id} already exists.`);
    }
    this.books.addBook(id, title, author || "Unknown");
    this.logger.add(`Book added: ${title} (${id})`);
  }

  registerMember(id, name, email) {
    if (!id || !name || !email) {
      throw new Error("Member ID, name, and email are required.");
    }
    if (!email.includes("@")) {
      throw new Error("Invalid email address.");
    }
    if (this.members.findById(id)) {
      throw new Error(`Member with ID ${id} already exists.`);
    }
    this.members.addMember(id, name, email);
    this.mailer.send(
      email,
      "Welcome to the Library",
      `Hello ${name}, your member ID is ${id}.`
    );
    this.logger.add(`Member registered: ${name} (${id})`);
  }

  checkoutBook(bookId, memberId, days = 14, card = "1111-1111") {
    const book = this.books.findById(bookId);
    if (!book) throw new Error("Book not found.");

    if (!book.available) {
      throw new Error("Book is already checked out.");
    }

    const member = this.members.findById(memberId);
    if (!member) throw new Error("Member not found.");
    if (!member.active) throw new Error("Member is not active.");

    let fee = 0;
    if (days > 14) {
      fee = (days - 14) * 0.5;
    }

    if (fee > 0) {
      const res = this.payment.charge(fee, card);
      if (!res.ok) throw new Error("Payment failed.");
      member.fees += fee;
    }

    const due = new Date();
    due.setDate(due.getDate() + days);
    book.available = false;
    book.borrowerId = member.id;
    book.dueDate = due.toISOString().slice(0, 10);

    this.mailer.send(
      member.email,
      "Book checked out",
      `You borrowed "${book.title}" for ${days} days. Fee: $${fee}.`
    );
    this.logger.add(
      `Checked out "${book.title}" to ${member.name} (days=${days}, fee=$${fee})`
    );
  }

  searchBooks(term) {
    return this.books.search(term);
  }
}

// =========================
// UI controller (DOM only)
// =========================

class LibraryController {
  constructor(service, bookRepo, memberRepo, logger) {
    this.service = service;
    this.books = bookRepo;
    this.members = memberRepo;
    this.logger = logger;
  }

  renderInventory(sel, term = "") {
    const el = document.querySelector(sel);
    if (!el) return;
    const list = this.service.searchBooks(term);

    el.innerHTML =
      "<h3>Inventory</h3>" +
      "<ul>" +
      list
        .map((b) => {
          const status = b.available
            ? "Available"
            : `Checked out to ${b.borrowerId} (due ${b.dueDate})`;
          return `<li><strong>${b.id}</strong> – ${b.title} by ${b.author} (${status})</li>`;
        })
        .join("") +
      "</ul>" +
      `<div class="muted">${this.logger.recent().join("<br>")}</div>`;
  }

  renderMember(memberId, sel) {
    const el = document.querySelector(sel);
    if (!el) return;

    const m = this.members.findById(memberId);
    if (!m) {
      el.innerHTML = "<em>No member selected.</em>";
      return;
    }

    el.innerHTML = `
      <h3>${m.name}</h3>
      <p>${m.email}</p>
      <p>Fees: $${m.fees}</p>
    `;
  }

  saveAll() {
    const all = {
      books: this.books.toJSON(),
      members: this.members.toJSON(),
    };
    localStorage.setItem("LIB_DATA", JSON.stringify(all));
  }
}

// =========================
// Bootstrap / wiring
// =========================

(function () {
  const books = new BookRepo();
  const members = new MemberRepo();
  const logger = new Logger();
  const payment = new PaymentProvider();
  const mailer = new Mailer();

  books.load();
  members.load();

  const service = new LibraryService(books, members, payment, mailer, logger);
  const ui = new LibraryController(service, books, members, logger);

  const $ = (s) => document.querySelector(s);

  $("#add").onclick = () => {
    try {
      service.addBook($("#id").value, $("#title").value, $("#author").value);
      ui.saveAll();
      ui.renderInventory("#app");
      alert("Book added.");
    } catch (err) {
      alert(err.message);
    }
  };

  $("#reg").onclick = () => {
    try {
      service.registerMember(
        $("#mid").value,
        $("#mname").value,
        $("#memail").value
      );
      ui.saveAll();
      ui.renderMember($("#mid").value, "#member");
      alert("Member registered.");
    } catch (err) {
      alert(err.message);
    }
  };

  $("#checkout").onclick = () => {
    try {
      service.checkoutBook($("#bookId").value, $("#memberId").value, 21);
      ui.saveAll();
      ui.renderInventory("#app");
      ui.renderMember($("#memberId").value, "#member");
      alert("Book checked out.");
    } catch (err) {
      alert(err.message);
    }
  };

  $("#search").oninput = (e) => {
    ui.renderInventory("#app", e.target.value);
  };

  $("#seed").onclick = () => {
    if (books.toJSON().length === 0) {
      service.addBook("b1", "Clean Code", "Robert C. Martin");
      service.addBook("b2", "Design Patterns", "GoF");
    }
    if (members.toJSON().length === 0) {
      service.registerMember("m1", "Ada", "ada@example.com");
      service.registerMember("m2", "Linus", "linus@example.com");
    }
    ui.saveAll();
    ui.renderInventory("#app");
    alert("Seeded.");
  };

  $("#reset").onclick = () => {
    localStorage.removeItem("LIB_DATA");
    location.reload();
  };

  ui.renderInventory("#app");
})();
