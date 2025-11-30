// --- App wiring layer: connects DOM to domain service ---

// Helper to select elements
const $ = sel => document.querySelector(sel);

// Create infrastructure objects
const storage = new LocalStorageAdapter();
const bookRepo = new BookRepo(storage);
const memberRepo = new MemberRepo(storage);

// Inject ports (notifier + payment)
const notifier = ConsoleNotifier;
const payment = FakePaymentProvider;

// Create fee policy
const feePolicy = new SimpleLateFeePolicy();

// Create the domain service (no DOM, no localStorage inside it)
const libraryService = new LibraryService({
  bookRepo,
  memberRepo,
  notifier,
  payment,
  feePolicy   
});


// ----- UI Rendering -----

function renderInventory(books = bookRepo.getAll()) {
  const el = $('#app');
  el.innerHTML =
    '<h3>Inventory</h3>' +
    '<ul>' +
    books
      .map(
        b =>
          `<li><strong>${
            b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'
          }</strong> ${b.id}: ${b.title} — ${b.author}</li>`
      )
      .join('') +
    '</ul>';
}

function renderMember(memberId) {
  const container = $('#member');
  const member = memberRepo.getById(memberId);
  if (!member) {
    container.innerHTML = '<em>No member selected.</em>';
    return;
  }
  container.innerHTML = `
    <h3>${member.name}</h3>
    <p>${member.email}</p>
    <p>Fees: $${member.fees}</p>
  `;
}

// ----- Event Handlers -----

$('#add').onclick = () => {
  try {
    libraryService.addBook($('#id').value, $('#title').value, $('#author').value);
    renderInventory();
  } catch (e) {
    alert(e.message);
  }
};

$('#reg').onclick = () => {
  try {
    libraryService.registerMember(
      $('#mid').value,
      $('#mname').value,
      $('#memail').value
    );
  } catch (e) {
    alert(e.message);
  }
};

$('#checkout').onclick = () => {
  try {
    const result = libraryService.checkoutBook(
      $('#bookId').value,
      $('#memberId').value
    );
    renderInventory();
    renderMember(result.member.id);
  } catch (e) {
    alert(e.message);
  }
};

$('#search').oninput = e => {
  const results = libraryService.searchBooks(e.target.value);
  renderInventory(results);
};

$('#seed').onclick = () => {
  if (bookRepo.getAll().length === 0) {
    libraryService.addBook('b1', 'Clean Code', 'Robert C. Martin');
    libraryService.addBook('b2', 'Design Patterns', 'GoF');
  }
  if (memberRepo.getAll().length === 0) {
    libraryService.registerMember('m1', 'Ada', 'ada@example.com');
    libraryService.registerMember('m2', 'Linus', 'linus@example.com');
  }
  alert('Seeded.');
  renderInventory();
};

$('#reset').onclick = () => {
  localStorage.removeItem('LIB_DATA');
  location.reload();
};

// Initial render
renderInventory();
$('#member').innerHTML = '<em>No member selected.</em>';