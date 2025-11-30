/* OCP Principle
  Creating two interfaces that define the requirements of a payment service
  and a notifier service. They enable the swap of services easily, therefore
  makes the system easy to extend without modifying LibraryService.
  These two functions let me plug in any payment or email system.*/
function PaymentPort() {}
PaymentPort.prototype.charge = function(amount, card) {
  throw new Error("PaymentPort.charge not implemented");
};

function NotifierPort() {}
NotifierPort.prototype.send = function(to, subject, body) {
  throw new Error("NotifierPort.send not implemented");
};

/* Here are the real payment and email services that will be plugged in the 
ports above and they can be replaced later without touching LibraryService
and with this reenforcing OCP*/
function StripeAdapter() {}
StripeAdapter.prototype = Object.create(PaymentPort.prototype);
StripeAdapter.prototype.charge = function(amount, card) {
  console.log(`[FakeStripe] Charging $${amount} to ${card}`);
  return { ok: true, txn: Math.random().toString(36).slice(2) };
};

function EmailAdapter() {}
EmailAdapter.prototype = Object.create(NotifierPort.prototype);
EmailAdapter.prototype.send = function(to, subject, body) {
  console.log(`[Email] to=${to} subject=${subject} body=${body}`);
  return true;
};

/* These repositories only handle saving or loading data from
local storange and they don't contain domain rules. This follows the
Single Responsibility Principle.*/
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
  let books = this.load();
  books.push(book);
  this.saveAll(books);
};
BookRepo.prototype.update = function(updated) {
  let books = this.load();
  const i = books.findIndex(b => b.id === updated.id);
  books[i] = updated;
  this.saveAll(books);
};

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
MemberRepo.prototype.saveOne = function(m) {
  let members = this.load();
  members.push(m);
  this.saveAll(members);
};

/* Domain service holds the business logic but without touching the
DOM as per the instructions. It adds books, register members and
contains the checkout logic and fees. Also follows the SRP. */
function LibraryService(bookRepo, memberRepo, payment, notifier, logger) {
  this.bookRepo = bookRepo;
  this.memberRepo = memberRepo;
  this.payment = payment;
  this.notifier = notifier;
  this.log = logger || function(){};
}

LibraryService.prototype.addBook = function(id, title, author) {
  if (!id || !title) return { error: "Missing fields" };

  const book = { id, title, author, available: true };
  this.bookRepo.saveOne(book);
  this.log(`Book added: ${title}`);
  return { ok: true, book };
};

LibraryService.prototype.registerMember = function(id, name, email) {
  if (!email || !email.includes("@"))
    return { error: "Invalid email" };

  const m = { id, name, email, fees: 0 };
  this.memberRepo.saveOne(m);

  this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
  this.log(`Member registered: ${name}`);

  return { ok: true, member: m };
};

LibraryService.prototype.checkoutBook = function(bookId, memberId, days = 21, card = "4111-1111") {
  const books = this.bookRepo.load();
  const members = this.memberRepo.load();

  const b = books.find(x => x.id === bookId);
  const m = members.find(x => x.id === memberId);

  if (!b) return { error: "Book not found" };
  if (!m) return { error: "Member not found" };
  if (!b.available) return { error: "Book already checked out" };

  let fee = 0;
  if (days > 14) fee = (days - 14) * 0.5;

  if (fee > 0) {
    const res = this.payment.charge(fee, card);
    if (!res.ok) return { error: "Payment failed" };
    m.fees += fee;
  }

  b.available = false;

  this.notifier.send(m.email, "Checkout", `You borrowed ${b.title}. Fee: $${fee}`);
  this.log(`Checked out ${b.title} → ${m.name} (fee $${fee})`);

  this.bookRepo.update(b);

  members[members.findIndex(x => x.id === m.id)] = m;
  this.memberRepo.saveAll(members);

  return { ok: true, book: b, member: m };
};

/* Also follows SRP because domain logic is not mixed with UI so
each function has a single responsibility.*/

// Create service instance
const service = new LibraryService(
  new BookRepo(localStorage),
  new MemberRepo(localStorage),
  new StripeAdapter(),
  new EmailAdapter(),
  msg => console.log("[LOG]", msg)
);

/* ---------- UI Rendering ---------- */
function loadUI() {
  const books = service.bookRepo.load();
  document.querySelector("#app").innerHTML =
    `<h3>Inventory</h3>
     <ul>
       ${books
         .map(
           b => `<li><strong>${b.available ? "✓" : "✗"}</strong> 
           ${b.id}: ${b.title} — ${b.author}</li>`
         )
         .join("")}
     </ul>`;
}

function renderMemberUI(memberId) {
  const members = service.memberRepo.load();
  const m = members.find(x => x.id === memberId);

  const el = document.querySelector("#member");
  if (!el) return;

  el.innerHTML = m
    ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
    : `<em>No member selected.</em>`;
}

/* Event writing is placed here where UI buttons call LibraryService 
and the updated are done here not in the domain.
SRP is followed because the domain never touches the DOM, and the UI
 never contains business logic */
(function bootstrap() {
  loadUI();

  const $ = s => document.querySelector(s);

  $("#add").onclick = () => {
    const res = service.addBook($("#id").value, $("#title").value, $("#author").value);
    if (res.error) return alert(res.error);
    loadUI();
  };

  $("#reg").onclick = () => {
    const res = service.registerMember($("#mid").value, $("#mname").value, $("#memail").value);
    if (res.error) return alert(res.error);
  };

  $("#checkout").onclick = () => {
    const res = service.checkoutBook($("#bookId").value, $("#memberId").value);
    if (res.error) return alert(res.error);

    // Update UI like the original code did
    loadUI();
    renderMemberUI($("#memberId").value);
  };

  $("#search").oninput = e => {
    const term = e.target.value.toLowerCase().trim();
    const books = service.bookRepo
      .load()
      .filter(
        b =>
          b.title.toLowerCase().includes(term) ||
          b.author.toLowerCase().includes(term)
      );

    document.querySelector("#app").innerHTML =
      `<h3>Inventory (Search)</h3>
       <ul>
        ${books
          .map(
            b => `<li><strong>${b.available ? "✓" : "✗"}</strong> 
            ${b.id}: ${b.title} — ${b.author}</li>`
          )
          .join("")}
       </ul>`;
  };

  $("#seed").onclick = () => {
    if (service.bookRepo.load().length === 0) {
      service.addBook("b1", "Clean Code", "Robert C. Martin");
      service.addBook("b2", "Design Patterns", "GoF");
    }
    if (service.memberRepo.load().length === 0) {
      service.registerMember("m1", "Ada", "ada@example.com");
      service.registerMember("m2", "Linus", "linus@example.com");
    }
    alert("Seeded.");
    loadUI();
  };

  $("#reset").onclick = () => {
    localStorage.clear();
    location.reload();
  };
})();
