// const Library = {
//   books: [], // [{id, title, author, available}]
//   members: [], // [{id, name, email, fees}]
//   log: [],

//   // Hard-coded concrete services (tight coupling)
//   paymentProvider: {
//     charge(amount, card) {
//       console.log(`[FakeStripe] Charging $${amount} to ${card}`);
//       return { ok: true, txn: Math.random().toString(36).slice(2) };
//     }
//   },
//   mailer: {
//     send(to, subject, body) {
//       console.log(`[Email] to=${to} subject=${subject} body=${body}`);
//       return true;
//     }
//   },

//   // Persistence mixed with domain (uses localStorage to keep it simple)
//   load() {
//     try {
//       const data = JSON.parse(localStorage.getItem('LIB_DATA') || '{}');
//       this.books = data.books || [];
//       this.members = data.members || [];
//       this._log(`Loaded ${this.books.length} books & ${this.members.length} members from localStorage.`);
//     } catch (e) {
//       this._log('Load failed. Resetting.');
//       this.books = []; this.members = [];
//     }
//     this.renderInventory('#app');
//   },
//   save() {
//     localStorage.setItem('LIB_DATA', JSON.stringify({ books: this.books, members: this.members }));
//     this._log('Saved data to localStorage.');
//   },

//   // Domain operations (validation + policies + I/O + UI side-effects all jumbled)
//   addBook(id, title, author) {
//     if (!id || !title) { alert('Missing fields'); return; }
//     this.books.push({ id, title, author, available: true });
//     this._log(`Book added: ${title}`);
//     this.save();
//     this.renderInventory('#app');
//   },
//   registerMember(id, name, email) {
//     if (!email || email.indexOf('@') < 0) { alert('Invalid email'); return; }
//     this.members.push({ id, name, email, fees: 0 });
//     this._log(`Member registered: ${name}`);
//     this.mailer.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
//     this.save();
//   },
//   checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
//     const b = this.books.find(x => x.id === bookId);
//     const m = this.members.find(x => x.id === memberId);
//     if (!b) return alert('Book not found');
//     if (!m) return alert('Member not found');
//     if (!b.available) return alert('Book already checked out');

//     let fee = 0; // Nonsense rule baked in here (policy + payment together)
//     if (days > 14) fee = (days - 14) * 0.5;
//     if (fee > 0) {
//       const res = this.paymentProvider.charge(fee, card);
//       if (!res.ok) return alert('Payment failed');
//       m.fees += fee; // double-duty meaning as outstanding + history
//     }
//     b.available = false;
//     this._log(`Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee}).`);
//     this.mailer.send(m.email, 'Checkout', `You borrowed ${b.title}. Fee: $${fee}`);
//     this.save();
//     this.renderInventory('#app');
//     this.renderMember(m.id, '#member');
//   },

//   search(term) {
//     const t = term.trim().toLowerCase();
//     const res = this.books.filter(b => b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t));
//     this._log(`Search '${term}' → ${res.length} results.`);
//     this.renderInventory('#app');
//     return res;
//   },

//   // UI rendering tightly coupled
//   renderInventory(sel) {
//     const el = document.querySelector(sel);
//     el.innerHTML = `<h3>Inventory</h3>` +
//       `<ul>` + this.books.map(b => `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`).join('') + `</ul>` +
//       `<div class="muted">${this.log.slice(-3).join('<br/>')}</div>`;
//   },
//   renderMember(memberId, sel) {
//     const m = this.members.find(x => x.id === memberId);
//     const el = document.querySelector(sel);
//     el.innerHTML = m ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>` : '<em>No member selected.</em>';
//   },

//   _log(msg) {
//     const stamp = new Date().toLocaleTimeString();
//     this.log.push(`${stamp} — ${msg}`);
//     if (this.log.length > 50) this.log.shift();
//     console.log('[LOG]', msg);
//   }
// };

// // --- Minimal wiring (STILL tightly coupled) ---
// (function bootstrap(){
//   Library.load();

//   const $ = sel => document.querySelector(sel);
//   $('#add').onclick = () => Library.addBook($('#id').value, $('#title').value, $('#author').value);
//   $('#reg').onclick = () => Library.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
//   $('#checkout').onclick = () => Library.checkoutBook($('#bookId').value, $('#memberId').value);
//   $('#search').oninput = e => Library.search(e.target.value);
//   $('#seed').onclick = () => {
//     if (Library.books.length === 0) {
//       Library.addBook('b1', 'Clean Code', 'Robert C. Martin');
//       Library.addBook('b2', 'Design Patterns', 'GoF');
//     }
//     if (Library.members.length === 0) {
//       Library.registerMember('m1', 'Ada', 'ada@example.com');
//       Library.registerMember('m2', 'Linus', 'linus@example.com');
//     }
//     alert('Seeded.');
//   };
//   $('#reset').onclick = () => { localStorage.removeItem('LIB_DATA'); location.reload(); };
// })();




  class LibraryService{
    constructor(bookRepo, memberRepo, notifier, paymentProvider){
      this.bookRepo = bookRepo;
      this.memberRepo = memberRepo;
      this.notifier = notifier;
      this.paymentProvider = paymentProvider;
  }

  addBook(id, title, author){
    if (!id || !title) {
       alert('Missing fields'); return; }

       this.bookRepo.add({ id, title, author, available: true });
  }

  registerMember(id, name, email){
    if (!email || email.indexOf('@') < 0) {
       alert('Invalid email'); return; }

       this.memberRepo.add({ id, name, email, fees: 0 });
       this.notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111"){
    const b = this.bookRepo.find(bookId);
    const m = this.memberRepo.find(memberId);
    if (!b) return alert('Book not found');
    if (!m) return alert('Member not found');
    if (!b.available) return alert('Book already checked out');

    let fee = 0; // Nonsense rule baked in here (policy + payment together)
    if (days > 14) fee = (days - 14) * 0.5;
    if (fee > 0) {
      const res = this.paymentProvider.charge(fee, card);
      if (!res.ok) return alert('Payment failed');
      m.fees += fee; // double-duty meaning as outstanding + history
    }
    b.available = false;
    this.notifier.send(m.email, 'Checkout', `You borrowed ${b.title}. Fee: $${fee}`);
    this.bookRepo.update(b);
    this.memberRepo.update(m);
  }

  search(term){
    return this.bookRepo.search(term);
  }

}
  

