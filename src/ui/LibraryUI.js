export default class LibraryUI {
  constructor(service, { inventorySel, memberSel }) {
    this.service = service;
    this.inventorySel = inventorySel;
    this.memberSel = memberSel;
    this.currentSearchTerm = '';
  }

  init() {
    this.renderInventory();
    this.renderMember(null);
    this._wireEvents();
  }

  _wireEvents() {
    const $ = s => document.querySelector(s);

    $('#add').onclick = () => {
      const result = this.service.addBook(
        $('#id').value,
        $('#title').value,
        $('#author').value
      );
      if (!result.ok) return alert(result.error);
      this.renderInventory();
    };

    $('#reg').onclick = () => {
      const result = this.service.registerMember(
        $('#mid').value,
        $('#mname').value,
        $('#memail').value
      );
      if (!result.ok) return alert(result.error);
      this.renderInventory();
    };

    $('#checkout').onclick = () => {
      const result = this.service.checkoutBook(
        $('#bookId').value,
        $('#memberId').value
      );
      if (!result.ok) return alert(result.error);

      this.renderInventory();
      this.renderMember(result.memberId);
    };

    $('#search').oninput = e => {
      this.currentSearchTerm = e.target.value;
      this.renderInventory();
    };

    $('#seed').onclick = () => {
      const snap = this.service.getSnapshot();
      if (snap.books.length === 0) {
        this.service.addBook('b1', 'Clean Code', 'Robert C. Martin');
        this.service.addBook('b2', 'Design Patterns', 'GoF');
      }
      if (snap.members.length === 0) {
        this.service.registerMember('m1', 'Ada', 'ada@example.com');
        this.service.registerMember('m2', 'Linus', 'linus@example.com');
      }
      this.renderInventory();
      alert('Seeded.');
    };

    $('#reset').onclick = () => {
      localStorage.removeItem('LIB_DATA');
      location.reload();
    };

    $('#memberId').onchange = e => {
      const id = e.target.value;
      this.renderMember(id);
    };
  }

  renderInventory() {
    const el = document.querySelector(this.inventorySel);
    const books = this.service.findBooks(this.currentSearchTerm);
    const snap = this.service.getSnapshot();

    const list = books.map(b =>
      `<li>
        <strong>${b.available ? '[OK]' : '[OUT]'}</strong>
        ${b.id}: ${b.title} — ${b.author}
      </li>`
    ).join('');

    el.innerHTML =
      `<h3>Inventory</h3>
       <ul>${list}</ul>
       <div class="muted">${snap.log.slice(-3).join('<br/>')}</div>`;
  }

  renderMember(id) {
    const el = document.querySelector(this.memberSel);
    if (!id) {
      el.innerHTML = '<em>No member selected.</em>';
      return;
    }

    const m = this.service.getMemberById(id);

    el.innerHTML = m
      ? `<h3>${m.name}</h3>
         <p>${m.email}</p>
         <p>Fees: $${m.fees}</p>`
      : `<em>No member found.</em>`;
  }
}
