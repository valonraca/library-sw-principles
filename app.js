import { LibraryService } from "./libraryService.js";
import { LocalStorageRepo } from "./repo.js";


const notifier = {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject}`);
    return true;
  }
};
const payment = {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true, txn: Math.random().toString(36).slice(2) };
  }
};

// Setup repositories
const bookRepo = new LocalStorageRepo("LIB_BOOKS");
const memberRepo = new LocalStorageRepo("LIB_MEMBERS");

// Create our clean service
const service = new LibraryService(bookRepo, memberRepo, notifier, payment);

// --- UI Wiring ---
(function bootstrap(){
  const $ = sel => document.querySelector(sel);

  const renderInventory = () => {
    const books = bookRepo.getAll();
    const html = books.map(b =>
      `<li>${b.id}: ${b.title} — ${b.author} ${b.available ? '✓' : '✗'}</li>`).join('');
    $('#app').innerHTML = `<ul>${html}</ul>`;
  };

  $('#add').onclick = () => {
    try {
      const msg = service.addBook($('#id').value, $('#title').value, $('#author').value);
      renderInventory();
      alert(msg);
    } catch (e) { alert(e.message); }
  };

  $('#reg').onclick = () => {
    try {
      const msg = service.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
      alert(msg);
    } catch (e) { alert(e.message); }
  };

  $('#checkout').onclick = () => {
    try {
      const msg = service.checkoutBook($('#bookId').value, $('#memberId').value);
      alert(msg);
      renderInventory();
    } catch (e) { alert(e.message); }
  };

  // ✅ SEED DEMO DATA — flexible, works for any book/author
  $('#seed').onclick = () => {
    const existing = bookRepo.getAll();

    // If the user already typed something, use that as a base
    const title = $('#title').value || 'Book ' + (existing.length + 1);
    const author = $('#author').value || 'Author ' + (existing.length + 1);
    const id = $('#id').value || 'B' + (Math.random().toString(36).slice(2, 6));

    // Add book to repository
    existing.push({ id, title, author, available: true });
    bookRepo.saveAll(existing);

    renderInventory();
    alert(`Seeded: ${title} by ${author}`);
  };

  
  $('#reset').onclick = () => {
    if (confirm('Are you sure you want to reset all data?')) {
      bookRepo.clear();
      memberRepo.clear();
      renderInventory();
      alert('All data cleared!');
    }
  };

  renderInventory();
})();
