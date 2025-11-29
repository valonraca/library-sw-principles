const Storage = {
  key: 'LIB_DATA',
  load() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '{}');
    } catch (e) {
      return {};
    }
  },
  save(books, members) {
    localStorage.setItem(this.key, JSON.stringify({ books, members }));
  }
};

function BookRepo() {
  const data = Storage.load();
  const books = data.books || [];
  return {
    getAll() { return books.slice(); },
    add(b) { books.push(b); this.save(); },
    find(id) { return books.find(x => x.id === id); },
    update(fn) { fn(books); this.save(); },
    save() { const d = Storage.load(); Storage.save(books, d.members || []); }
  };
}

function MemberRepo() {
  const data = Storage.load();
  const members = data.members || [];
  return {
    getAll() { return members.slice(); },
    add(m) { members.push(m); this.save(); },
    find(id) { return members.find(x => x.id === id); },
    update(fn) { fn(members); this.save(); },
    save() { const d = Storage.load(); Storage.save(d.books || [], members); }
  };
}

function LibraryService(bookRepo, memberRepo, payment, notifier) {
  const log = [];
  function _log(msg) { const stamp = new Date().toLocaleTimeString(); log.push(`${stamp} — ${msg}`); if (log.length > 50) log.shift(); console.log('[LOG]', msg); }
  return {
    log() { return log.slice(); },
    addBook(id, title, author) {
      if (!id || !title) return { ok: false, error: 'Missing fields' };
      const b = { id, title, author, available: true };
      bookRepo.add(b);
      _log(`Book added: ${title}`);
      return { ok: true, book: b };
    },
    registerMember(id, name, email) {
      if (!email || email.indexOf('@') < 0) return { ok: false, error: 'Invalid email' };
      const m = { id, name, email, fees: 0 };
      memberRepo.add(m);
      _log(`Member registered: ${name}`);
      if (notifier && notifier.send) notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
      return { ok: true, member: m };
    },
    checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
      const b = bookRepo.find(bookId);
      if (!b) return { ok: false, error: 'Book not found' };
      const m = memberRepo.find(memberId);
      if (!m) return { ok: false, error: 'Member not found' };
      if (!b.available) return { ok: false, error: 'Book already checked out' };
      let fee = 0;
      if (days > 14) fee = (days - 14) * 0.5;
      if (fee > 0) {
        if (!payment || !payment.charge) return { ok: false, error: 'No payment provider' };
        const res = payment.charge(fee, card);
        if (!res || !res.ok) return { ok: false, error: 'Payment failed' };
        memberRepo.update(ms => { const mm = ms.find(x => x.id === memberId); if (mm) mm.fees = (mm.fees || 0) + fee; });
      }
      bookRepo.update(bs => { const bb = bs.find(x => x.id === bookId); if (bb) bb.available = false; });
      _log(`Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee}).`);
      if (notifier && notifier.send) notifier.send(m.email, 'Checkout', `You borrowed ${b.title}. Fee: $${fee}`);
      return { ok: true, fee };
    },
    search(term) {
      const t = (term || '').trim().toLowerCase();
      const res = bookRepo.getAll().filter(b => b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t));
      _log(`Search '${term}' → ${res.length} results.`);
      return { ok: true, results: res };
    }
  };
}

const FakeStripe = { charge(amount, card) { console.log(`[FakeStripe] Charging $${amount} to ${card}`); return { ok: true, txn: Math.random().toString(36).slice(2) }; } };
const Mailer = { send(to, subject, body) { console.log(`[Email] to=${to} subject=${subject} body=${body}`); return true; } };

(function bootstrap(){
  const bookRepo = BookRepo();
  const memberRepo = MemberRepo();
  const service = LibraryService(bookRepo, memberRepo, FakeStripe, Mailer);

  function renderInventory(sel, books) {
    const el = document.querySelector(sel);
    const list = (books || bookRepo.getAll()).map(b => `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`).join('');
    el.innerHTML = `<h3>Inventory</h3><ul>${list}</ul><div class="muted">${service.log().slice(-3).join('<br/>')}</div>`;
  }

  function renderMember(memberId, sel) {
    const m = memberRepo.find(memberId);
    const el = document.querySelector(sel);
    el.innerHTML = m ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>` : '<em>No member selected.</em>';
  }

  renderInventory('#app');

  const $ = sel => document.querySelector(sel);
  $('#add').onclick = () => {
    const res = service.addBook($('#id').value, $('#title').value, $('#author').value);
    if (!res.ok) return alert(res.error);
    renderInventory('#app');
  };
  $('#reg').onclick = () => {
    const res = service.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
    if (!res.ok) return alert(res.error);
  };
  $('#checkout').onclick = () => {
    const res = service.checkoutBook($('#bookId').value, $('#memberId').value);
    if (!res.ok) return alert(res.error);
    renderInventory('#app');
    renderMember($('#memberId').value, '#member');
  };
  $('#search').oninput = e => {
    const r = service.search(e.target.value);
    if (r.ok) renderInventory('#app', r.results);
  };
  $('#seed').onclick = () => {
    if (bookRepo.getAll().length === 0) {
      service.addBook('b1', 'Clean Code', 'Robert C. Martin');
      service.addBook('b2', 'Design Patterns', 'GoF');
    }
    if (memberRepo.getAll().length === 0) {
      service.registerMember('m1', 'Ada', 'ada@example.com');
      service.registerMember('m2', 'Linus', 'linus@example.com');
    }
    alert('Seeded.');
    renderInventory('#app');
  };
  $('#reset').onclick = () => { localStorage.removeItem('LIB_DATA'); location.reload(); };
})();
