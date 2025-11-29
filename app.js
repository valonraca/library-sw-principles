// STORAGE LAYER (Repository Abstraction)

const repo = {
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem("LIB_DATA") || "{}");
      return {
        books: raw.books || [],
        members: raw.members || []
      };
    } catch (e) {
      return { books: [], members: [] };
    }
  },

  save(data) {
    localStorage.setItem("LIB_DATA", JSON.stringify(data));
  }
};


// PAYMENT PROVIDER (OCP: Injectable)

const paymentProvider = {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true, txn: Math.random().toString(36).slice(2) };
  }
};


// NOTIFIER (OCP: Injectable)

const notifier = {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
};


// DOMAIN LAYER (SRP: Pure Business Logic)

class LibraryService {
  constructor(repo, paymentProvider, notifier) {
    this.repo = repo;
    this.paymentProvider = paymentProvider;
    this.notifier = notifier;

    const data = repo.load();
    this.books = data.books;
    this.members = data.members;
    this.log = [];
  }

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log("[LOG]", msg);
  }

  save() {
    this.repo.save({
      books: this.books,
      members: this.members
    });
  }

  addBook(id, title, author) {
    if (!id || !title) {
      return { ok: false, error: "Missing fields" };
    }

    this.books.push({ id, title, author, available: true });
    this._log(`Book added: ${title}`);
    this.save();

    return { ok: true };
  }

  registerMember(id, name, email) {
    if (!email || !email.includes("@")) {
      return { ok: false, error: "Invalid email" };
    }

    this.members.push({ id, name, email, fees: 0 });
    this._log(`Member registered: ${name}`);
    this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
    this.save();

    return { ok: true };
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
    const b = this.books.find(x => x.id === bookId);
    if (!b) return { ok: false, error: "Book not found" };

    const m = this.members.find(x => x.id === memberId);
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
    this._log(`Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee}).`);
    this.notifier.send(m.email, "Checkout", `You borrowed ${b.title}. Fee: $${fee}`);
    this.save();

    return { ok: true, fee };
  }

  search(term) {
    const t = term.trim().toLowerCase();
    return this.books.filter(
      b => b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t)
    );
  }
}


// UI LAYER (Now separate from domain logic)

function renderInventory(service, sel) {
  const el = document.querySelector(sel);
  el.innerHTML =
    `<h3>Inventory</h3>` +
    `<ul>` +
    service.books
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
    `<div class="muted">${service.log.slice(-3).join("<br/>")}</div>`;
}

function renderMember(service, memberId, sel) {
  const m = service.members.find(x => x.id === memberId);
  const el = document.querySelector(sel);
  el.innerHTML = m
    ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
    : "<em>No member selected.</em>";
}


// APPLICATION BOOTSTRAP

(function bootstrap() {
  const service = new LibraryService(repo, paymentProvider, notifier);

  const $ = sel => document.querySelector(sel);

  const refreshUI = () => {
    renderInventory(service, "#app");
  };

  refreshUI();

  $("#add").onclick = () => {
    const res = service.addBook($("#id").value, $("#title").value, $("#author").value);
    if (!res.ok) alert(res.error);
    refreshUI();
  };

  $("#reg").onclick = () => {
    const res = service.registerMember($("#mid").value, $("#mname").value, $("#memail").value);
    if (!res.ok) alert(res.error);
    refreshUI();
  };

  $("#checkout").onclick = () => {
    const res = service.checkoutBook($("#bookId").value, $("#memberId").value);
    if (!res.ok) alert(res.error);
    refreshUI();
    renderMember(service, $("#memberId").value, "#member");
  };

  $("#search").oninput = e => {
    service.search(e.target.value); 
    refreshUI();
  };

  $("#seed").onclick = () => {
    if (service.books.length === 0) {
      service.addBook("b1", "Clean Code", "Robert C. Martin");
      service.addBook("b2", "Design Patterns", "GoF");
    }
    if (service.members.length === 0) {
      service.registerMember("m1", "Ada", "ada@example.com");
      service.registerMember("m2", "Linus", "linus@example.com");
    }
    alert("Seeded.");
    refreshUI();
  };

  $("#reset").onclick = () => {
    localStorage.removeItem("LIB_DATA");
    location.reload();
  };
})();