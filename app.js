const BookRepo = {
  load() {
    try {
      const data = JSON.parse(localStorage.getItem('LIB_DATA') || '{}');
      return data.books || [];
    } catch (e) {
      return [];
    }
  },
  save(books) {
    const data = JSON.parse(localStorage.getItem('LIB_DATA') || '{}');
    data.books = books;
    localStorage.setItem('LIB_DATA', JSON.stringify(data));
  }
};

const MemberRepo = {
  load() {
    try {
      const data = JSON.parse(localStorage.getItem('LIB_DATA') || '{}');
      return data.members || [];
    } catch (e) {
      return [];
    }
  },
  save(members) {
    const data = JSON.parse(localStorage.getItem('LIB_DATA') || '{}');
    data.members = members;
    localStorage.setItem('LIB_DATA', JSON.stringify(data));
  }
};

const LibraryService = {
  books: [],
  members: [],

  init(bookRepo, memberRepo, payment, notifier) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.payment = payment;
    this.notifier = notifier;
    this.books = this.bookRepo.load();
    this.members = this.memberRepo.load();
  },

  addBook(id, title, author) {
    if (!id || !title) throw new Error('Missing fields');
    this.books.push({ id, title, author, available: true });
    this.bookRepo.save(this.books);
    return { id, title, author, available: true };
  },

  registerMember(id, name, email) {
    if (!email || email.indexOf('@') < 0) throw new Error('Invalid email');
    const member = { id, name, email, fees: 0 };
    this.members.push(member);
    this.memberRepo.save(this.members);
    this.notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
    return member;
  },

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const b = this.books.find(x => x.id === bookId);
    const m = this.members.find(x => x.id === memberId);
    if (!b) throw new Error('Book not found');
    if (!m) throw new Error('Member not found');
    if (!b.available) throw new Error('Book already checked out');

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;
    
    if (fee > 0) {
      const res = this.payment.charge(fee, card);
      if (!res.ok) throw new Error('Payment failed');
      m.fees += fee;
    }
    
    b.available = false;
    this.bookRepo.save(this.books);
    this.memberRepo.save(this.members);
    this.notifier.send(m.email, 'Checkout', `You borrowed ${b.title}. Fee: $${fee}`);
    
    return { book: b, member: m, fee };
  },

  search(term) {
    const t = term.trim().toLowerCase();
    return this.books.filter(b => b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t));
  }
};

const Library = {
  log: [],

  init() {
    const defaultPayment = {
      charge(amount, card) {
        console.log(`[FakeStripe] Charging $${amount} to ${card}`);
        return { ok: true, txn: Math.random().toString(36).slice(2) };
      }
    };

    const defaultNotifier = {
      send(to, subject, body) {
        console.log(`[Email] to=${to} subject=${subject} body=${body}`);
        return true;
      }
    };

    LibraryService.init(BookRepo, MemberRepo, defaultPayment, defaultNotifier);
  },

  addBook(id, title, author) {
    try {
      LibraryService.addBook(id, title, author);
      this._log(`Book added: ${title}`);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  registerMember(id, name, email) {
    try {
      LibraryService.registerMember(id, name, email);
      this._log(`Member registered: ${name}`);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    try {
      const result = LibraryService.checkoutBook(bookId, memberId, days, card);
      this._log(`Checked out ${result.book.title} to ${result.member.name} for ${days} days (fee=$${result.fee}).`);
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  search(term) {
    return LibraryService.search(term);
  },

  getBooks() {
    return LibraryService.books;
  },

  getMembers() {
    return LibraryService.members;
  },

  getMember(memberId) {
    return LibraryService.members.find(x => x.id === memberId);
  },

  getLog() {
    return this.log;
  },

  renderInventory(sel) {
    const el = document.querySelector(sel);
    el.innerHTML = `<h3>Inventory</h3>` +
      `<ul>` + LibraryService.books.map(b => `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`).join('') + `</ul>` +
      `<div class="muted">${this.log.slice(-3).join('<br/>')}</div>`;
  },

  renderMember(memberId, sel) {
    const m = LibraryService.members.find(x => x.id === memberId);
    const el = document.querySelector(sel);
    el.innerHTML = m ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>` : '<em>No member selected.</em>';
  },

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log('[LOG]', msg);
  }
};

(function bootstrap(){
  Library.init();
  Library.renderInventory('#app');

  const $ = sel => document.querySelector(sel);

  $('#add').onclick = () => {
    const result = Library.addBook($('#id').value, $('#title').value, $('#author').value);
    if (!result.ok) alert(result.error);
    else Library.renderInventory('#app');
    $('#id').value = '';
    $('#title').value = '';
    $('#author').value = '';
  };

  $('#reg').onclick = () => {
    const result = Library.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
    if (!result.ok) alert(result.error);
    else Library._log('Welcome email sent.');
    $('#mid').value = '';
    $('#mname').value = '';
    $('#memail').value = '';
  };

  $('#checkout').onclick = () => {
    const result = Library.checkoutBook($('#bookId').value, $('#memberId').value);
    if (!result.ok) alert(result.error);
    else {
      Library.renderInventory('#app');
      Library.renderMember($('#memberId').value, '#member');
    }
    $('#bookId').value = '';
    $('#memberId').value = '';
  };

  $('#search').oninput = e => {
    const results = Library.search(e.target.value);
    Library._log(`Search '${e.target.value}' → ${results.length} results.`);
    Library.renderInventory('#app');
  };

  $('#seed').onclick = () => {
    if (Library.getBooks().length === 0) {
      Library.addBook('b1', 'Clean Code', 'Robert C. Martin');
      Library.addBook('b2', 'Design Patterns', 'GoF');
    }
    if (Library.getMembers().length === 0) {
      Library.registerMember('m1', 'Ada', 'ada@example.com');
      Library.registerMember('m2', 'Linus', 'linus@example.com');
    }
    Library.renderInventory('#app');
    alert('Seeded.');
  };

  $('#reset').onclick = () => {
    localStorage.removeItem('LIB_DATA');
    location.reload();
  };
})();
