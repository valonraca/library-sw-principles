import { Repository } from './modules/Repository.js';
import { ConsoleNotifier, MockPaymentProvider } from './modules/Services.js';
import { Library } from './modules/Library.js';

// --- Initialization (Dependency Injection) ---
const bookRepo = new Repository('library_books');
const memberRepo = new Repository('library_members');
const notifier = new ConsoleNotifier();
const payment = new MockPaymentProvider();

// Inject dependencies into the Library
const library = new Library(bookRepo, memberRepo, payment, notifier);


// --- UI Logic (The only place touching the DOM) ---
const $ = (selector) => document.querySelector(selector);

const renderInventory = () => {
    const list = library.getAllBooks();
    $('#app').innerHTML = `
        <h3>Inventory</h3>
        <ul>
            ${list.map(b => `
                <li>
                    <span class="${b.available ? 'ok' : 'no'}">${b.available ? '✓' : '✗'}</span> 
                    <strong>${b.title}</strong> by ${b.author} (${b.id})
                </li>
            `).join('')}
        </ul>
    `;
};

const renderMember = (id) => {
    const member = library.getMember(id);
    $('#member').innerHTML = member 
        ? `<h3>${member.name}</h3><p>Fees: $${member.fees}</p>` 
        : '';
};

const handleAction = (actionFn) => {
    try {
        actionFn();
        renderInventory(); // Auto re-render on success
    } catch (error) {
        alert(error.message); // Simple error handling
    }
};

// --- Event Listeners ---

// Add Book
$('#add').onclick = () => handleAction(() => {
    library.addBook($('#id').value, $('#title').value, $('#author').value);
});

// Register Member
$('#reg').onclick = () => handleAction(() => {
    library.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
});

// Checkout
$('#checkout').onclick = () => handleAction(() => {
    library.checkoutBook($('#bookId').value, $('#memberId').value);
    renderMember($('#memberId').value);
});

// Search
$('#search').oninput = (e) => {
    const results = library.searchBooks(e.target.value);
    // Quick inline render for search
    $('#app').innerHTML = `<h3>Search Results</h3><ul>` + 
        results.map(b => `<li>${b.title}</li>`).join('') + `</ul>`;
};

// Seed Data (Reset)
$('#seed').onclick = () => {
    localStorage.clear();
    location.reload();
};

// Initial Render
renderInventory();