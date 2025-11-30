
class StripePaymentProvider {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true, txn: Math.random().toString(36).slice(2) };
  }
}

class ConsoleMailer {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
}

class LocalStorageLibraryRepository {
  constructor(storageKey = 'LIB_DATA') {
    this.storageKey = storageKey;
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      const books = data.books || [];
      const members = data.members || [];
      return { books, members };
    } catch (e) {
      console.log('[Repo] Load failed. Resetting.', e);
      return { books: [], members: [] };
    }
  }

  save(books, members) {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({ books, members })
    );
    console.log('[Repo] Saved data to localStorage.');
  }
}

class LibraryService {
  constructor({ paymentProvider, mailer, repository }) {
    this.paymentProvider = paymentProvider;
    this.mailer = mailer;
    this.repository = repository;

    this.books = [];
    this.members = [];
    this.log = [];
  }

  load() {
    const data = this.repository.load();
    this.books = data.books;
    this.members = data.members;
    this._log(`Loaded ${this.books.length} books & ${this.members.length} members from localStorage.`);
  }

  save() {
    this.repository.save(this.books, this.members);
    this._log('Saved data to localStorage.');
  }
  addBook(id, title, author) {
    if (!id || !title) {
      throw new Error('Missing fields');
    }
    this.books.push({ id, title, author, available: true });
    this._log(`Book added: ${title}`);
    this.save();
  }

  registerMember(id, name, email) {
    if (!email || email.indexOf('@') < 0) {
      throw new Error('Invalid email');
    }
    this.members.push({ id, name, email, fees: 0 });
    this._log(`Member registered: ${name}`);
    this.mailer.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
    this.save();
  }

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const b = this.books.find(x => x.id === bookId);
    const m = this.members.find(x => x.id === memberId);

    if (!b) throw new Error('Book not found');
    if (!m) throw new Error('Member not found');
    if (!b.available) throw new Error('Book already checked out');

    let fee = 0; 
    if (days > 14) fee = (days - 14) * 0.5;

    if (fee > 0) {
      const res = this.paymentProvider.charge(fee, card);
      if (!res.ok) throw new Error('Payment failed');
      m.fees += fee;
    }

    b.available = false;
    this._log(`Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee}).`);
    this.mailer.send(m.email, 'Checkout', `You borrowed ${b.title}. Fee: $${fee}`);
    this.save();

    return { book: b, member: m, fee };
  }

  search(term) {
    const t = term.trim().toLowerCase();
    const res = this.books.filter(b =>
      b.title.toLowerCase().includes(t) ||
      b.author.toLowerCase().includes(t)
    );
    this._log(`Search '${term}' → ${res.length} results.`);
    return res;
  }

  getBooks() {
    return this.books;
  }

  getMembers() {
    return this.members;
  }

  getMemberById(id) {
    return this.members.find(x => x.id === id) || null;
  }

  getRecentLog(count = 3) {
    return this.log.slice(-count);
  }

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log('[LOG]', msg);
  }
}
const LibraryUI = {
  init(service) {
    this.service = service;

    const $ = sel => document.querySelector(sel);

    
    this.inventoryContainer = $('#app');
    this.memberContainer = $('#member');

    $('#add').onclick = () => {
      try {
        this.service.addBook($('#id').value, $('#title').value, $('#author').value);
        this.renderInventory();
      } catch (e) {
        alert(e.message);
      }
    };

    $('#reg').onclick = () => {
      try {
        this.service.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
      } catch (e) {
        alert(e.message);
      }
    };

    $('#checkout').onclick = () => {
      try {
        const res = this.service.checkoutBook($('#bookId').value, $('#memberId').value);
        this.renderInventory();
        this.renderMember(res.member.id);
      } catch (e) {
        alert(e.message);
      }
    };

    $('#search').oninput = e => {
      this.renderInventory(e.target.value);
    };

    $('#seed').onclick = () => {
      try {
        if (this.service.getBooks().length === 0) {
          this.service.addBook('b1', 'Clean Code', 'Robert C. Martin');
          this.service.addBook('b2', 'Design Patterns', 'GoF');
        }
        if (this.service.getMembers().length === 0) {
          this.service.registerMember('m1', 'Ada', 'ada@example.com');
          this.service.registerMember('m2', 'Linus', 'linus@example.com');
        }
        alert('Seeded.');
        this.renderInventory();
      } catch (e) {
        alert(e.message);
      }
    };

    $('#reset').onclick = () => {
      localStorage.removeItem('LIB_DATA');
      location.reload();
    };

 
    this.renderInventory();
  },

  renderInventory(searchTerm = '') {
    const container = this.inventoryContainer;
    if (!container) return;

    const term = searchTerm.trim().toLowerCase();
    let books = this.service.getBooks();
    if (term) {
      books = books.filter(
        b =>
          b.title.toLowerCase().includes(term) ||
          b.author.toLowerCase().includes(term)
      );
    }

    const logLines = this.service.getRecentLog(3);

    container.innerHTML =
      `<h3>Inventory</h3>` +
      `<ul>` +
      books
        .map(
          b =>
            `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`
        )
        .join('') +
      `</ul>` +
      `<div class="muted">${logLines.join('<br/>')}</div>`;
  },

  renderMember(memberId) {
    const container = this.memberContainer;
    if (!container) return;

    const m = this.service.getMemberById(memberId);
    container.innerHTML = m
      ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
      : '<em>No member selected.</em>';
  }
};
(function bootstrap() {
  const repository = new LocalStorageLibraryRepository('LIB_DATA');
  const paymentProvider = new StripePaymentProvider();
  const mailer = new ConsoleMailer();

  const service = new LibraryService({ paymentProvider, mailer, repository });
  service.load();

  LibraryUI.init(service);
})();
