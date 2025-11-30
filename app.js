const Library = {
  books: [],
  members: [],
  log: [],

  // CHANGE 1 (OCP): soft extension points instead of hard-coded services
  paymentPort: {
    charge(amount, card) {
      console.log(`[FakeStripe] Charging $${amount} to ${card}`);
      return { ok: true };
    }
  },

  notifierPort: {
    send(to, subject, body) {
      console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    }
  },

  // CHANGE 2 (SRP): internal domain-only service
  libraryService: {
    calcFee(days) {
      return days > 14 ? (days - 14) * 0.5 : 0;
    },
    processPayment(member, fee, card, paymentPort) {
      if (fee > 0) {
        const res = paymentPort.charge(fee, card);
        if (!res.ok) throw new Error("Payment failed");
        member.fees += fee;
      }
    },
    notifyCheckout(member, book, fee, notifierPort) {
      notifierPort.send(member.email, "Checkout", `You borrowed ${book.title}. Fee: $${fee}`);
    }
  },

  // Persistence (unchanged)
  load() {
    try {
      const data = JSON.parse(localStorage.getItem('LIB_DATA') || '{}');
      this.books = data.books || [];
      this.members = data.members || [];
      this._log(`Loaded ${this.books.length} books & ${this.members.length} members from localStorage.`);
    } catch {
      this._log('Load failed. Resetting.');
      this.books = []; this.members = [];
    }
    this.renderInventory('#app');
  },

  save() {
    localStorage.setItem('LIB_DATA', JSON.stringify({
      books: this.books,
      members: this.members
    }));
    this._log('Saved data to localStorage.');
  },

  // Domain/UI mixed (kept same)
  addBook(id, title, author) {
    if (!id || !title) { alert('Missing fields'); return; }
    this.books.push({ id, title, author, available: true });
    this._log(`Book added: ${title}`);
    this.save();
    this.renderInventory('#app');
  },

  registerMember(id, name, email) {
    if (!email.includes('@')) { alert('Invalid email'); return; }
    this.members.push({ id, name, email, fees: 0 });
    this._log(`Member registered: ${name}`);
    this.notifierPort.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
    this.save();
  },

  // CHANGE 3 (SRP): checkout delegates domain logic to libraryService
  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const b = this.books.find(x => x.id === bookId);
    const m = this.members.find(x => x.id === memberId);

    if (!b) return alert('Book not found');
    if (!m) return alert('Member not found');
    if (!b.available) return alert('Book already checked out');

    try {
      const fee = this.libraryService.calcFee(days);
      this.libraryService.processPayment(m, fee, card, this.paymentPort);
      b.available = false;
      this.libraryService.notifyCheckout(m, b, fee, this.notifierPort);
      this._log(`Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee}).`);
    } catch (e) {
      return alert(e.message);
    }

    this.save();
    this.renderInventory('#app');
    this.renderMember(m.id, '#member');
  },

  search(term) {
    const t = term.trim().toLowerCase();
    const res = this.books.filter(b =>
      b.title.toLowerCase().includes(t) ||
      b.author.toLowerCase().includes(t)
    );
    this._log(`Search '${term}' → ${res.length} results.`);
    this.renderInventory('#app');
    return res;
  },

  // Rendering (unchanged)
  renderInventory(sel) {
    const el = document.querySelector(sel);
    el.innerHTML = `<h3>Inventory</h3>` +
      `<ul>` + this.books.map(b =>
        `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author}</li>`
      ).join('') + `</ul>` +
      `<div class="muted">${this.log.slice(-3).join('<br/>')}</div>`;
  },

  renderMember(memberId, sel) {
    const m = this.members.find(x => x.id === memberId);
    const el = document.querySelector(sel);
    el.innerHTML = m
      ? `<h3>${m.name}</h3><p>${m.email}</p><p>Fees: $${m.fees}</p>`
      : '<em>No member selected.</em>';
  },

  _log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.log.push(`${stamp} — ${msg}`);
    if (this.log.length > 50) this.log.shift();
    console.log('[LOG]', msg);
  }
};
