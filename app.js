import { Repository } from "./modules/repository.js";
import { ConsoleNotifier, MockPaymentProvider } from "./modules/services.js";
import { Library } from "./modules/library.js";

const bookRepo = new Repository("library_books");
const memberRepo = new Repository("library_members");
const notifier = new ConsoleNotifier();
const payment = new MockPaymentProvider();

const library = new Library(bookRepo, memberRepo, payment, notifier);

const $ = (selector) => document.querySelector(selector);

function renderInventory() {
    const books = library.getAllBooks();
    $("#app").innerHTML = `
        <h3>Inventory</h3>
        <ul>
            ${books
                .map(
                    b => `
                    <li>
                        <span class="${b.available ? "ok" : "no"}">
                            ${b.available ? "✓" : "✗"}
                        </span>
                        <strong>${b.title}</strong> — ${b.author} (${b.id})
                    </li>`
                )
                .join("")}
        </ul>
    `;
}

function renderMember(id) {
    const m = library.getMember(id);
    $("#member").innerHTML = m
        ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
        : "<em>No member selected.</em>";
}

$("#add").onclick = () => {
    try {
        library.addBook($("#id").value, $("#title").value, $("#author").value);
        renderInventory();
    } catch (err) {
        alert(err.message);
    }
};

$("#reg").onclick = () => {
    try {
        library.registerMember($("#mid").value, $("#mname").value, $("#memail").value);
    } catch (err) {
        alert(err.message);
    }
};

$("#checkout").onclick = () => {
    try {
        library.checkoutBook($("#bookId").value, $("#memberId").value);
        renderInventory();
        renderMember($("#memberId").value);
    } catch (err) {
        alert(err.message);
    }
};

$("#search").oninput = (e) => {
    const results = library.searchBooks(e.target.value);
    $("#app").innerHTML = `
        <h3>Search Results</h3>
        <ul>
            ${results.map(b => `<li>${b.title}</li>`).join("")}
        </ul>
    `;
};

$("#seed").onclick = () => {
    localStorage.clear();

    library.addBook("b1", "Clean Code", "Robert C. Martin");
    library.addBook("b2", "Design Patterns", "GoF");

    library.registerMember("m1", "Ada", "ada@example.com");
    library.registerMember("m2", "Linus", "linus@example.com");

    renderInventory();
    alert("Seeded demo data.");
};

$("#reset").onclick = () => {
    localStorage.clear();
    location.reload();
};

renderInventory();
