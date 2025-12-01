// -----------------------------
// Domain: LibraryService (SRP)
// -----------------------------
class LibraryService {
constructor(repo, paymentProvider, notifier) {
this.repo = repo;
this.paymentProvider = paymentProvider;
this.notifier = notifier;
}

addBook(id, title, author) {
if (!id || !title) throw new Error("Missing fields");
const books = this.repo.getBooks();
books.push({ id, title, author, available: true });
this.repo.saveBooks(books);
}

registerMember(id, name, email) {
if (!email || !email.includes("@")) throw new Error("Invalid email");
const members = this.repo.getMembers();
members.push({ id, name, email, fees: 0 });
this.repo.saveMembers(members);
this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
}

checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
const books = this.repo.getBooks();
const members = this.repo.getMembers();

const b = books.find(x => x.id === bookId);
const m = members.find(x => x.id === memberId);

if (!b) throw new Error("Book not found");
if (!m) throw new Error("Member not found");
if (!b.available) throw new Error("Book already checked out");

let fee = 0;
if (days > 14) fee = (days - 14) * 0.5;

if (fee > 0) {
const res = this.paymentProvider.charge(fee, card);
if (!res.ok) throw new Error("Payment failed");
m.fees += fee;
}

b.available = false;
this.repo.saveBooks(books);
this.repo.saveMembers(members);

this.notifier.send(m.email, "Checkout", `You borrowed ${b.title}. Fee: $${fee}`);
return { fee, member: m, book: b };
}

search(term) {
const books = this.repo.getBooks();
const t = term.trim().toLowerCase();
return books.filter(
b =>
b.title.toLowerCase().includes(t) ||
b.author.toLowerCase().includes(t)
);
}
}

// -----------------------------
// Repository: Storage abstraction
// -----------------------------
class LocalRepo {
constructor() {
const saved = JSON.parse(localStorage.getItem("LIB_DATA") || "{}");
this.books = saved.books || [];
this.members = saved.members || [];
}

save() {
localStorage.setItem(
"LIB_DATA",
JSON.stringify({ books: this.books, members: this.members })
);
}

getBooks() {
return this.books;
}

getMembers() {
return this.members;
}

saveBooks(b) {
this.books = b;
this.save();
}

saveMembers(m) {
this.members = m;
this.save();
}
}

// -----------------------------
// Providers (OCP)
// -----------------------------
const PaymentProvider = {
charge(amount, card) {
console.log(`[FakeStripe] Charging $${amount} to ${card}`);
return { ok: true };
}
};

const Notifier = {
send(to, subject, body) {
console.log(`[Email] to=${to} subject=${subject} body=${body}`);
return true;
}
};

// -----------------------------
// UI Layer (purely UI)
// -----------------------------
const repo = new LocalRepo();
const service = new LibraryService(repo, PaymentProvider, Notifier);

function renderInventory() {
const list = repo.getBooks()
.map(b => `<li>${b.available ? "✓" : "✗"} ${b.id}: ${b.title} - ${b.author}</li>`)
.join("");

document.querySelector("#app").innerHTML = `
<h3>Inventory</h3>
<ul>${list}</ul>
`;
}

function renderMember(id) {
const m = repo.getMembers().find(x => x.id === id);
document.querySelector("#member").innerHTML =
m
? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
: "<em>No member selected.</em>";
}

// -----------------------------
// Bootstrap UI events
// -----------------------------
(function start() {
renderInventory();

const $ = s => document.querySelector(s);

$("#add").onclick = () => {
try {
service.addBook($("#id").value, $("#title").value, $("#author").value);
renderInventory();
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
const res = service.checkoutBook($("#bookId").value, $("#memberId").value);
renderInventory();
renderMember(res.member.id);
} catch (e) {
alert(e.message);
}
};

$("#search").oninput = e => {
const results = service.search(e.target.value);
const list = results
.map(b => `<li>${b.id}: ${b.title}</li>`)
.join("");
document.querySelector("#app").innerHTML = `<ul>${list}</ul>`;
};

$("#seed").onclick = () => {
if (repo.getBooks().length === 0) {
service.addBook("b1", "Clean Code", "Robert C. Martin");
service.addBook("b2", "Design Patterns", "GoF");
}
if (repo.getMembers().length === 0) {
service.registerMember("m1", "Ada", "ada@example.com");
service.registerMember("m2", "Linus", "linus@example.com");
}
renderInventory();
alert("Seeded.");
};

$("#reset").onclick = () => {
localStorage.removeItem("LIB_DATA");
location.reload();
};
})();