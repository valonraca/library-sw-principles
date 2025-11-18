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

// New Services
import { BookService } from "./bookService.js";
import { MemberService } from "./memberService.js";
import { CheckoutService } from "./checkoutService.js";

const bookService = new BookService(bookRepo);
const memberService = new MemberService(memberRepo, notifier);
const checkoutService = new CheckoutService(bookService, memberService, payment, notifier);

// --- UI Wiring ---
(function bootstrap() {
  const $ = sel => document.querySelector(sel);

  const renderInventory = () => {
    // Better SRP: the UI should ask the service for books
    const books = bookService.bookRepo.getAll();

    const html = books
      .map(b => `<li>${b.id}: ${b.title} — ${b.author} ${b.available ? '✓' : '✗'}</li>`)
      .join('');

    $('#app').innerHTML = `<ul>${html}</ul>`;
  };

  // Add Book
  $('#add').onclick = () => {
    try {
      bookService.add(
        $('#id').value,
        $('#title').value,
        $('#author').value
      );
      renderInventory();
      alert("Book added!");
    } catch (e) {
      alert(e.message);
    }
  };

  // Register Member
  $('#reg').onclick = () => {
    try {
      memberService.register(
        $('#mid').value,
        $('#mname').value,
        $('#memail').value
      );
      alert("Member registered!");
    } catch (e) {
      alert(e.message);
    }
  };

  // Checkout Book
  $('#checkout').onclick = () => {
    try {
      const msg = checkoutService.checkout(
        $('#bookId').value,
        $('#memberId').value
      );
      alert(msg);
      renderInventory();
    } catch (e) {
      alert(e.message);
    }
  };

  // Seed Demo Book
  $('#seed').onclick = () => {
    const existing = bookRepo.getAll();

    const title = $('#title').value || 'Book ' + (existing.length + 1);
    const author = $('#author').value || 'Author ' + (existing.length + 1);
    const id = $('#id').value || 'B' + (Math.random().toString(36).slice(2, 6));

    existing.push({ id, title, author, available: true });
    bookRepo.saveAll(existing);

    renderInventory();
    alert(`Seeded: ${title} by ${author}`);
  };

  // Reset data
  $('#reset').onclick = () => {
    if (confirm('Are you sure you want to reset all data?')) {
      bookRepo.clear();
      memberRepo.clear();
      renderInventory();
      alert('All data cleared!');
    }
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
