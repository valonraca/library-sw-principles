// This part of the code only deals with one thing. Storing and loading data from localStorage. We did this because before, in the broken code, the Library object did EVERYTHING. We know that this violates SRP.

function createBookRepo() {
  const KEY = 'LIB_BOOKS';

  return { //This returns (loads) all books from localStorage. If there are no books, it returns [].
    load() {
      try {
        return JSON.parse(localStorage.getItem(KEY) || '[]');
      } catch (e) {
        console.log('BookRepo load failed, resetting.', e);
        return [];
      }
    },
    // Saves the whole books array back to localStorage.
    save(books) {
      localStorage.setItem(KEY, JSON.stringify(books));
    },
    clear() {
      localStorage.removeItem(KEY);
    }
  };
}

function createMemberRepo() {
  const KEY = 'LIB_MEMBERS';

  return {
    load() {
      try {
        return JSON.parse(localStorage.getItem(KEY) || '[]');
      } catch (e) {
        console.log('MemberRepo load failed, resetting.', e);
        return [];
      }
    },
    // Now this saves the whole members array back to localStorage.
    save(members) {
      localStorage.setItem(KEY, JSON.stringify(members));
    },
    // This part is optional: it removes member storage completely
    clear() {
      localStorage.removeItem(KEY);
    }
  };
}

// These are just interfaces. LibraryService does not know about FakeStripe or console logs, it just calls these methods.

function createFakeStripePaymentProvider() {
  return {
    charge(amount, card) {
      console.log(`[FakeStripe] Charging $${amount} to ${card}`);
      return { ok: true, txn: Math.random().toString(36).slice(2) };
    }
  };
}

function createConsoleNotifier() {
  return {
    sendWelcome(to, name, id) {
      console.log(`[Email] to=${to} subject=Welcome body=Hi ${name}, your id is ${id}`);
      return true;
    },
    sendCheckout(to, title, fee) {
      console.log(`[Email] to=${to} subject=Checkout body=You borrowed ${title}. Fee: $${fee}`);
      return true;
    }
  };
}

// This part is the “brain” of our app. It handles the rules (adding books, checking out, fees, etc.) without touching the UI, alerts, or localStorage.

function createLibraryService(bookRepo, memberRepo, notifier, paymentProvider) {
  let books = bookRepo.load();
  let members = memberRepo.load();
  const log = [];

  function saveAll() { // Saves updated books and members into storage
    bookRepo.save(books);
    memberRepo.save(members);
  }

  function _log(msg) { // Keeps a simple log of recent actions
    const stamp = new Date().toLocaleTimeString();
    log.push(`${stamp} — ${msg}`);
    if (log.length > 50) log.shift();
    console.log('[LOG]', msg);
  }

  function addBook(id, title, author) { // Handles book validation and domain logic
    if (!id || !title) return { ok: false, error: 'Missing fields' };
    books.push({ id, title, author, available: true });
    _log(`Book added: ${title}`);
    saveAll();
    return { ok: true };
  }

  function registerMember(id, name, email) { // Handles member validation and welcome notification
    if (!email || email.indexOf('@') < 0) {
      return { ok: false, error: 'Invalid email' };
    }
    members.push({ id, name, email, fees: 0 });
    _log(`Member registered: ${name}`);
    notifier.sendWelcome(email, name, id);
    saveAll();
    return { ok: true };
  }

  function checkoutBook(bookId, memberId, days = 21, card = '4111-1111') { // Handles checkout rules and fee calculation
    const b = books.find(x => x.id === bookId);
    const m = members.find(x => x.id === memberId);

    if (!b) return { ok: false, error: 'Book not found' };
    if (!m) return { ok: false, error: 'Member not found' };
    if (!b.available) return { ok: false, error: 'Book already checked out' };

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;

    if (fee > 0) { // Charges through the payment provider that was injected
      const res = paymentProvider.charge(fee, card);
      if (!res.ok) return { ok: false, error: 'Payment failed' };
      m.fees += fee;
    }

    b.available = false;
    _log(`Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee}).`);
    notifier.sendCheckout(m.email, b.title, fee);
    saveAll();

    return { ok: true, memberId: m.id, fee };
  }

  function search(term) { // Basic search logic on books
    const t = term.trim().toLowerCase();
    const res = books.filter(
      b =>
        b.title.toLowerCase().includes(t) ||
        b.author.toLowerCase().includes(t)
    );
    _log(`Search '${term}' → ${res.length} results.`);
    return res;
  }

  function seedDemoData() {
    if (books.length === 0) {
      addBook('b1', 'Clean Code', 'Robert C. Martin');
      addBook('b2', 'Design Patterns', 'GoF');
    }
    if (members.length === 0) {
      registerMember('m1', 'Ada', 'ada@example.com');
      registerMember('m2', 'Linus', 'linus@example.com');
    }
  }

  return {
    addBook,
    registerMember,
    checkoutBook,
    search,
    seedDemoData,
    getBooks() {
      return books;
    },
    getMemberById(id) {
      return members.find(m => m.id === id);
    },
    getLog() {
      return log.slice();
    }
  };
}

