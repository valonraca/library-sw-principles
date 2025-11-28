class PaymentProvider{
  charge(amount, card){
    throw new Error("Not Implemented");
  }
}

class Notifier {
  send(to, subject, body) {
    throw new Error("Not implemented");
  }
}

class BookRepo {
  loadBooks() { throw new Error("Not implemented"); }
  saveBooks(books) { throw new Error("Not implemented"); }
}

class MemberRepo {
  loadMembers() { throw new Error("Not implemented"); }
  saveMembers(members) { throw new Error("Not implemented"); }
}

class Logger {
  constructor() {
    this.entries = [];
  }
  log(msg) {
    const stamp = new Date().toLocaleTimeString();
    const line = `${stamp} — ${msg}`;
    this.entries.push(line);
    if (this.entries.length > 50) this.entries.shift();
    console.log("[LOG]", msg);
  }
  recent(limit = 3) {
    return this.entries.slice(-limit);
  }
}

const STORAGE_KEY = "LIB_DATA";

function loadStorageBlob() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStorageBlob(blob) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

class LocalBookRepo extends BookRepo {
  loadBooks() {
    const data = loadStorageBlob();
    return data.books || [];
  }
  saveBooks(books) {
    const data = loadStorageBlob();
    data.books = books;
    saveStorageBlob(data);
  }
}

class LocalMemberRepo extends MemberRepo {
  loadMembers() {
    const data = loadStorageBlob();
    return data.members || [];
  }
  saveMembers(members) {
    const data = loadStorageBlob();
    data.members = members;
    saveStorageBlob(data);
  }
}

class FakeStripePaymentProvider extends PaymentProvider {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true, txn: Math.random().toString(36).slice(2) };
  }
}

class ConsoleEmailNotifier extends Notifier {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
}

class LibraryService {
constructor({ bookRepo, memberRepo, paymentProvider, notifier, logger }) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.paymentProvider = paymentProvider;
    this.notifier = notifier;
    this.logger = logger;

    this.books = [];
    this.members = [];

    this._loadInitial();
  }

  _loadInitial() {
    this.books = this.bookRepo.loadBooks();
    this.members = this.memberRepo.loadMembers();
    this.logger.log(
      `Loaded ${this.books.length} books & ${this.members.length} members from storage.`
    );
  }

  _persist() {
    this.bookRepo.saveBooks(this.books);
    this.memberRepo.saveMembers(this.members);
    this.logger.log("Saved data to storage.");
  }

  getState() {
    return {
      books: this.books.slice(),
      members: this.members.slice(),
      log: this.logger.recent(3)
    };
  }

  addBook(id, title, author) {
    if (!id || !title) {
      return { ok: false, error: "Missing fields" };
    }
    this.books.push({ id, title, author, available: true });
    this.logger.log(`Book added: ${title}`);
    this._persist();
    return { ok: true };
  }

  registerMember(id, name, email) {
    if (!email || email.indexOf("@") < 0) {
      return { ok: false, error: "Invalid email" };
    }
    this.members.push({ id, name, email, fees: 0 });
    this.logger.log(`Member registered: ${name}`);
    this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
    this._persist();
    return { ok: true };
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
    const b = this.books.find(x => x.id === bookId);
    const m = this.members.find(x => x.id === memberId);

    if (!b) return { ok: false, error: "Book not found" };
    if (!m) return { ok: false, error: "Member not found" };
    if (!b.available) return { ok: false, error: "Book already checked out" };

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;

    if (fee > 0) {
      const res = this.paymentProvider.charge(fee, card);
      if (!res.ok) return { ok: false, error: "Payment failed" };
      m.fees += fee;
    }

    b.available = false;
    this.logger.log(
      `Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee}).`
    );
    this.notifier.send(
      m.email,
      "Checkout",
      `You borrowed ${b.title}. Fee: $${fee}`
    );
    this._persist();
    return { ok: true, book: b, member: m, fee };
  }

  search(term) {
    const t = term.trim().toLowerCase();
    const res = this.books.filter(
      b =>
        b.title.toLowerCase().includes(t) ||
        b.author.toLowerCase().includes(t)
    );
    this.logger.log(`Search '${term}' → ${res.length} results.`);
    return res;
  }

  seedDemoData() {
    if (this.books.length === 0) {
      this.addBook("b1", "Clean Code", "Robert C. Martin");
      this.addBook("b2", "Design Patterns", "GoF");
    }
    if (this.members.length === 0) {
      this.registerMember("m1", "Ada", "ada@example.com");
      this.registerMember("m2", "Linus", "linus@example.com");
    }
    return { ok: true };
  }

  resetAll() {
    this.books = [];
    this.members = [];
    this._persist();
  }
}

const LibraryUI = (() => {
  let service = null;
  let currentSearchTerm = "";
  let lastMemberId = null;

  const $ = sel => document.querySelector(sel);

  function init(libService) {
    service = libService;
    bindEvents();
    renderFull();
  }

  function bindEvents() {
    $("#add").onclick = () => {
      const res = service.addBook(
        $("#id").value,
        $("#title").value,
        $("#author").value
      );
      if (!res.ok) alert(res.error);
      renderFull();
    };

    $("#reg").onclick = () => {
      const res = service.registerMember(
        $("#mid").value,
        $("#mname").value,
        $("#memail").value
      );
      if (!res.ok) alert(res.error);
      renderFull();
    };

    $("#checkout").onclick = () => {
      const res = service.checkoutBook(
        $("#bookId").value,
        $("#memberId").value
      );
      if (!res.ok) {
        alert(res.error);
      } else if (res.member) {
        lastMemberId = res.member.id;
      }
      renderFull();
    };

    $("#search").oninput = e => {
      currentSearchTerm = e.target.value;
      renderInventoryOnly();
    };

    $("#seed").onclick = () => {
      service.seedDemoData();
      alert("Seeded.");
      renderFull();
    };

    $("#reset").onclick = () => {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    };
  }

  function getBooksForDisplay() {
    if (!currentSearchTerm) {
      return service.getState().books;
    }
    return service.search(currentSearchTerm);
  }

  function renderFull() {
    renderInventoryOnly();
    renderMemberPanel(lastMemberId);
  }

  function renderInventoryOnly() {
    const state = service.getState();
    const books = getBooksForDisplay();
    const el = $("#app");

    el.innerHTML =
      `<h3>Inventory</h3>` +
      `<ul>` +
      books
        .map(
          b =>
            `<li><strong>${
              b.available
                ? '<span class="ok">✓</span>'
                : '<span class="no">✗</span>'
            }</strong> ${b.id}: ${b.title} — ${b.author}</li>`
        )
        .join("") +
      `</ul>` +
      `<div class="muted">${state.log.join("<br/>")}</div>`;
  }

  function renderMemberPanel(memberId) {
    const state = service.getState();
    const el = $("#member");

    const targetId = memberId;
    const m = state.members.find(x => x.id === targetId);

    if (m) {
      el.innerHTML = `
        <h3>${m.name}</h3>
        <p>${m.email}</p>
        <p>Fees: $${m.fees}</p>
      `;
    } else {
      el.innerHTML = `<em>No member selected.</em>`;
    }
  }

  return { init };
})();


(function bootstrap(){
  const logger = new Logger();

  const service = new LibraryService({
    bookRepo: new LocalBookRepo(),
    memberRepo: new LocalMemberRepo(),
    paymentProvider: new FakeStripePaymentProvider(),
    notifier: new ConsoleEmailNotifier(),
    logger
  });

  LibraryUI.init(service);
})();
