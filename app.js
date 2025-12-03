class BookRepository {
  constructor() {
    this.books = JSON.parse(localStorage.getItem("LIB_BOOKS") || "[]");
  }

  save() {
    localStorage.setItem("LIB_BOOKS", JSON.stringify(this.books));
  }

  add(book) {
    this.books.push(book);
    this.save();
  }

  getAll() {
    return this.books;
  }

  findById(id) {
    return this.books.find((b) => b.id === id);
  }

  search(term) {
    const t = term.trim().toLowerCase();
    return this.books.filter(
      (b) =>
        b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t)
    );
  }
}

class MemberRepository {
  constructor() {
    this.members = JSON.parse(localStorage.getItem("LIB_MEMBERS") || "[]");
  }

  save() {
    localStorage.setItem("LIB_MEMBERS", JSON.stringify(this.members));
  }

  add(member) {
    this.members.push(member);
    this.save();
  }

  findById(id) {
    return this.members.find((m) => m.id === id);
  }
}

// --- 2. Services (Abstractions for OCP) ---
class NotificationService {
  send(to, subject, body) {
    // Default implementation (can be overridden)
    console.log(`[Email Mock] To: ${to} | Subject: ${subject} | Body: ${body}`);
  }
}

class PaymentService {
  charge(amount, card) {
    console.log(`[Payment Mock] Charging $${amount} to ${card}`);
    return { ok: true };
  }
}

// --- 3. Domain Service ( The Core Logic ) ---
class LibraryService {
  constructor(bookRepo, memberRepo, notifier, paymentProcessor) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.notifier = notifier;
    this.paymentProcessor = paymentProcessor;
    this.logHistory = [];
  }

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    const entry = `${stamp} — ${msg}`;
    this.logHistory.push(entry);
    if (this.logHistory.length > 50) this.logHistory.shift();
    return entry;
  }

  addBook(id, title, author) {
    if (!id || !title) throw new Error("Missing book fields");
    this.bookRepo.add({ id, title, author, available: true });
    this._log(`Book added: ${title}`);
  }

  registerMember(id, name, email) {
    if (!email.includes("@")) throw new Error("Invalid email");
    this.memberRepo.add({ id, name, email, fees: 0 });
    this._log(`Member registered: ${name}`);
    this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
    const book = this.bookRepo.findById(bookId);
    const member = this.memberRepo.findById(memberId);

    if (!book) throw new Error("Book not found");
    if (!member) throw new Error("Member not found");
    if (!book.available) throw new Error("Book already checked out");

    // Business Logic: Fee Calculation
    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;

    // Business Logic: Payment
    if (fee > 0) {
      const res = this.paymentProcessor.charge(fee, card);
      if (!res.ok) throw new Error("Payment failed");
      member.fees += fee;
    }

    // State Change
    book.available = false;
    this.bookRepo.save(); // Persist changes
    this.memberRepo.save(); // Persist changes

    this._log(`Checked out ${book.title} to ${member.name}. Fee: $${fee}`);
    this.notifier.send(
      member.email,
      "Checkout",
      `You borrowed ${book.title}. Fee: $${fee}`
    );
  }

  searchBooks(term) {
    const results = this.bookRepo.search(term);
    this._log(`Search '${term}' → ${results.length} results.`);
    return results;
  }

  getInventory() {
    return this.bookRepo.getAll();
  }
  getLogs() {
    return this.logHistory;
  }
  getMember(id) {
    return this.memberRepo.findById(id);
  }
}

// --- 4. UI Manager (The View Layer) ---
// This handles all DOM interaction, keeping the Service clean.
const UIManager = {
  init(service) {
    this.service = service;
    this.cacheDOM();
    this.bindEvents();
    this.render();
  },

  cacheDOM() {
    this.dom = {
      app: document.querySelector("#app"),
      memberPanel: document.querySelector("#member"),
      inputs: {
        bid: document.querySelector("#id"),
        btitle: document.querySelector("#title"),
        bauthor: document.querySelector("#author"),
        mid: document.querySelector("#mid"),
        mname: document.querySelector("#mname"),
        memail: document.querySelector("#memail"),
        search: document.querySelector("#search"),
        checkoutBid: document.querySelector("#bookId"),
        checkoutMid: document.querySelector("#memberId"),
      },
      btns: {
        add: document.querySelector("#add"),
        reg: document.querySelector("#reg"),
        checkout: document.querySelector("#checkout"),
        seed: document.querySelector("#seed"),
        reset: document.querySelector("#reset"),
      },
    };
  },

  bindEvents() {
    const { btns, inputs } = this.dom;

    btns.add.onclick = () => {
      try {
        this.service.addBook(
          inputs.bid.value,
          inputs.btitle.value,
          inputs.bauthor.value
        );
        this.render();
      } catch (e) {
        alert(e.message);
      }
    };

    btns.reg.onclick = () => {
      try {
        this.service.registerMember(
          inputs.mid.value,
          inputs.mname.value,
          inputs.memail.value
        );
        alert("Member registered");
      } catch (e) {
        alert(e.message);
      }
    };

    btns.checkout.onclick = () => {
      try {
        this.service.checkoutBook(
          inputs.checkoutBid.value,
          inputs.checkoutMid.value
        );
        this.renderMember(inputs.checkoutMid.value);
        this.render();
      } catch (e) {
        alert(e.message);
      }
    };

    inputs.search.oninput = (e) => {
      const results = this.service.searchBooks(e.target.value);
      this.renderList(results);
    };

    btns.seed.onclick = () => {
      if (this.service.getInventory().length === 0) {
        this.service.addBook("b1", "Clean Code", "Robert C. Martin");
        this.service.addBook("b2", "Design Patterns", "GoF");
        this.service.registerMember("m1", "Ada", "ada@example.com");
        this.render();
        alert("Seeded");
      }
    };

    btns.reset.onclick = () => {
      localStorage.clear();
      location.reload();
    };
  },

  render() {
    this.renderList(this.service.getInventory());
  },

  renderList(books) {
    const listHtml = books
      .map(
        (b) =>
          `<li><strong>${
            b.available
              ? '<span class="ok">✓</span>'
              : '<span class="no">✗</span>'
          }</strong> ${b.id}: ${b.title} — ${b.author}</li>`
      )
      .join("");

    const logsHtml = this.service.getLogs().slice(-3).join("<br/>");

    this.dom.app.innerHTML = `<h3>Inventory</h3><ul>${listHtml}</ul><div class="muted">${logsHtml}</div>`;
  },

  renderMember(id) {
    const m = this.service.getMember(id);
    this.dom.memberPanel.innerHTML = m
      ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
      : "<em>No member selected.</em>";
  },
};

// --- 5. Application Bootstrap ---
// This acts as the "Composition Root" where we inject dependencies.
document.addEventListener("DOMContentLoaded", () => {
  // Dependencies
  const bookRepo = new BookRepository();
  const memberRepo = new MemberRepository();
  const notifier = new NotificationService();
  const paymentProcessor = new PaymentService();

  // Injection
  const libraryService = new LibraryService(
    bookRepo,
    memberRepo,
    notifier,
    paymentProcessor
  );

  // Start UI
  UIManager.init(libraryService);
});
