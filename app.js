// ------------------------
// Domain: CoreLibrary (SRP)
// ------------------------
class CoreLibrary {
constructor(store, payService, notifyService) {
this.store = store;
this.payService = payService;
this.notifyService = notifyService;
}

addBook(id, title, author) {
if (!id || !title) {
throw new Error("Book id and title are required");
}

const books = this.store.loadBooks();
books.push({ id, title, author, available: true });
this.store.saveBooks(books);
}

addMember(id, name, email) {
if (!email || !email.includes("@")) {
throw new Error("Invalid email");
}

const members = this.store.loadMembers();
members.push({ id, name, email, fees: 0 });
this.store.saveMembers(members);

this.notifyService.send(email, "Welcome", `Your member id is ${id}.`);
}

checkout(idBook, idMember, days = 21, card = "4111-4444") {
const books = this.store.loadBooks();
const members = this.store.loadMembers();

const book = books.find(b => b.id === idBook);
const member = members.find(m => m.id === idMember);

if (!book) throw new Error("Book not found");
if (!member) throw new Error("Member not found");
if (!book.available) throw new Error("Book already checked out");

let fee = 0;
if (days > 14) {
fee = (days - 14) * 0.5;
const result = this.payService.charge(fee, card);
if (!result.ok) throw new Error("Payment failed");
member.fees += fee;
}

book.available = false;
this.store.saveBooks(books);
this.store.saveMembers(members);

this.notifyService.send(member.email, "Checkout Complete", `You borrowed ${book.title}. Fee: $${fee}`);
return { book, member, fee };
}

find(term) {
const books = this.store.loadBooks();
const lower = term.toLowerCase();
return books.filter(
b => b.title.toLowerCase().includes(lower) || b.author.toLowerCase().includes(lower)
);
}
}

// ------------------------
// Storage Layer
// ------------------------
class LocalStore {
constructor() {
const saved = JSON.parse(localStorage.getItem("LMS_DATA") || "{}");
this.books = saved.books || [];
this.members = saved.members || [];
}

persist() {
localStorage.setItem(
"LMS_DATA",
JSON.stringify({ books: this.books, members: this.members })
);
}

loadBooks() {
return this.books;
}

loadMembers() {
return this.members;
}

saveBooks(b) {
this.books = b;
this.persist();
}

saveMembers(m) {
this.members = m;
this.persist();
}
}

// ------------------------
// Providers (OCP)
// ------------------------
const SimplePayment = {
charge(amount, card) {
console.log(`[Pay] Charging ${amount} to ${card}`);
return { ok: true };
}
};

const SimpleNotify = {
send(to, subject, body) {
console.log(`[Mail] to=${to} | ${subject} | ${body}`);
return true;
}
};

// ------------------------
// UI Wiring (Separated UI)
// ------------------------
const store = new LocalStore();
const service = new CoreLibrary(store, SimplePayment, SimpleNotify);

function renderBooks() {
const books = store.loadBooks();
const html = books
.map(b => `<li>${b.available ? "✓" : "✗"} ${b.id}: ${b.title} - ${b.author}</li>`)
.join("");
document.querySelector("#app").innerHTML = `<h3>Books</h3><ul>${html}</ul>`;
}

function renderMember(id) {
const member = store.loadMembers().find(m => m.id === id);
document.querySelector("#member").innerHTML =
member
? `<h3>${member.name}</h3><p>${member.email}</p><p>Fees: ${member.fees}</p>`
: "<em>No member selected.</em>";
}

(function init() {
renderBooks();

const $ = s => document.querySelector(s);

$("#add").onclick = () => {
try {
service.addBook($("#id").value, $("#title").value, $("#author").value);
renderBooks();
} catch (e) {
alert(e.message);
}
};

$("#reg").onclick = () => {
try {
service.addMember($("#mid").value, $("#mname").value, $("#memail").value);
} catch (e) {
alert(e.message);
}
};

$("#checkout").onclick = () => {
try {
const res = service.checkout($("#bookId").value, $("#memberId").value);
renderBooks();
renderMember(res.member.id);
} catch (e) {
alert(e.message);
}
};

$("#search").oninput = e => {
const results = service.find(e.target.value);
const list = results.map(b => `<li>${b.id}: ${b.title}</li>`).join("");
document.querySelector("#app").innerHTML = `<ul>${list}</ul>`;
};

$("#seed").onclick = () => {
if (store.loadBooks().length === 0) {
service.addBook("b1", "Clean Architecture", "Robert Martin");
service.addBook("b2", "Refactoring", "Martin Fowler");
}
if (store.loadMembers().length === 0) {
service.addMember("m1", "Grace", "grace@ex.com");
service.addMember("m2", "Alan", "alan@ex.com");
}
renderBooks();
alert("Seeded");
};

$("#reset").onclick = () => {
localStorage.removeItem("LMS_DATA");
location.reload();
};
})();