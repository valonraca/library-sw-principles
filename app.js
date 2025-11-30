import { LibraryService } from "./libraryservice.js";
import { BookRepo, MemberRepo } from "./repos.js";

// Payment adapter
const payment = {
  charge(amount, card) {
    console.log(`[Payment] Charging $${amount} to ${card}`);
    return { ok: true };
  }
};

// Email adapter
const notifier = {
  send(to, subject, body) {
    console.log(`[Email] → ${to} | ${subject} | ${body}`);
  }
};

// Build the domain service with injected dependencies
const service = new LibraryService(
  new BookRepo(),
  new MemberRepo(),
  notifier,
  payment
);

// ---------------- UI RENDERING -----------------

function renderInventory() {
  const books = service.books.all();
  document.querySelector("#app").innerHTML =
    `<h3>Inventory</h3><ul>` +
    books
      .map(
        b =>
          `<li>${
            b.available ? "✓" : "✗"
          } ${b.id}: ${b.title} — ${b.author}</li>`
      )
      .join("") +
    `</ul>`;
}

function renderMember(id) {
  const m = service.members.get(id);
  const el = document.querySelector("#member");

  if (!m) {
    el.innerHTML = "<em>No member selected</em>";
  } else {
    el.innerHTML = `<h3>${m.name}</h3>
                    <p>${m.email}</p>
                    <p>Fees: $${m.fees}</p>`;
  }
}

// ---------------- EVENT HANDLERS -----------------

document.getElementById("add").onclick = () => {
  const r = service.addBook(id.value, title.value, author.value);
  alert(r.error || "Book added!");
  renderInventory();
};

document.getElementById("reg").onclick = () => {
  const r = service.registerMember(mid.value, mname.value, memail.value);
  alert(r.error || "Member registered!");
};

document.getElementById("checkout").onclick = () => {
  const r = service.checkoutBook(bookId.value, memberId.value);
  alert(r.error || "Checkout complete!");
  renderInventory();
  renderMember(memberId.value);
};

document.getElementById("search").oninput = e => {
  service.search(e.target.value);
  renderInventory();
};

document.getElementById("seed").onclick = () => {
  if (service.books.all().length === 0) {
    service.addBook("b1", "Clean Code", "Robert C. Martin");
    service.addBook("b2", "Design Patterns", "GoF");
  }
  if (service.members.all().length === 0) {
    service.registerMember("m1", "Ada", "ada@example.com");
    service.registerMember("m2", "Linus", "linus@example.com");
  }
  alert("Seeded!");
  renderInventory();
};

document.getElementById("reset").onclick = () => {
  localStorage.clear();
  location.reload();
};

// Initial render
renderInventory();
