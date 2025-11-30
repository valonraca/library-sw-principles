// ============================
// Services (SRP)
// ============================

class PaymentService {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true, txn: Math.random().toString(36).slice(2) };
  }
}

class MailService {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
}

class StorageService {
  load() {
    try {
      return JSON.parse(localStorage.getItem("LIB_DATA") || "{}");
    } catch {
      return {};
    }
  }

  save(data) {
    localStorage.setItem("LIB_DATA", JSON.stringify(data));
  }
}

// ============================
// Library Core (Domain)
// ============================

class LibraryCore {
  constructor(payment, mailer, storage) {
    this.payment = payment;
    this.mailer = mailer;
    this.storage = storage;

    this.books = [];
    this.members = [];
    this.log = [];
  }

  // Persistence
  load() {
    const data = this.storage.load();
    this.books = data.books || [];
    this.members = data.members || [];
    this._log(`Loaded ${this.books.length} books & ${this.members.length} members.`);
  }

  save() {
    this.storage.save({ books: this.books, members: this.members });
    this._log("Saved data.");
  }

  // Domain actions
  addBook(id, title, author) {
    if (!id || !title) return alert("Missing fields");
    this.books.push({ id, title, author, available: true });
    this._log(`Book added: ${title}`);
    this.save();
  }

  registerMember(id, name, email) {
    if (!email.includes("@")) return alert("Invalid email");
    this.members.push({ id, name, email, fees: 0 });
    this._log(`Member registered: ${name}`);
    this.mailer.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
    this.save();
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
    const b = this.books.find(x => x.id === bookId);
    const m = this.members.find(x => x.id === memberId);

    if (!b) return alert("Book not found");
    if (!m) return alert("Member not found");
    if (!b.available) return alert("Book already checked out");

    let fee = Math.max(0, (days - 14) * 0.5);

    if (fee > 0) {
      const result = this.payment.charge(fee, card);
      if (!result.ok) return alert("Payment failed");
      m.fees += fee;
    }

    b.available = false;
    this._log(`Checked out ${b.title} to ${m.name} (fee=$${fee}).`);
    this.mailer.send(m.email, "Checkout", `You borrowed ${b.title}. Fee: $${fee}`);

    this.save();
  }

  search(term) {
    const t = term.trim().toLowerCase();
    const res = this.books.filter(
      b => b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t)
    );
    this._log(`Search '${term}' → ${res.length} results.`);
    return res;
  }

  // Logging
  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log("[LOG]", msg);
  }
}

// ============================
// UI + Composition (Bootstrap)
// ============================

const Library = new LibraryCore(
  new PaymentService(),
  new MailService(),
  new StorageService()
);

// UI functions stay the same as before
(function bootstrap() {
  Library.load();

  Library.renderInventory = function (sel) {
    const el = document.querySelector(sel);
    el.innerHTML =
      `<h3>Inventory</h3>` +
      `<ul>` +
      this.books
        .map(
          b =>
            `<li><strong>${b.available ? "✓" : "✗"}</strong> ${b.id}: ${b.title} — ${b.author}</li>`
        )
        .join("") +
      `</ul>` +
      `<div class="muted">${this.log.slice(-3).join("<br/>")}</div>`;
  };

  Library.renderMember = function (memberId, sel) {
    const m = this.members.find(x => x.id === memberId);
    const el = document.querySelector(sel);
    el.innerHTML = m
      ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
      : "<em>No member selected.</em>";
  };

  const $ = sel => document.querySelector(sel);

  $('#add').onclick = () =>
    Library.addBook($('#id').value, $('#title').value, $('#author').value);

  $('#reg').onclick = () =>
    Library.registerMember($('#mid').value, $('#mname').value, $('#memail').value);

  $('#checkout').onclick = () =>
    Library.checkoutBook($('#bookId').value, $('#memberId').value);

  $('#search').oninput = e => Library.search(e.target.value);

  $('#seed').onclick = () => {
    if (Library.books.length === 0) {
      Library.addBook("b1", "Clean Code", "Robert C. Martin");
      Library.addBook("b2", "Design Patterns", "GoF");
    }
    if (Library.members.length === 0) {
      Library.registerMember("m1", "Ada", "ada@example.com");
      Library.registerMember("m2", "Linus", "linus@example.com");
    }
    alert("Seeded.");
  };

  $('#reset').onclick = () => {
    localStorage.removeItem("LIB_DATA");
    location.reload();
  };

  Library.renderInventory("#app");
})();
