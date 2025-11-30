// Library.js - Now focusing on book and member management only

class Library {
  constructor(bookManager, memberManager, paymentProcessor, mailer, renderer) {
    this.bookManager = bookManager;
    this.memberManager = memberManager;
    this.paymentProcessor = paymentProcessor;
    this.mailer = mailer;
    this.renderer = renderer;
  }

  // Load data (handled by Persistence class)
  load() {
    const data = Persistence.load();
    this.bookManager.books = data.books || [];
    this.memberManager.members = data.members || [];
    this.renderer.renderInventory(this.bookManager.books);
  }

  // Save data (handled by Persistence class)
  save() {
    Persistence.save({
      books: this.bookManager.books,
      members: this.memberManager.members
    });
  }

  // Add a book (delegated to BookManager)
  addBook(id, title, author) {
    this.bookManager.addBook(id, title, author);  // Now handled by BookManager
    this.save();
    this.renderer.renderInventory(this.bookManager.books); // UI rendering handled by Renderer
  }

  // Checkout a book (delegated to BookManager and PaymentProcessor)
  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const book = this.bookManager.checkoutBook(bookId);
    const member = this.memberManager.findMember(memberId);
    if (!book || !member) return;

    let fee = this.calculateFee(days);
    if (fee > 0) {
      const result = this.paymentProcessor.charge(fee, card);  // Payment handled by PaymentProcessor
      if (!result.ok) return;
      member.fees += fee;
    }

    this.mailer.send(member.email, 'Checkout', `You borrowed ${book.title}. Fee: $${fee}`);  // Email sending handled by MailerService
    this.save();
    this.renderer.renderInventory(this.bookManager.books);  // UI rendering handled by Renderer
    this.renderer.renderMember(member);  // Render member details
  }

  // Calculate late fee for books
  calculateFee(days) {
    return days > 14 ? (days - 14) * 0.5 : 0;
  }
}



  // Hard-coded concrete services (tight coupling)
 // PaymentProcessor.js - Handles payment logic (now separate from Library)
  class PaymentProcessor {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true, txn: Math.random().toString(36).slice(2) }; // Fake transaction logic
  }
}


class Persistence {
  static load() {
    try {
      const data = JSON.parse(localStorage.getItem('LIB_DATA') || '{}');
      return data;
    } catch (e) {
      console.error('Load failed. Resetting.');
      return { books: [], members: [] };
    }
  }

  static save(data) {
    localStorage.setItem('LIB_DATA', JSON.stringify(data));
    console.log('Saved data to localStorage.');
  }
}

  class BookManager {
  constructor() {
    this.books = [];
  }

  addBook(id, title, author) {
    if (!id || !title) throw new Error('Missing fields');
    this.books.push({ id, title, author, available: true });
  }

  checkoutBook(bookId) {
    const book = this.books.find(b => b.id === bookId);
    if (!book || !book.available) return null;
    book.available = false;
    return book;
  }
}


  search(term) {  
    const t = term.trim().toLowerCase();
    const res = this.books.filter(b => b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t));
    this._log(`Search '${term}' → ${res.length} results.`);
    this.renderInventory('#app');
    return res;
  };

  // MemberManager.js - Handles member-related operations
class MemberManager {
  constructor() {
    this.members = [];
  }

  registerMember(id, name, email) {
    this.members.push({ id, name, email, fees: 0 });
  }

  findMember(id) {
    return this.members.find(m => m.id === id);
  }
}


  // UI rendering tightly coupled
// Renderer.js - Handles UI rendering logic (separated from Library)
class Renderer {
  renderInventory(books) {
    const el = document.querySelector('#app');
    el.innerHTML = `<h3>Inventory</h3>` +
      `<ul>` + books.map(b => `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`).join('') + `</ul>`;
  }

  renderMember(member) {
    const el = document.querySelector('#member');
    el.innerHTML = member ? `<h3>${member.name}</h3><p>${member.email}</p><p>Fees: $${member.fees}</p>` : '<em>No member selected.</em>';
  }
}

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log('[LOG]', msg);
  }


// --- Minimal wiring (STILL tightly coupled) ---
(function bootstrap() {
  const bookManager = new BookManager();
  const memberManager = new MemberManager();
  const paymentProcessor = new PaymentProcessor();  
  const mailerService = new MailerService();        
  const renderer = new Renderer();                  
  const library = new Library(bookManager, memberManager, paymentProcessor, mailerService, renderer);  

  library.load(); // Load data

  const $ = sel => document.querySelector(sel);
  $('#add').onclick = () => library.addBook($('#id').value, $('#title').value, $('#author').value);
  $('#checkout').onclick = () => library.checkoutBook($('#bookId').value, $('#memberId').value);
  $('#search').oninput = e => library.search(e.target.value);
  $('#seed').onclick = () => {
    if (library.books.length === 0) {
      library.addBook('b1', 'Clean Code', 'Robert C. Martin');
      library.addBook('b2', 'Design Patterns', 'GoF');
    }
    if (library.members.length === 0) {
      library.registerMember('m1', 'Ada', 'ada@example.com');
      library.registerMember('m2', 'Linus', 'linus@example.com');
    }
    alert('Seeded.');
  };
  $('#reset').onclick = () => { localStorage.removeItem('LIB_DATA'); location.reload(); };
})();
