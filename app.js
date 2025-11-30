// repositories

class BookRepo {
  constructor() {
    this.books = [];
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem("LIB_DATA") || "{}");
      this.books = data.books || [];
    } catch {
      this.books = [];
    }
  }

  save(all) {
    localStorage.setItem("LIB_DATA", JSON.stringify(all));
  }

  addBook(id, title, author) {
    this.books.push({ id, title, author, available: true });
  }

  findBookById(id) {
    return this.books.find(b => b.id === id);
  }

  search(term) {
    const t = term.toLowerCase();
    return this.books.filter(b =>
      b.title.toLowerCase().includes(t) ||
      b.author.toLowerCase().includes(t)
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
    } catch {
      this.members = [];
    }
  }

  save(all) {
    localStorage.setItem("LIB_DATA", JSON.stringify(all));
  }

  addMember(id, name, email) {
    this.members.push({ id, name, email, fees: 0 });
  }

  findMember(id) {
    return this.members.find(m => m.id === id);
  }
}

class PaymentProvider {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true };
  }
}

class Mailer {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject}`, body);
  }
}

class Logger {
  constructor() {
    this.log = [];
  }

  add(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log("[LOG]", msg);
  }

  recent() {
    return this.log.slice(-3);
  }
}

// main library service (domain)
class LibraryService {
  constructor(bookRepo, memberRepo, payment, mailer, logger) {
    this.books = bookRepo;
    this.members = memberRepo;
    this.payment = payment;
    this.mailer = mailer;
    this.logger = logger;
  }

  addBook(id, title, author) {
    if (!id || !title) throw new Error("Missing field");
    if (this.books.findBookById(id)) throw new Error(`Book ID ${id} already exists`);

    this.books.addBook(id, title, author);
    this.logger.add(`Book added: ${title}`);
  }

  registerMember(id, name, email) {
    if (!email.includes("@")) throw new Error(`Invalid email`);
    if (this.members.findMember(id)) throw new Error(`MemberID ${id} already exists`);

    this.members.addMember(id, name, email);
    this.mailer.send(email, "Welcome", `Hello ${name}!`);
    this.logger.add(`Member added: ${name}`);
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
    const book = this.books.findBookById(bookId);
    const member = this.members.findMember(memberId);

    if (!book) throw new Error(`Book not found`);
    if (!member) throw new Error(`Member not found`);
    if (!book.available) throw new Error(`already checked out`);

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;
    if (fee > 0) {
      const res = this.payment.charge(fee, card);
      if (!res.ok) throw new Error(`Payment failed`);
      member.fees += fee;
    }

    book.available = false;
    this.mailer.send(member.email, "Checkout", `You borrowed ${book.title}`);
    this.logger.add(`Checked out: ${book.title} → ${member.name}`);
  }

  search(term) {
    const results = this.books.search(term);
    this.logger.add(`Search '${term}' → ${results.length} results`);
    return results;
  }
}

// website UI contorller
class LibraryController {
  constructor(service, bookRepo, memberRepo, logger) {
    this.service = service;
    this.books = bookRepo;
    this.members = memberRepo;
    this.logger = logger;
  }

  renderInventory(sel) {
    const el = document.querySelector(sel);
    el.innerHTML = `
      <h3>Inventory</h3>
      <ul>
        ${this.books.books.map(b => `
          <li>
            <strong>${b.available ? "✓" : "✗"}</strong>
            ${b.id}: ${b.title} — ${b.author}
          </li>`).join("")}
      </ul>
      <div class="muted">${this.logger.recent().join("<br/>")}</div>
    `;
  }

  renderMember(id, sel) {
    const m = this.members.findMember(id);
    const el = document.querySelector(sel);

    if (!m) return (el.innerHTML = "<em>No member selected</em>");

    el.innerHTML = `
      <h3>${m.name}</h3>
      <p>${m.email}</p>
      <p>Fees: $${m.fees}</p>
    `;
  }

  saveAll() {
    const data = {
      ...this.books.save(),
      ...this.members.save()
    };
    this.books.save(data);
  }
}

// --- Minimal wiring (STILL tightly coupled) ---
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

  const $ = s => document.querySelector(s);

  $("#add").onclick = () => {
    try {
      service.addBook($("#id").value, $("#title").value, $("#author").value);
      ui.saveAll();
      ui.renderInventory("#app");
    } catch (err) {
      alert(err.message);
    }
  };

  $("#reg").onclick = () => {
    try {
      service.registerMember($("#mid").value, $("#mname").value, $("#memail").value);
      ui.saveAll();
      ui.renderInventory("#app");
    } catch (err) {
      alert(err.message);
    }
  };

  $("#checkout").onclick = () => {
    try {
      service.checkoutBook($("#bookId").value, $("#memberId").value);
      ui.saveAll();
      ui.renderInventory("#app");
      ui.renderMember($("#memberId").value, "#member");
    } catch (err) {
      alert(err.message);
    }
  };

  $("#search").oninput = e => {
    service.search(e.target.value);
    ui.renderInventory("#app");
  };

  $("#seed").onclick = () => {
    if (books.books.length === 0) {
      service.addBook("1", "Clean Code", "Martin");
      service.addBook("2", "Design Patterns", "GoF");
    }
    if (members.members.length === 0) {
      service.registerMember("A", "Ada", "ada@example.com");
      service.registerMember("L", "Linus", "linus@example.com");
    }
    ui.saveAll();
    ui.renderInventory("#app");
    alert("Seeded");
  };

  $("#reset").onclick = () => {
    localStorage.removeItem("LIB_DATA");
    location.reload();
  };

  ui.renderInventory("#app");

})();