// --- Logger (no DOM) ---
function createLogger() {
  const log = [];
  return {
    log(msg) {
      const stamp = new Date().toLocaleTimeString();
      log.push(`${stamp} — ${msg}`);
      if (log.length > 50) log.shift();
      console.log('[LOG]', msg);
    },
    getRecent(n = 3) {
      return log.slice(-n);
    }
  };
}

// --- LocalStorage "database" (shared for books + members) ---
function createLocalStorageStore(storageKey, logger) {
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const books = data.books || [];
      const members = data.members || [];
      logger.log(`Loaded ${books.length} books & ${members.length} members from localStorage.`);
      return { books, members };
    } catch (e) {
      logger.log('Load failed. Resetting.');
      return { books: [], members: [] };
    }
  }

  let state = load();

  function persist() {
    localStorage.setItem(storageKey, JSON.stringify({
      books: state.books,
      members: state.members
    }));
    logger.log('Saved data to localStorage.');
  }

  return {
    getBooks() { return state.books; },
    getMembers() { return state.members; },
    setBooks(books) { state.books = books; persist(); },
    setMembers(members) { state.members = members; persist(); }
  };
}

// --- Repositories (BookRepo & MemberRepo) ---
function createBookRepo(store) {
  return {
    getAll() {
      return store.getBooks();
    },
    findById(id) {
      return store.getBooks().find(b => b.id === id);
    },
    add(book) {
      const books = store.getBooks().slice();
      books.push(book);
      store.setBooks(books);
    },
    update(updatedBook) {
      const books = store.getBooks().map(b => b.id === updatedBook.id ? updatedBook : b);
      store.setBooks(books);
    }
  };
}

function createMemberRepo(store) {
  return {
    getAll() {
      return store.getMembers();
    },
    findById(id) {
      return store.getMembers().find(m => m.id === id);
    },
    add(member) {
      const members = store.getMembers().slice();
      members.push(member);
      store.setMembers(members);
    },
    update(updatedMember) {
      const members = store.getMembers().map(m => m.id === updatedMember.id ? updatedMember : m);
      store.setMembers(members);
    }
  };
}

// --- LibraryService: DOMAIN ONLY (no DOM, no alert, no localStorage) ---
function createLibraryService({ bookRepo, memberRepo, paymentProvider, notifier, logger }) {
  const fail = (code, message) => ({ ok: false, error: code, message });
  const ok = (extra = {}) => ({ ok: true, ...extra });

  return {
    addBook(id, title, author) {
      if (!id || !title) {
        return fail('MISSING_FIELDS', 'Missing fields');
      }
      const book = { id, title, author, available: true };
      bookRepo.add(book);
      logger.log(`Book added: ${title}`);
      return ok({ book });
    },

    registerMember(id, name, email) {
      if (!email || email.indexOf('@') < 0) {
        return fail('INVALID_EMAIL', 'Invalid email');
      }
      const member = { id, name, email, fees: 0 };
      memberRepo.add(member);
      logger.log(`Member registered: ${name}`);
      notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
      return ok({ member });
    },

    checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
      const book = bookRepo.findById(bookId);
      if (!book) return fail('BOOK_NOT_FOUND', 'Book not found');

      const member = memberRepo.findById(memberId);
      if (!member) return fail('MEMBER_NOT_FOUND', 'Member not found');

      if (!book.available) return fail('BOOK_UNAVAILABLE', 'Book already checked out');

      let fee = 0;
      if (days > 14) fee = (days - 14) * 0.5;

      if (fee > 0) {
        const res = paymentProvider.charge(fee, card);
        if (!res.ok) return fail('PAYMENT_FAILED', 'Payment failed');
        const updatedMember = { ...member, fees: member.fees + fee };
        memberRepo.update(updatedMember);
      }

      const updatedBook = { ...book, available: false };
      bookRepo.update(updatedBook);

      logger.log(`Checked out ${book.title} to ${member.name} for ${days} days (fee=$${fee}).`);
      notifier.send(member.email, 'Checkout', `You borrowed ${book.title}. Fee: $${fee}`);

      return ok({ fee, bookId: book.id, memberId: member.id });
    },

    search(term) {
      const t = term.trim().toLowerCase();
      const allBooks = bookRepo.getAll();
      const res = t
        ? allBooks.filter(b =>
            b.title.toLowerCase().includes(t) ||
            b.author.toLowerCase().includes(t)
          )
        : allBooks;
      logger.log(`Search '${term}' → ${res.length} results.`);
      return res;
    }
  };
}

// --- UI Rendering (DOM ONLY, no domain rules) ---
(function bootstrap() {
  const logger = createLogger();
  const store = createLocalStorageStore('LIB_DATA', logger);
  const bookRepo = createBookRepo(store);
  const memberRepo = createMemberRepo(store);

  // "Ports" for OCP – can be swapped without touching LibraryService
  const paymentProvider = {
    charge(amount, card) {
      console.log(`[FakeStripe] Charging $${amount} to ${card}`);
      return { ok: true, txn: Math.random().toString(36).slice(2) };
    }
  };
  const notifier = {
    send(to, subject, body) {
      console.log(`[Email] to=${to} subject=${subject} body=${body}`);
      return true;
    }
  };

  const libraryService = createLibraryService({
    bookRepo,
    memberRepo,
    paymentProvider,
    notifier,
    logger
  });

  const $ = sel => document.querySelector(sel);

  function renderInventory() {
    const books = bookRepo.getAll();
    const recentLog = logger.getRecent(3);
    const el = $('#app');
    if (!el) return;

    el.innerHTML =
      `<h3>Inventory</h3>` +
      `<ul>` +
      books.map(b =>
        `<li><strong>${
          b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'
        }</strong> ${b.id}: ${b.title} — ${b.author}</li>`
      ).join('') +
      `</ul>` +
      `<div class="muted">${recentLog.join('<br/>')}</div>`;
  }

  function renderMember(memberId) {
    const el = $('#member');
    if (!el) return;

    const member = memberId ? memberRepo.findById(memberId) : null;
    el.innerHTML = member
      ? `<h3>${member.name}</h3><p>${member.email}</p><p>Fees: $${member.fees}</p>`
      : '<em>No member selected.</em>';
  }

  // Initial render
  renderInventory();
  renderMember(null);

  // --- Event wiring: calls service, then updates UI / alerts ---
  $('#add').onclick = () => {
    const res = libraryService.addBook($('#id').value, $('#title').value, $('#author').value);
    if (!res.ok) {
      alert(res.message || 'Missing fields');
      return;
    }
    renderInventory();
  };

  $('#reg').onclick = () => {
    const res = libraryService.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
    if (!res.ok) {
      alert(res.message || 'Invalid email');
      return;
    }
    // No need to re-render inventory here, but safe if books/members shown
    renderInventory();
  };

  $('#checkout').onclick = () => {
    const res = libraryService.checkoutBook($('#bookId').value, $('#memberId').value);
    if (!res.ok) {
      // Map domain errors back to the same user messages as before
      alert(res.message);
      return;
    }
    renderInventory();
    renderMember($('#memberId').value);
  };

  $('#search').oninput = e => {
    libraryService.search(e.target.value);
    renderInventory();
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

  // Optional: expose service for console debugging (not required)
  window.LibraryService = libraryService;
})();

