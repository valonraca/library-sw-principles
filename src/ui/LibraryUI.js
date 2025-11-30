export default class LibraryUI {
  constructor(service, { inventorySel, memberSel }) {
    this.service = service;
    this.inventorySel = inventorySel;
    this.memberSel = memberSel;

    this.inventoryEl = null;
    this.memberEl = null;
    this.currentMemberId = null;
  }

  init() {
    this.inventoryEl = document.querySelector(this.inventorySel);
    this.memberEl = document.querySelector(this.memberSel);

    this._bindControls();

    this.service.init();
    this._renderInventory();
    this._renderMember();
  }

  _bindControls() {
    const $ = (sel) => document.querySelector(sel);

    $('#add').onclick = () => {
      try {
        this.service.addBook($('#id').value, $('#title').value, $('#author').value);
        this._renderInventory();
      } catch (err) {
        alert(err.message);
      }
    };

    $('#reg').onclick = () => {
      try {
        const id = $('#mid').value;
        this.service.registerMember(id, $('#mname').value, $('#memail').value);
        this.currentMemberId = id;
        this._renderMember();
      } catch (err) {
        alert(err.message);
      }
    };

    $('#checkout').onclick = () => {
      try {
        const bookId = $('#bookId').value;
        const memberId = $('#memberId').value;
        if (memberId) this.currentMemberId = memberId;

        this.service.checkoutBook(bookId, memberId);
        this._renderInventory();
        this._renderMember();
      } catch (err) {
        alert(err.message);
      }
    };

    $('#search').oninput = (e) => {
      const term = e.target.value;
      const results = this.service.search(term);
      this._renderInventory(results);
    };

    $('#seed').onclick = () => {
      const snapshot = this.service.getSnapshot();

      if (snapshot.books.length === 0) {
        this.service.addBook('b1', 'Clean Code', 'Robert C. Martin');
        this.service.addBook('b2', 'Design Patterns', 'GoF');
      }
      if (snapshot.members.length === 0) {
        this.service.registerMember('m1', 'Ada', 'ada@example.com');
        this.service.registerMember('m2', 'Linus', 'linus@example.com');
        this.currentMemberId = 'm1';
      }

      this._renderInventory();
      this._renderMember();
      alert('Seeded.');
    };

    $('#reset').onclick = () => {
      localStorage.removeItem('LIB_DATA');
      location.reload();
    };
  }

  _renderInventory(booksOverride) {
    if (!this.inventoryEl) return;
    const snapshot = this.service.getSnapshot();
    const books = booksOverride || snapshot.books;

    this.inventoryEl.innerHTML =
      `<h3>Inventory</h3>` +
      `<ul>` +
      books
        .map(
          (b) =>
            `<li><strong>${
              b.available
                ? '<span class="ok">✓</span>'
                : '<span class="no">✗</span>'
            }</strong> ${b.id}: ${b.title} — ${b.author}</li>`
        )
        .join('') +
      `</ul>` +
      `<div class="muted">${snapshot.log.slice(-3).join('<br/>')}</div>`;
  }

  _renderMember() {
    if (!this.memberEl) return;
    const snapshot = this.service.getSnapshot();

    const member =
      snapshot.members.find((m) => m.id === this.currentMemberId) ||
      snapshot.members[0];

    if (!member) {
      this.memberEl.innerHTML = '<em>No member selected.</em>';
      return;
    }

    this.memberEl.innerHTML =
      `<h3>${member.name}</h3>` +
      `<p>${member.email}</p>` +
      `<p>Fees: $${member.fees}</p>`;
  }
}
