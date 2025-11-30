// Separate storage: handles only persistence 
class LibraryStorage {
  constructor(key = 'LIB_DATA') {
    this.key = key;
  }

  load () {
    const data = JSON.parse(localStorage.getItem(this.key) || '{}');
    return {
      books: data.books || [],
      members: data.members || []
    };
  }

  save(books, members){
    localStorage.setItem(this.key, JSON.stringify({books, members}));
  }

  reset() {
    localStorage.removeItem(this.key);
  }
}

//Separate UI rendering: only DOM logic

function renderInventory(library, sel){
  const el = document.querySelector(sel);
  el.innerHTML = '<h3>Inventory</h3>' +
  '<ul>' + library.books.map(b =>
     `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`
    ).join('') + `</ul>` +
    `<div class="muted">${library.log.slice(-3).join('<br/>')}</div>`;
}

function renderMember(library, memberId, sel) {
  const m = library.members.find(x => x.id === memberId);
  const el = document.querySelector(sel);
  el.innerHTML = m
   ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
    : '<em>No member selected.</em>';
}

// External services that can be swapped without changing Library (OCP)
const paymentProvider = {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true, txn: Math.random().toString(36).slice(2) };
  }
};

const mailer = {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
};


const Library = {
  books: [], // [{id, title, author, available}]
  members: [], // [{id, name, email, fees}]
  log: [],
  storage: new LibraryStorage('LIB_DATA'),

  // Injected concrete services (still simple, but not created here)
  paymentProvider,
  mailer,

  // Persistence via dedicated storage (SRP)
  load() {
    try {
      const data = this.storage.load();
      this.books = data.books;
      this.members = data.members;
      this._log(`Loaded ${this.books.length} books & ${this.members.length} members from localStorage.`);
    } catch (e) {
      this._log('Load failed. Resetting.');
      this.books = []; 
      this.members = [];
    }
  },
  save() {
    this.storage.save(this.books, this.members);
    this._log('Saved data to localStorage.');
  },

  // Domain operations (validation + policies + persistence)
  addBook(id, title, author) {
    if (!id || !title) { 
      alert('Missing fields'); 
      return; 
    }
    this.books.push({ id, title, author, available: true });
    this._log(`Book added: ${title}`);
    this.save();
  },

  registerMember(id, name, email) {
    if (!email || email.indexOf('@') < 0) { 
      alert('Invalid email');
       return; }
    this.members.push({ id, name, email, fees: 0 });
    this._log(`Member registered: ${name}`);
    this.mailer.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
    this.save();
  },

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const b = this.books.find(x => x.id === bookId);
    const m = this.members.find(x => x.id === memberId);
    if (!b) {
      alert('Book not found');
      return;
    }
    if (!m) {
      alert('Member not found');
      return;
    }
    if (!b.available) {
      alert('Book already checked out');
      return;
    }

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;

    if (fee > 0) {
      const res = this.paymentProvider.charge(fee, card);
      if (!res.ok) {
        alert('Payment failed');
        return;
      }
      m.fees += fee;
    }

    b.available = false;
    this._log(`Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee}).`);
    this.mailer.send(m.email, 'Checkout', `You borrowed ${b.title}. Fee: $${fee}`);
    this.save();

    // no DOM calls here anymore
    return m.id; // return for the UI to decide what to show
  },

  search(term) {
    const t = term.trim().toLowerCase();
    const res = this.books.filter(b => 
      b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t)
    );
    this._log(`Search '${term}' → ${res.length} results.`);
    return res;
  },

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log('[LOG]', msg);
  }
};

//  Composition root: wire UI events to Library domain + render helpers
(function bootstrap() {
  Library.load();
  renderInventory(Library, '#app');

  const $ = sel => document.querySelector(sel);

  $('#add').onclick = () => {
    Library.addBook($('#id').value, $('#title').value, $('#author').value);
    renderInventory(Library,'#app');
  };

  $('#reg').onclick = () => {
    Library.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
    renderInventory(Library,'#app');
  };

  $('#checkout').onclick = () => {
    const memberId = Library.checkoutBook($('#bookId').value, $('#memberId').value);
    renderInventory(Library,'#app');
    if (memberId) {
      renderMember(Library, memberId, '#member');
    }
  };

  $('#search').oninput = e => {
    Library.search(e.target.value);
    renderInventory(Library,'#app');
  };

  $('#seed').onclick = () => {
    if (Library.books.length === 0) {
      Library.addBook('b1', 'Clean Code', 'Robert C. Martin');
      Library.addBook('b2', 'Design Patterns', 'GoF');
    }
    if (Library.members.length === 0) {
      Library.registerMember('m1', 'Ada', 'ada@example.com');
      Library.registerMember('m2', 'Linus', 'linus@example.com');
    }
    alert('Seeded.');
    renderInventory(Library,'#app');
  };
  $('#reset').onclick = () => { 
    Library.storage.reset(); 
    location.reload(); };
})();
