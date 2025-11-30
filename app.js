// -------------------- Storage Repos (SRP) --------------------
class BookRepo {
  load() {
    return JSON.parse(localStorage.getItem("LIB_DATA_BOOKS") || "[]");
  }
  save(books) {
    localStorage.setItem("LIB_DATA_BOOKS", JSON.stringify(books));
  }
}

class MemberRepo {
  load() {
    return JSON.parse(localStorage.getItem("LIB_DATA_MEMBERS") || "[]");
  }
  save(members) {
    localStorage.setItem("LIB_DATA_MEMBERS", JSON.stringify(members));
  }
}


// -------------------- Domain Service (SRP + OCP) --------------------
class LibraryService {
  constructor(bookRepo, memberRepo, notifier, payments) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.notifier = notifier;   // OCP port
    this.payments = payments;   // OCP port

    this.books = bookRepo.load();
    this.members = memberRepo.load();
  }

  addBook(id, title, author) {
    if (!id || !title) throw new Error("Missing fields");
    this.books.push({ id, title, author, available: true });
    this.bookRepo.save(this.books);
  }

  registerMember(id, name, email) {
    if (!email.includes("@")) throw new Error("Invalid email");
    this.members.push({ id, name, email, fees: 0 });
    this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
    this.memberRepo.save(this.members);
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111") {
    const b = this.books.find(x => x.id === bookId);
    const m = this.members.find(x => x.id === memberId);
    if (!b) throw new Error("Book not found");
    if (!m) throw new Error("Member not found");
    if (!b.available) throw new Error("Book already checked out");

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;

    if (fee > 0) {
      const res = this.payments.charge(fee, card);
      if (!res.ok) throw new Error("Payment failed");
      m.fees += fee;
    }

    b.available = false;
    this.notifier.send(m.email, "Checkout", `You borrowed ${b.title}. Fee: $${fee}`);

    this.bookRepo.save(this.books);
    this.memberRepo.save(this.members);
  }

  search(term) {
    const t = term.trim().toLowerCase();
    return this.books.filter(b =>
      b.title.toLowerCase().includes(t) ||
      b.author.toLowerCase().includes(t)
    );
  }

  findMember(id) {
    return this.members.find(m => m.id === id);
  }
}


// -------------------- UI Layer (DOM Only) --------------------
const UI = {
  renderInventory(books, sel) {
    const el = document.querySelector(sel);
    el.innerHTML =
      `<h3>Inventory</h3>` +
      `<ul>` +
      books.map(b =>
        `<li>
           <strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong>
           ${b.id}: ${b.title} — ${b.author}
         </li>`
      ).join('') +
      `</ul>`;
  },

  renderMember(member, sel) {
    const el = document.querySelector(sel);
    if (!member) {
      el.innerHTML = "<em>No member selected.</em>";
    } else {
      el.innerHTML =
        `<h3>${member.name}</h3>
         <p>${member.email}</p>
         <p>Fees: $${member.fees}</p>`;
    }
  }
};


// -------------------- Wiring (Composition Root) --------------------
const notifier = {
  send(to, subject, body) {
    console.log("[Email]", { to, subject, body });
    return true;
  }
};

const payments = {
  charge(amount, card) {
    console.log("[Pay]", { amount, card });
    return { ok: true };
  }
};

const service = new LibraryService(new BookRepo(), new MemberRepo(), notifier, payments);


// -------------------- Bootstrapping UI Events --------------------
(function bootstrap() {
  const $ = sel => document.querySelector(sel);

  UI.renderInventory(service.books, "#app");

  $("#add").onclick = () => {
    try {
      service.addBook($("#id").value, $("#title").value, $("#author").value);
      UI.renderInventory(service.books, "#app");
    } catch (e) {
      alert(e.message);
    }
  };

  $("#reg").onclick = () => {
    try {
      service.registerMember($("#mid").value, $("#mname").value, $("#memail").value);
    } catch (e) {
      alert(e.message);
    }
  };

  $("#checkout").onclick = () => {
    try {
      service.checkoutBook($("#bookId").value, $("#memberId").value);
      UI.renderInventory(service.books, "#app");
      UI.renderMember(service.findMember($("#memberId").value), "#member");
    } catch (e) {
      alert(e.message);
    }
  };

  $("#search").oninput = e => {
    const results = service.search(e.target.value);
    UI.renderInventory(results, "#app");
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
    UI.renderInventory(service.books, "#app");
    alert("Seeded.");
  };

  $("#reset").onclick = () => {
    localStorage.removeItem("LIB_DATA_BOOKS");
    localStorage.removeItem("LIB_DATA_MEMBERS");
    location.reload();
  };
})();
