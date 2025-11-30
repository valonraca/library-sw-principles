// ======================================================
// REPOSITORIES — Persistence Only (SRP)
// ======================================================

class BookRepo {
  constructor(key = "LIB_DATA") {
    this.key = key;
  }

  load() {
    const raw = JSON.parse(localStorage.getItem(this.key) || "{}");
    return raw.books || [];
  }

  save(books, members) {
    localStorage.setItem(this.key, JSON.stringify({ books, members }));
  }
}

class MemberRepo {
  constructor(key = "LIB_DATA") {
    this.key = key;
  }

  load() {
    const raw = JSON.parse(localStorage.getItem(this.key) || "{}");
    return raw.members || [];
  }
}


// ======================================================
// PORTS — Interfaces (OCP)
// ======================================================

class PaymentPort {
  charge(amount, card) {
    throw new Error("PaymentPort not implemented");
  }
}

class NotifierPort {
  send(to, subject, body) {
    throw new Error("NotifierPort not implemented");
  }
}


// ======================================================
// ADAPTERS — Concrete Implementations
// ======================================================

class FakeStripe extends PaymentPort {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true };
  }
}

class ConsoleMailer extends NotifierPort {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
}


// ======================================================
// DOMAIN SERVICE — Pure Business Logic (no DOM, no storage)
// ======================================================

class LibraryService {
  constructor(bookRepo, memberRepo, mailer, payment) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.mailer = mailer;
    this.payment = payment;

    this.books = this.bookRepo.load();
    this.members = this.memberRepo.load();
  }

  addBook(id, title, author) {
    if (!id || !title) throw new Error("Missing fields");

    this.books.push({
      id,
      title,
      author,
      available: true,
    });

    this._save();
  }

  registerMember(id, name, email) {
    if (!email.includes("@")) throw new Error("Invalid email");

    this.members.push({
      id,
      name,
      email,
      fees: 0,
    });

    this.mailer.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
    this._save();
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
    const b = this.books.find(x => x.id === bookId);
    const m = this.members.find(x => x.id === memberId);

    if (!b) throw new Error("Book not found");
    if (!m) throw new Error("Member not found");
    if (!b.available) throw new Error("Book already checked out");

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;

    if (fee > 0) {
      const res = this.payment.charge(fee, card);
      if (!res.ok) throw new Error("Payment failed");
      m.fees += fee;
    }

    b.available = false;

    this.mailer.send(
      m.email,
      "Checkout",
      `You borrowed ${b.title}. Fee: $${fee}`
    );

    this._save();
  }

  search(term) {
    const t = term.trim().toLowerCase();
    return this.books.filter(
      b =>
        b.title.toLowerCase().includes(t) ||
        b.author.toLowerCase().includes(t)
    );
  }

  _save() {
    this.bookRepo.save(this.books, this.members);
  }
}


// ======================================================
// UI LAYER — DOM Only (no domain logic)
// ======================================================

const library = new LibraryService(
  new BookRepo(),
  new MemberRepo(),
  new ConsoleMailer(),
  new FakeStripe()
);

function renderInventory() {
  const el = document.querySelector("#app");
  el.innerHTML =
    `<h3>Inventory</h3>` +
    `<ul>` +
    library.books
      .map(
        b =>
          `<li><strong>${b.available ? "✓" : "✗"}</strong> ${b.id}: ${b.title} — ${b.author}</li>`
      )
      .join("") +
    `</ul>`;
}

function renderMember(id) {
  const m = library.members.find(x => x.id === id);
  const el = document.querySelector("#member");

  el.innerHTML = m
    ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
    : "<em>No member selected.</em>";
}


// ======================================================
// EVENT HANDLERS — UI → DOMAIN
// ======================================================

document.querySelector("#add").onclick = () => {
  try {
    library.addBook(id.value, title.value, author.value);
    renderInventory();
  } catch (e) {
    alert(e.message);
  }
};

document.querySelector("#reg").onclick = () => {
  try {
    library.registerMember(mid.value, mname.value, memail.value);
    renderInventory();
  } catch (e) {
    alert(e.message);
  }
};

document.querySelector("#checkout").onclick = () => {
  try {
    library.checkoutBook(bookId.value, memberId.value);
    renderInventory();
    renderMember(memberId.value);
  } catch (e) {
    alert(e.message);
  }
};

document.querySelector("#search").oninput = e => {
  library.search(e.target.value);
  renderInventory();
};


// ======================================================
// SEED + RESET (UI ONLY) — FIXED
// ======================================================

document.querySelector("#seed").onclick = () => {
  try {
    // Clean/reset bad localStorage before seeding
    localStorage.removeItem("LIB_DATA");

    // Re-load empty arrays
    library.books = [];
    library.members = [];

    // Seed data
    library.addBook("b1", "Clean Code", "Robert C. Martin");
    library.addBook("b2", "Design Patterns", "GoF");

    library.registerMember("m1", "Ada", "ada@example.com");
    library.registerMember("m2", "Linus", "linus@example.com");

    renderInventory();
    alert("Seeded clean data.");
  } catch (e) {
    alert(e.message);
  }
};

document.querySelector("#reset").onclick = () => {
  localStorage.removeItem("LIB_DATA");
  location.reload();
};


// ======================================================
// INITIAL RENDER
// ======================================================

renderInventory();
