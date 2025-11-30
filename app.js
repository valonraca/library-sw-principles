import { LibraryService } from './src/libraryService.js';
import { LocalStorageBookRepository } from './src/localStorageBookRepository.js';
import { LocalStorageMemberRepository } from './src/localStorageMemberRepository.js';

import { FakeStripePayment } from './src/fakeStripePayment.js';
import { AlertNotifier } from './src/alertNotifier.js';

// === Repository ===
const bookRepo = new LocalStorageBookRepository();
const memberRepo = new LocalStorageMemberRepository();

// === Adapters ===
const payment = new FakeStripePayment();
const notifier = new AlertNotifier();

// === Domain service ===
const library = new LibraryService(bookRepo, memberRepo, payment, notifier);

// === Rendering helpers ===
function renderBooks() {
  const books = bookRepo.getAll();
  const el = document.querySelector("#app");

  el.innerHTML = `
    <h3>Inventory</h3>
    <ul>
      ${books
        .map(
          b =>
            `<li>
              <strong>${b.available ? "✓" : "✗"}</strong>
              ${b.id}: ${b.title} — ${b.author}
            </li>`
        )
        .join("")}
    </ul>
  `;
}

function renderMember(memberId) {
  const member = memberRepo.find(memberId);
  const el = document.querySelector("#member");

  if (!member) {
    el.innerHTML = `<em>No member selected.</em>`;
    return;
  }

  el.innerHTML = `
    <h3>${member.name}</h3>
    <p>${member.email}</p>
    <p>Fees: $${member.fees}</p>
  `;
}

// === Event wiring ===
(function bootstrap() {
  renderBooks();

  const $ = s => document.querySelector(s);

  $('#add').onclick = () => {
    const id = $('#id').value;
    const title = $('#title').value;
    const author = $('#author').value;

    const res = library.addBook(id, title, author);

    if (!res.ok) alert(res.error);
    renderBooks();
  };

  $('#reg').onclick = () => {
    const res = library.registerMember(
      $('#mid').value,
      $('#mname').value,
      $('#memail').value
    );
    if (!res.ok) alert(res.error);
  };

  $('#checkout').onclick = () => {
    const res = library.checkoutBook(
      $('#bookId').value,
      $('#memberId').value
    );

    if (!res.ok) alert(res.error);
    renderBooks();
    renderMember($('#memberId').value);
  };

  $('#search').oninput = e => {
    const term = e.target.value;
    const results = library.search(term);

    const el = document.querySelector("#app");
    el.innerHTML = `
      <h3>Search Results</h3>
      <ul>
        ${results
          .map(
            b =>
              `<li>
                <strong>${b.available ? "✓" : "✗"}</strong>
                ${b.id}: ${b.title} — ${b.author}
              </li>`
          )
          .join("")}
      </ul>
    `;
  };

  $('#seed').onclick = () => {
    if (bookRepo.getAll().length === 0) {
      library.addBook('b1', 'Clean Code', 'Robert C. Martin');
      library.addBook('b2', 'Design Patterns', 'GoF');
    }

    if (memberRepo.getAll().length === 0) {
      library.registerMember('m1', 'Ada', 'ada@example.com');
      library.registerMember('m2', 'Linus', 'linus@example.com');
    }

    alert('Seeded');
    renderBooks();
  };

  $('#reset').onclick = () => {
    bookRepo.clear();
    memberRepo.clear();
    location.reload();
  };
})();