//The implementation of the local repositories for Books and Members. Instead of having of having those empty arrays at the start of the Library object
//and then having methods that manipulate those arrays directly, we now have 2 dedicated classes that will handle all the persistence logic for us, such as
//loading, saving, adding, finding, updating, and searching for books and members.
  class BookRepository{
    constructor(storageKey = 'LIB_DATA'){
      this.storageKey = storageKey;
    }

    load(){
      return JSON.parse(localStorage.getItem(this.storageKey) || "{}").books || [];
    }

    save(books){
      const data = JSON.parse(localStorage.getItem(this.storageKey) || "{}");
      data.books = books;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    add(book){
      const books = this.load();
      books.push(book);
      this.save(books);
    }

    find(id){
      return this.load().find(b => b.id === id);
    }

    update(book){
      const books = this.load().map(b => b.id === book.id ? book : b);
      this.save(books);
    }

    search(term){
      return this.load().filter(b => b.title.toLowerCase().includes(term.toLowerCase()) || b.author.toLowerCase().includes(term.toLowerCase()));
    }
  }


  class MemberRepository{
    constructor(storageKey = 'LIB_DATA'){
      this.storageKey = storageKey;
    }

    load(){
      return JSON.parse(localStorage.getItem(this.storageKey) || "{}").members || [];
    }

    save(members){
      const data = JSON.parse(localStorage.getItem(this.storageKey) || "{}");
      data.members = members;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    add(member){
      const members = this.load();
      members.push(member);
      this.save(members);
    }

    find(id){
      return this.load().find(m => m.id === id);
    }

    update(member){
      const members = this.load().map(m => m.id === member.id ? member : m);
      this.save(members);
    }

  }


  const ConsoleNotifier ={
    send(to, subject, body){
      console.log(`[Email] to=${to} subject=${subject} body=${body}`);
      return true;
  }
};

const Payment ={
  charge(amount, card){
    console.log(`[Payment] amount=$${amount} card=${card}`);
    return { ok: true };
  }
};


(function bootstrap(){
  const service = new LibraryService(
    new BookRepository(),
    new MemberRepository(),
    ConsoleNotifier,
    Payment
  );

  const $ = sel => document.querySelector(sel);

  // --- Rendering helpers ---
  function renderBooks() {
    const books = service.bookRepo.load();
    $('#app').innerHTML = '<h3>Books</h3><ul>' +
      books.map(b => `<li>${b.id}: ${b.title} by ${b.author} ${b.available ? '<span class="ok">[Available]</span>' : '<span class="no">[Checked out]</span>'}</li>`).join('') +
      '</ul>';
  }

  function renderMembers() {
    const members = service.memberRepo.load();
    $('#member').innerHTML = '<h3>Members</h3><ul>' +
      members.map(m => `<li>${m.id}: ${m.name} (${m.email}) Fees: $${m.fees}</li>`).join('') +
      '</ul>';
  }

  function renderAll() {
    renderBooks();
    renderMembers();
  }

  // --- Event bindings ---
  $('#add').onclick = () => { 
    service.addBook($('#id').value, $('#title').value, $('#author').value);
    renderBooks();
  };

  $('#reg').onclick = () => { 
    service.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
    renderMembers();
  };

  $('#checkout').onclick = () => { 
    service.checkoutBook($('#bookId').value, $('#memberId').value);
    renderAll();
  };

  $('#search').oninput = e => {
    const results = service.search(e.target.value);
    $('#app').innerHTML = '<h3>Search Results</h3><ul>' +
      results.map(b => `<li>${b.title} by ${b.author}</li>`).join('') +
      '</ul>';
  };

  // --- Demo data ---
  const DEMO_BOOKS = [
    { id: '1', title: '1984', author: 'George Orwell' },
    { id: '2', title: 'Brave New World', author: 'Aldous Huxley' }
  ];
  const DEMO_MEMBERS = [
    { id: 'm1', name: 'Alice', email: 'alice@example.com' },
    { id: 'm2', name: 'Bob', email: 'bob@example.com' }
  ];

  $('#seed').onclick = () => {
    DEMO_BOOKS.forEach(b => service.addBook(b.id, b.title, b.author));
    DEMO_MEMBERS.forEach(m => service.registerMember(m.id, m.name, m.email));
    renderAll();
  };

  $('#reset').onclick = () => {
    localStorage.removeItem('LIB_DATA');
    renderAll();
  };

  // --- Initial render ---
  renderAll();
})();