const Notifier ={
  send(to, subject, body){ throw new Error('not implemented');}
};

const PaymentProvider = {
  charge(amount, card) { throw new Error('not implemented'); }
};

const ConsoleNotifier = {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
};

const MockPaymentProvider = {
  charge(amount, card) {
    console.log(`[Payment] Charging $${amount} to card ${card}`);
    return { ok: true };
  }
};

const BookRepository = {
  load() {
    const data = JSON.parse(localStorage.getItem('LIB_BOOKS') || '[]');
    return data;
  },
  save(books) {
    localStorage.setItem('LIB_BOOKS', JSON.stringify(books));
  }
};


const MemberRepository = {
  load() {
    const data = JSON.parse(localStorage.getItem('LIB_MEMBERS') || '[]');
    return data;
  },
  save(members) {
    localStorage.setItem('LIB_MEMBERS', JSON.stringify(members));
  }
};

const LibraryService = {
  init(notifier, paymentProvider) {
    this.notifier = notifier;
    this.paymentProvider = paymentProvider;
    this.log = [];
    return this;
  },

  addBook(id, title, author) {
    if (!id || !title) {
      return { success: false, error: 'Missing fields' };
    }

    const books = BookRepository.load();
    books.push({ id, title, author, available: true });
    BookRepository.save(books);
    
    this._log(`Book added: ${title}`);
    return { success: true };
  },

  registerMember(id, name, email) {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email' };
    }

    const members = MemberRepository.load();
    members.push({ id, name, email, fees: 0 });
    MemberRepository.save(members);
    
    this._log(`Member registered: ${name}`);
    this.notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
    
    return { success: true };
  },

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const books = BookRepository.load();
    const members = MemberRepository.load();
    
    const book = books.find(b => b.id === bookId);
    const member = members.find(m => m.id === memberId);
    
    if (!book) return { success: false, error: 'Book not found' };
    if (!member) return { success: false, error: 'Member not found' };
    if (!book.available) return { success: false, error: 'Book already checked out' };

    const fee = days > 14 ? (days - 14) * 0.5 : 0;
    
    if (fee > 0) {
      const paymentResult = this.paymentProvider.charge(fee, card);
      if (!paymentResult.ok) {
        return { success: false, error: 'Payment failed' };
      }
      member.fees += fee;
    }

    book.available = false;
    
    BookRepository.save(books);
    MemberRepository.save(members);
    
    this._log(`Checked out ${book.title} to ${member.name} for ${days} days (fee=$${fee}).`);
    this.notifier.send(member.email, 'Checkout', `You borrowed ${book.title}. Fee: $${fee}`);
    
    return { success: true, book, member };
  },

  searchBooks(term) {
    const books = BookRepository.load();
    const t = term.trim().toLowerCase();
    const results = books.filter(b => 
      b.title.toLowerCase().includes(t) || 
      b.author.toLowerCase().includes(t)
    );
    
    this._log(`Search '${term}' → ${results.length} results.`);
    return results;
  },

  getAllBooks() {
    return BookRepository.load();
  },

  getMember(memberId) {
    const members = MemberRepository.load();
    return members.find(m => m.id === memberId);
  },

  getLogs() {
    return this.log.slice();
  },

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log('[LOG]', msg);
  }
};

const UIController = {
  init(service) {
    this.service = service;
    this.setupEventListeners();
    this.renderInventory();
  },

  renderInventory() {
    const books = this.service.getAllBooks();
    const logs = this.service.getLogs();
    
    const el = document.querySelector('#app');
    el.innerHTML = `<h3>Inventory</h3>` +
      `<ul>` + books.map(b => 
        `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`
      ).join('') + `</ul>` +
      `<div class="muted">${logs.slice(-3).join('<br/>')}</div>`;
  },

  renderMember(memberId) {
    const member = this.service.getMember(memberId);
    const el = document.querySelector('#member');
    el.innerHTML = member ? 
      `<h3>${member.name}</h3><p>${member.email}</p><p>Fees: $${member.fees}</p>` : 
      '<em>No member selected.</em>';
  },

  setupEventListeners() {
    const $ = sel => document.querySelector(sel);
    
    $('#add').onclick = () => {
      const result = this.service.addBook($('#id').value, $('#title').value, $('#author').value);
      if (!result.success) alert(result.error);
      else this.renderInventory();
    };
    
    $('#reg').onclick = () => {
      const result = this.service.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
      if (!result.success) alert(result.error);
    };
    
    $('#checkout').onclick = () => {
      const result = this.service.checkoutBook($('#bookId').value, $('#memberId').value);
      if (!result.success) alert(result.error);
      else {
        this.renderInventory();
        this.renderMember($('#memberId').value);
      }
    };
    
    $('#search').oninput = e => {
      this.service.searchBooks(e.target.value);
      this.renderInventory();
    };
    
    $('#seed').onclick = () => {
      if (this.service.getAllBooks().length === 0) {
        this.service.addBook('b1', 'Clean Code', 'Robert C. Martin');
        this.service.addBook('b2', 'Design Patterns', 'GoF');
      }
      alert('Seeded.');
      this.renderInventory();
    };
    
    $('#reset').onclick = () => { 
      localStorage.removeItem('LIB_BOOKS');
      localStorage.removeItem('LIB_MEMBERS');
      location.reload(); 
    };
  }
};

(function bootstrap() {
  const libraryService = Object.create(LibraryService).init(EmailNotifier, PaymentProvider);
  UIController.init(libraryService);
})();

