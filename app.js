class Book {
  constructor(id, title, author, available = true) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.available = available;
  }
}

class Member {
  constructor(id, name, email, fees = 0) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.fees = fees;
  }
}

class LocalStorageBookRepo {
  loadAll() {
    try {
      const data = JSON.parse(localStorage.getItem('LIB_BOOKS') || '[]');
      return data.map(b => new Book(b.id, b.title, b.author, b.available));
    } catch (e) {
      console.error("Error loading books:", e);
      return [];
    }
  }
  saveAll(books) {
    localStorage.setItem('LIB_BOOKS', JSON.stringify(books));
  }
}

class LocalStorageMemberRepo {
  loadAll() {
    try {
      const data = JSON.parse(localStorage.getItem('LIB_MEMBERS') || '[]');
      return data.map(m => new Member(m.id, m.name, m.email, m.fees));
    } catch (e) {
      console.error("Error loading members:", e);
      return [];
    }
  }
  saveAll(members) {
    localStorage.setItem('LIB_MEMBERS', JSON.stringify(members));
  }
}

class ConsoleNotifier {
  send(to, subject, body) {
    console.log(`[Notifier] Sending email to: ${to} | Subject: ${subject}`);
    console.log(`[Notifier] Body: ${body}`);
    return true;
  }
}

class FakePaymentProvider {
  charge(amount, card) {
    if (amount > 100) {
      console.log(`[PaymentProvider] Simulation: Payment declined for amount $${amount}`);
      return { ok: false, txn: null };
    }
    console.log(`[PaymentProvider] Charging $${amount} to ${card}`);
    return { ok: true, txn: Math.random().toString(36).slice(2) };
  }
}

class LibraryService {
  constructor(bookRepo, memberRepo, notifier, paymentProvider) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.notifier = notifier;
    this.paymentProvider = paymentProvider;

    this.books = this.bookRepo.loadAll();
    this.members = this.memberRepo.loadAll();
  }

  load() {
    this.books = this.bookRepo.loadAll();
    this.members = this.memberRepo.loadAll();
    return { bookCount: this.books.length, memberCount: this.members.length };
  }

  save() {
    this.bookRepo.saveAll(this.books);
    this.memberRepo.saveAll(this.members);
  }

  addBook(id, title, author) {
    if (!id || !title || !author) {
      throw new Error('Book fields (ID, Title, Author) are required.');
    }
    if (this.books.some(b => b.id === id)) {
      throw new Error(`Book with ID ${id} already exists.`);
    }
    this.books.push(new Book(id, title, author));
    this.save();
  }

  registerMember(id, name, email) {
    if (!email || email.indexOf('@') < 0) {
      throw new Error('Invalid email format.');
    }
    if (this.members.some(m => m.id === id)) {
      throw new Error(`Member with ID ${id} already registered.`);
    }

    const newMember = new Member(id, name, email);
    this.members.push(newMember);

    this.notifier.send(
      email,
      'Welcome to the Library!',
      `Hi ${name}, your member ID is ${id}.`
    );

    this.save();
  }

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const book = this.books.find(x => x.id === bookId);
    const member = this.members.find(x => x.id === memberId);

    if (!book) throw new Error('Book not found.');
    if (!member) throw new Error('Member not found.');
    if (!book.available) throw new Error(`Book "${book.title}" is already checked out.`);

    let fee = 0;
    const LATE_FEE_RATE = 0.50;
    const FREE_DAYS = 14;

    if (days > FREE_DAYS) {
      fee = (days - FREE_DAYS) * LATE_FEE_RATE;
    }

    if (fee > 0) {
      const res = this.paymentProvider.charge(fee, card);
      if (!res.ok) {
        throw new Error(`Payment processing failed for fee of $${fee.toFixed(2)}.`);
      }
      member.fees += fee;
    }

    book.available = false;

    this.notifier.send(
      member.email,
      'Book Checkout Confirmation',
      `You borrowed ${book.title}. Fee: $${fee.toFixed(2)}.`
    );

    this.save();

    return {
      bookTitle: book.title,
      memberName: member.name,
      feePaid: fee
    };
  }

  search(term) {
    const t = term.trim().toLowerCase();
    if (!t) return this.books;
    return this.books.filter(b =>
      b.title.toLowerCase().includes(t) ||
      b.author.toLowerCase().includes(t)
    );
  }

  getBooks() {
    return this.books;
  }

  getMember(id) {
    return this.members.find(x => x.id === id);
  }
}

let libraryService;

const $ = sel => document.querySelector(sel);
const log = [];

