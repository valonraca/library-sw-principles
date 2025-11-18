/* eslint-disable no-alert */
// UI shell responsible for DOM wiring; domain logic lives in LibraryService
(function bootstrapUI(global) {
  class LibraryUI {
    constructor(service, doc) {
      this.service = service;
      this.doc = doc;
      this.inventorySel = '#app';
      this.memberSel = '#member';
      this.currentMemberId = null;
    }

    init() {
      // Load initial state, hook up DOM events, and draw first screens
      this.service.initialize();
      this._bindEvents();
      this.renderInventory();
      this.renderMember();
    }

    _bindEvents() {
      // Basic declarative bindings; each handler calls into the domain service
      this.$('#add').addEventListener('click', () => this._handleAddBook());
      this.$('#reg').addEventListener('click', () => this._handleRegisterMember());
      this.$('#checkout').addEventListener('click', () => this._handleCheckout());
      this.$('#search').addEventListener('input', (e) => this._handleSearch(e));
      this.$('#seed').addEventListener('click', () => this._handleSeed());
      this.$('#reset').addEventListener('click', () => this._handleReset());
    }

    _handleAddBook() {
      // Capture inputs and send to service; only UI updates happen here
      this._execute(() => this.service.addBook({
        id: this._value('#id'),
        title: this._value('#title'),
        author: this._value('#author')
      }), () => {
        this._clearInputs('#id', '#title', '#author');
      });
    }

    _handleRegisterMember() {
      // After registering we track the last member to render their card
      this._execute(() => this.service.registerMember({
        id: this._value('#mid'),
        name: this._value('#mname'),
        email: this._value('#memail')
      }), ({ member }) => {
        this.currentMemberId = member.id;
        this.renderMember(member.id);
        this._clearInputs('#mid', '#mname', '#memail');
      });
    }

    _handleCheckout() {
      // Checkout uses the injected payment/notifier via the service
      this._execute(() => this.service.checkoutBook({
        bookId: this._value('#bookId'),
        memberId: this._value('#memberId'),
        days: 21,
        card: '4111-1111'
      }), ({ member }) => {
        this.currentMemberId = member.id;
        this.renderMember(member.id);
      });
    }

    _handleSearch(event) {
      const term = event.target.value || '';
      this.service.search(term);
      this.renderInventory();
    }

    _handleSeed() {
      // Simple demo data seeding so the UI stays familiar
      const actions = [];
      if (this.service.getBooks().length === 0) {
        actions.push(() => this.service.addBook({ id: 'b1', title: 'Clean Code', author: 'Robert C. Martin' }));
        actions.push(() => this.service.addBook({ id: 'b2', title: 'Design Patterns', author: 'GoF' }));
      }
      if (this.service.getMembers().length === 0) {
        actions.push(() => this.service.registerMember({ id: 'm1', name: 'Ada', email: 'ada@example.com' }));
        actions.push(() => this.service.registerMember({ id: 'm2', name: 'Linus', email: 'linus@example.com' }));
      }
      actions.forEach(action => this._execute(action));
      if (actions.length > 0) {
        alert('Seeded.');
      }
    }

    _handleReset() {
      global.localStorage.removeItem('LIB_DATA');
      global.location.reload();
    }

    renderInventory() {
      // Renders inventory panel using current service state + log tail
      const el = this.$(this.inventorySel);
      const books = this.service.getBooks();
      const recentLog = this.service.getLog().slice(-3).join('<br/>');
      el.innerHTML = `<h3>Inventory</h3>` +
        `<ul>` + books.map(b => `<li><strong>${b.available ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</strong> ${b.id}: ${b.title} — ${b.author || ''}</li>`).join('') + `</ul>` +
        `<div class="muted">${recentLog || ''}</div>`;
    }

    renderMember(memberId = this.currentMemberId) {
      // Renders right-side member card if one is selected
      const el = this.$(this.memberSel);
      if (!memberId) {
        el.innerHTML = '<em>No member selected.</em>';
        return;
      }
      const member = this.service.getMemberById(memberId);
      el.innerHTML = member
        ? `<h3>${member.name}</h3><p>${member.email}</p><p>Fees: $${member.fees}</p>`
        : '<em>No member selected.</em>';
    }

    _execute(action, onSuccess) {
      // Helper to standardize success/error handling after service calls
      // Acceptance: domain methods stay DOM-free; UI owns alerts/rendering
      const result = typeof action === 'function' ? action() : null;
      if (!result?.ok) {
        if (result && result.error) this._showError(result.error);
        return result;
      }
      if (typeof onSuccess === 'function') onSuccess(result.data);
      this.renderInventory();
      return result;
    }

    _showError(message) {
      alert(message);
    }

    _value(sel) {
      const input = this.$(sel);
      return (input.value || '').trim();
    }

    _clearInputs(...selectors) {
      selectors.forEach(sel => {
        const input = this.$(sel);
        if (input) input.value = '';
      });
    }

    $(sel) {
      return this.doc.querySelector(sel);
    }
  }

  function createService() {
    // Build the real adapters and inject them into the domain service
    // Acceptance: swapping payment/notifier only touches this wiring layer
    const adapters = global.LibraryAdapters || {};
    const gateway = new adapters.LocalStorageGateway('LIB_DATA');
    const bookRepo = new adapters.LocalStorageBookRepo(gateway);
    const memberRepo = new adapters.LocalStorageMemberRepo(gateway);
    return new global.LibraryService({
      bookRepo,
      memberRepo,
      paymentProvider: new adapters.FakePaymentProvider(),
      notifier: new adapters.ConsoleNotifier()
    });
  }

  function start() {
    // Entry point: create service + UI once DOM is ready
    const service = createService();
    const ui = new LibraryUI(service, global.document);
    ui.init();
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