// ---------- UI layer: keeps name "Library" but delegates to service ----------

const Library = {
  service: null,

  init() {
    const bookRepo = createBookRepo();
    const memberRepo = createMemberRepo();
    const paymentProvider = createFakeStripePaymentProvider();
    const notifier = createConsoleNotifier();

    this.service = createLibraryService(
      bookRepo,
      memberRepo,
      notifier,
      paymentProvider
    );

    this.renderInventory('#app');
    this.renderMember(null, '#member');
  },

  addBook(id, title, author) {
    const result = this.service.addBook(id, title, author);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    this.renderInventory('#app');
  },

  registerMember(id, name, email) {
    const result = this.service.registerMember(id, name, email);
    if (!result.ok) {
      alert(result.error);
      return;
    }
  },

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const result = this.service.checkoutBook(bookId, memberId, days, card);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    this.renderInventory('#app');
    this.renderMember(memberId, '#member');
  },

  search(term) {
    const trimmed = term.trim();
    if (!trimmed) {
      this.renderInventory('#app');
      return [];
    }
    const res = this.service.search(trimmed);
    this.renderInventory('#app', res);
    return res;
  },

  renderInventory(sel, overrideBooks) {
    const el = document.querySelector(sel);
    const books = overrideBooks || this.service.getBooks();
    const log = this.service.getLog();

    el.innerHTML =
      `<h3>Inventory</h3>` +
      `<ul>` +
      books
        .map(
          b =>
            `<li><strong>${
              b.available
                ? '<span class="ok">✓</span>'
                : '<span class="no">✗</span>'
            }</strong> ${b.id}: ${b.title} — ${b.author}</li>`
        )
        .join('') +
      `</ul>` +
      `<div class="muted">${log.slice(-3).join('<br/>')}</div>`;
  },

  renderMember(memberId, sel) {
    const el = document.querySelector(sel);
    if (!memberId) {
      el.innerHTML = '<em>No member selected.</em>';
      return;
    }

    const m = this.service.getMemberById(memberId);
    el.innerHTML = m
      ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
      : '<em>No member selected.</em>';
  }
};

// --- Wiring (almost same as original) ---

(function bootstrap() {
  Library.init();

  const $ = sel => document.querySelector(sel);

  $('#add').onclick = () =>
    Library.addBook($('#id').value, $('#title').value, $('#author').value);

  $('#reg').onclick = () =>
    Library.registerMember(
      $('#mid').value,
      $('#mname').value,
      $('#memail').value
    );

  $('#checkout').onclick = () =>
    Library.checkoutBook($('#bookId').value, $('#memberId').value);

  $('#search').oninput = e => Library.search(e.target.value);

  $('#seed').onclick = () => {
    Library.service.seedDemoData();
    alert('Seeded.');
    Library.renderInventory('#app');
  };

  $('#reset').onclick = () => {
    localStorage.removeItem('LIB_BOOKS');
    localStorage.removeItem('LIB_MEMBERS');
    location.reload();
  };
})();