function renderInventory(books, searchTerm = '') {
  const el = $('#app');
  if (!el) return;

  const allBooks = libraryService.getBooks();

  const filteredBooks = searchTerm
    ? allBooks.filter(b =>
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.author.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allBooks;

  // book-count is optional (index.html doesn't have it)
  const bookCountEl = $('#book-count');
  if (bookCountEl) {
    bookCountEl.textContent = allBooks.length;
  }

  el.innerHTML =
    `<ul class="space-y-1 list-none p-0">` +
    filteredBooks
      .map(
        b =>
          `<li class="p-2 border-b border-gray-100 last:border-b-0">
              <strong class="${b.available ? 'ok' : 'no'}">${b.available ? '✓' : '✗'}</strong>
              <span class="font-mono text-sm text-gray-500">${b.id}:</span>
              ${b.title} —
              <em class="text-gray-600">${b.author}</em>
            </li>`
      )
      .join('') +
    `</ul>`;
}

function renderMember(memberId, sel) {
  const container = document.querySelector(sel);
  if (!container) return;

  const m = libraryService.getMember(memberId);

  if (m) {
    container.innerHTML = `
      <p class="font-semibold text-gray-700">${m.name}</p>
      <p class="text-sm text-gray-500">${m.email}</p>
      <p class="text-sm font-bold text-red-500">Outstanding Fees: $${m.fees.toFixed(2)}</p>
    `;
  } else {
    container.innerHTML = '<em>No member selected or found.</em>';
  }
}

function updateLog(msg) {
  const stamp = new Date().toLocaleTimeString();
  const logMsg = `${stamp} — ${msg}`;
  log.push(logMsg);
  if (log.length > 50) log.shift();

  const logEl = $('#log-output');
  if (logEl) {
    logEl.innerHTML = log.slice(-3).join('<br/>');
  }

  console.log('[App Log]', msg);
}

function displayMessage(type, message) {
  const el = $('#status-message');

  if (el) {
    el.innerHTML = `<div class="${type}-message">${message}</div>`;
    setTimeout(() => (el.innerHTML = ''), 4000);
  } else {
    // Fallback: log to console if no status element exists in HTML
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const addBtn = $('#add');
  const regBtn = $('#reg');
  const checkoutBtn = $('#checkout');
  const searchInput = $('#search');
  const seedBtn = $('#seed');
  const resetBtn = $('#reset');

  if (addBtn) {
    addBtn.onclick = () => {
      const id = $('#id')?.value.trim() || '';
      const title = $('#title')?.value.trim() || '';
      const author = $('#author')?.value.trim() || '';

      try {
        libraryService.addBook(id, title, author);
        updateLog(`Book added: ${title}`);
        displayMessage('success', `Book "${title}" added successfully.`);
      } catch (error) {
        displayMessage('error', error.message);
        updateLog(`Book add failed: ${error.message}`);
      } finally {
        renderInventory(libraryService.getBooks(), searchInput?.value || '');
      }
    };
  }

  if (regBtn) {
    regBtn.onclick = () => {
      const id = $('#mid')?.value.trim() || '';
      const name = $('#mname')?.value.trim() || '';
      const email = $('#memail')?.value.trim() || '';

      try {
        libraryService.registerMember(id, name, email);
        updateLog(`Member registered: ${name}`);
        displayMessage('success', `Member "${name}" registered and welcome email sent.`);
      } catch (error) {
        displayMessage('error', error.message);
        updateLog(`Member registration failed: ${error.message}`);
      }
    };
  }

  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      const bookId = $('#bookId')?.value.trim() || '';
      const memberId = $('#memberId')?.value.trim() || '';
      const days = 21;
      const card = '4111-1111';

      try {
        const result = libraryService.checkoutBook(bookId, memberId, days, card);

        updateLog(
          `Checked out ${result.bookTitle} to ${result.memberName} (Fee: $${result.feePaid.toFixed(
            2
          )}).`
        );
        displayMessage(
          'success',
          `Checkout successful! Book: ${result.bookTitle}. Fee: $${result.feePaid.toFixed(2)}.`
        );

        renderMember(memberId, '#member');
      } catch (error) {
        displayMessage('error', error.message);
        updateLog(`Checkout failed: ${error.message}`);
      } finally {
        renderInventory(libraryService.getBooks(), searchInput?.value || '');
      }
    };
  }

  if (searchInput) {
    searchInput.oninput = e => {
      const term = e.target.value.trim();
      updateLog(`Search '${term}' executed.`);
      renderInventory(libraryService.getBooks(), term);
    };
  }

  if (seedBtn) {
    seedBtn.onclick = () => {
      if (libraryService.getBooks().length === 0) {
        try {
          libraryService.addBook('b1', 'Clean Code', 'Robert C. Martin');
          libraryService.addBook('b2', 'Design Patterns', 'GoF');
        } catch (e) {
          // ignore duplicate errors on seed
        }
      }

      if (!libraryService.getMember('m1')) {
        try {
          libraryService.registerMember('m1', 'Ada', 'ada@example.com');
          libraryService.registerMember('m2', 'Linus', 'linus@example.com');
        } catch (e) {
          // ignore duplicate errors on seed
        }
      }

      updateLog('Data seeded.');
      displayMessage('success', 'Default data seeded successfully.');
      renderInventory(libraryService.getBooks());
      const memberId = $('#memberId')?.value || 'm1';
      renderMember(memberId, '#member');
    };
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      localStorage.removeItem('LIB_BOOKS');
      localStorage.removeItem('LIB_MEMBERS');
      location.reload();
    };
  }

  const bookRepo = new LocalStorageBookRepo();
  const memberRepo = new LocalStorageMemberRepo();
  const notifier = new ConsoleNotifier();
  const payment = new FakePaymentProvider();

  libraryService = new LibraryService(bookRepo, memberRepo, notifier, payment);

  const loadResult = libraryService.load();
  updateLog(
    `System started. Loaded ${loadResult.bookCount} books & ${loadResult.memberCount} members.`
  );

  renderInventory(libraryService.getBooks());
  const initialMemberId = $('#memberId')?.value || 'm1';
  renderMember(initialMemberId, '#member');
});
