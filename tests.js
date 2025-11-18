// Simple unit-ish tests - run these functions in the browser console
// Example: testAddBook()

function testAddBook() {
  const bookRepo = { loadAll: () => [], saveAll: () => {} };
  const memberRepo = { loadAll: () => [], saveAll: () => {} };
  const paymentProvider = { charge: () => ({ ok: true }) };
  const notifier = { send: () => true };
  
  const service = new LibraryService({ bookRepo, memberRepo, paymentProvider, notifier });
  service.initialize();
  
  const result = service.addBook({ id: 't1', title: 'Test', author: 'Author' });
  const books = service.getBooks();
  
  console.assert(result.ok, 'addBook should succeed');
  console.assert(books.length === 1, 'Should have one book');
  console.assert(books[0].available === true, 'Book should be available');
  console.log('✓ testAddBook passed');
}

function testRegisterMember() {
  const bookRepo = { loadAll: () => [], saveAll: () => {} };
  const memberRepo = { loadAll: () => [], saveAll: () => {} };
  const paymentProvider = { charge: () => ({ ok: true }) };
  const notifier = { send: () => true };
  
  const service = new LibraryService({ bookRepo, memberRepo, paymentProvider, notifier });
  service.initialize();
  
  const bad = service.registerMember({ id: 'm1', name: 'Bad', email: 'invalid' });
  const good = service.registerMember({ id: 'm2', name: 'Good', email: 'good@test.com' });
  
  console.assert(!bad.ok, 'Should reject invalid email');
  console.assert(good.ok, 'Should accept valid email');
  console.log('✓ testRegisterMember passed');
}

function testCheckoutBook() {
  const bookRepo = { 
    loadAll: () => [{ id: 'b1', title: 'Book', author: 'Auth', available: true }],
    saveAll: () => {}
  };
  const memberRepo = { 
    loadAll: () => [{ id: 'm1', name: 'Member', email: 'm@test.com', fees: 0 }],
    saveAll: () => {}
  };
  const paymentProvider = { 
    charges: [],
    charge(amount, card) {
      this.charges.push(amount);
      return { ok: true };
    }
  };
  const notifier = { 
    messages: [],
    send(to, subject, body) {
      this.messages.push({ to, subject });
      return true;
    }
  };
  
  const service = new LibraryService({ bookRepo, memberRepo, paymentProvider, notifier });
  service.initialize();
  
  const result = service.checkoutBook({ bookId: 'b1', memberId: 'm1', days: 21 });
  const books = service.getBooks();
  
  console.assert(result.ok, 'Checkout should succeed');
  console.assert(books[0].available === false, 'Book should be unavailable');
  console.assert(paymentProvider.charges.length === 1, 'Should charge late fee');
  console.assert(notifier.messages.length === 1, 'Should send notification');
  console.log('✓ testCheckoutBook passed');
}
