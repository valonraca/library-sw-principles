// Interfaces (ports) as plain JS objects
// PaymentProvider: { charge(amount, card) => {ok, txn} }
// Notifier: { send(to, subject, body) => bool }
// BookRepo: { load(), save(), getAll(), findById(id), add(book), update(book) }
// MemberRepo: { load(), save(), getAll(), findById(id), add(member), update(member) }
// Logger: { log(msg), getLast(n) }

const createBookRepo = () => {
  let books = [];
  return {
    load() {
      try {
        books = JSON.parse(localStorage.getItem('LIB_BOOKS') || '[]');
      } catch (e) {
        books = [];
      }
    },
    save() {
      localStorage.setItem('LIB_BOOKS', JSON.stringify(books));
    },
    getAll() {
      return books;
    },
    findById(id) {
      return books.find(x => x.id === id);
    },
    add(book) {
      books.push(book);
    },
    update(book) {
      const i = books.findIndex(x => x.id === book.id);
      if (i !== -1) books[i] = book;
    }
  };
};

const createMemberRepo = () => {
  let members = [];
  return {
    load() {
      try {
        members = JSON.parse(localStorage.getItem('LIB_MEMBERS') || '[]');
      } catch (e) {
        members = [];
      }
    },
    save() {
      localStorage.setItem('LIB_MEMBERS', JSON.stringify(members));
    },
    getAll() {
      return members;
    },
    findById(id) {
      return members.find(x => x.id === id);
    },
    add(member) {
      members.push(member);
    },
    update(member) {
      const i = members.findIndex(x => x.id === member.id);
      if (i !== -1) members[i] = member;
    }
  };
};

const createLogger = () => {
  const logEntries = [];
  return {
    log(msg) {
      const stamp = new Date().toLocaleTimeString();
      logEntries.push(`${stamp} — ${msg}`);
      if (logEntries.length > 50) logEntries.shift();
      console.log('[LOG]', msg);
    },
    getLast(n) {
      return logEntries.slice(-n);
    }
  };
};

const createLibraryService = (bookRepo, memberRepo, paymentProvider, notifier, logger) => {
  return {
    load() {
      bookRepo.load();
      memberRepo.load();
      logger.log(`Loaded ${bookRepo.getAll().length} books & ${memberRepo.getAll().length} members from localStorage.`);
    },
    getBooks() {
      return bookRepo.getAll();
    },
    getMember(id) {
      return memberRepo.findById(id);
    },
    addBook(id, title, author) {
      if (!id || !title) throw new Error('Missing fields');
      bookRepo.add({ id, title, author, available: true });
      bookRepo.save();
      logger.log(`Book added: ${title}`);
    },
    registerMember(id, name, email) {
      if (!email || email.indexOf('@') < 0) throw new Error('Invalid email');
      memberRepo.add({ id, name, email, fees: 0 });
      notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
      memberRepo.save();
      logger.log(`Member registered: ${name}`);
    },
    checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
      const b = bookRepo.findById(bookId);
      const m = memberRepo.findById(memberId);
      if (!b) throw new Error('Book not found');
      if (!m) throw new Error('Member not found');
      if (!b.available) throw new Error('Book already checked out');

      let fee = 0;
      if (days > 14) fee = (days - 14) * 0.5;
      if (fee > 0) {
        const res = paymentProvider.charge(fee, card);
        if (!res.ok) throw new Error('Payment failed');
        m.fees += fee;
        memberRepo.update(m);
      }
      b.available = false;
      bookRepo.update(b);
      notifier.send(m.email, 'Checkout', `You borrowed ${b.title}. Fee: $${fee}`);
      bookRepo.save();
      memberRepo.save();
      logger.log(`Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee}).`);
    },
    search(term) {
      const t = term.trim().toLowerCase();
      const res = bookRepo.getAll().filter(b => b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t));
      logger.log(`Search '${term}' → ${res.length} results.`);
      return res;
    }
  };
};

const UI = {
  renderInventory(sel, books, logEntries) {
    const el = document.querySelector(sel);
    el.innerHTML = `<h3>Inventory</h3>` +
      `<ul>` + books.map(b => `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`).join('') + `</ul>` +
      `<div class="muted">${logEntries.join('<br/>')}</div>`;
  },
  renderMember(sel, member) {
    const el = document.querySelector(sel);
    el.innerHTML = member ? `<h3>${member.name}</h3><p>${member.email}</p><p>Fees: $${member.fees}</p>` : '<em>No member selected.</em>';
  }
};

// --- Wiring (dependencies injected here; easy to swap) ---
(function bootstrap() {
  const logger = createLogger();
  const bookRepo = createBookRepo();
  const memberRepo = createMemberRepo();
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
  const libraryService = createLibraryService(bookRepo, memberRepo, paymentProvider, notifier, logger);

  libraryService.load();
  UI.renderInventory('#app', libraryService.getBooks(), logger.getLast(3));

  const $ = sel => document.querySelector(sel);
  $('#add').onclick = () => {
    try {
      libraryService.addBook($('#id').value, $('#title').value, $('#author').value);
      UI.renderInventory('#app', libraryService.getBooks(), logger.getLast(3));
    } catch (e) {
      alert(e.message);
    }
  };
  $('#reg').onclick = () => {
    try {
      libraryService.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
    } catch (e) {
      alert(e.message);
    }
  };
  $('#checkout').onclick = () => {
    try {
      libraryService.checkoutBook($('#bookId').value, $('#memberId').value);
      UI.renderInventory('#app', libraryService.getBooks(), logger.getLast(3));
      UI.renderMember('#member', libraryService.getMember($('#memberId').value));
    } catch (e) {
      alert(e.message);
    }
  };
  $('#search').oninput = e => {
    libraryService.search(e.target.value);
    UI.renderInventory('#app', libraryService.getBooks(), logger.getLast(3));
  };
  $('#seed').onclick = () => {
    if (libraryService.getBooks().length === 0) {
      libraryService.addBook('b1', 'Clean Code', 'Robert C. Martin');
      UI.renderInventory('#app', libraryService.getBooks(), logger.getLast(3));
      libraryService.addBook('b2', 'Design Patterns', 'GoF');
      UI.renderInventory('#app', libraryService.getBooks(), logger.getLast(3));
    }
    if (memberRepo.getAll().length === 0) {
      libraryService.registerMember('m1', 'Ada', 'ada@example.com');
      libraryService.registerMember('m2', 'Linus', 'linus@example.com');
    }
    alert('Seeded.');
  };
  $('#reset').onclick = () => {
    localStorage.removeItem('LIB_BOOKS');
    localStorage.removeItem('LIB_MEMBERS');
    location.reload();
  };
})();