// Frontend: binds DOM to LibraryService instance.
// Keeps UI logic out of domain modules.

function $id(id) { return document.getElementById(id); }

export const Frontend = {
  init({ library, storage, notifier }) {
    if (!library) throw new Error('Frontend.init requires a library instance');

    // set up UI controls
    const controls = {
      books: $id('books'),
      members: $id('members'),
      search: $id('search'),
      seed: $id('seed'),
      clear: $id('clear'),
      addBookBtn: $id('addBook'),
      newBookTitle: $id('newBookTitle'),
      newBookAuthor: $id('newBookAuthor'),
      addMemberBtn: $id('addMember'),
      memberName: $id('memberName'),
      memberEmail: $id('memberEmail'),
      checkoutBtn: $id('checkout'),
      checkoutBookId: $id('checkoutBookId'),
      checkoutMemberId: $id('checkoutMemberId'),
      cardForPayment: $id('cardForPayment'),
      returnBookBtn: $id('returnBook'),
      returnBookId: $id('returnBookId')
    };

    // render from snapshot
    const render = (snapshot) => {
      const b = (snapshot && snapshot.books) ? snapshot.books : [];
      const m = (snapshot && snapshot.members) ? snapshot.members : [];

      controls.books.innerHTML = b.map(book => {
        const status = book.available ? 'available' : `checked out by ${book.borrowerId}`;
        return `<li><strong>${book.title}</strong> <span class="muted">(${book.id})</span><br/><small>${book.author} — ${status}</small></li>`;
      }).join('');

      controls.members.innerHTML = m.map(mem => {
        return `<li><strong>${mem.name}</strong> <span class="muted">(${mem.id})</span><br/><small>${mem.email} — fees: $${(mem.fees||0).toFixed(2)}</small></li>`;
      }).join('');
    };

    // initial render
    render(library._snapshot ? library._snapshot() : library._snapshot); // safe-call attempt
    // always fetch latest snapshot from the domain
    library.restore().then(() => render(library._snapshot ? library._snapshot() : library.getSnapshot?.() || {})).catch(()=>{ render(library._snapshot ? library._snapshot() : {}); });

    // actions
    controls.seed.addEventListener('click', () => {
      library.seedIfEmpty();
      library.persist(); // ensure persisted
      render(library._snapshot());
    });

    controls.clear.addEventListener('click', async () => {
      if (storage && typeof storage.clear === 'function') {
        await storage.clear();
      }
      // reload state in memory
      library.books = [];
      library.members = [];
      library.log = [];
      render(library._snapshot());
    });

    controls.addBookBtn.addEventListener('click', () => {
      const title = controls.newBookTitle.value.trim() || 'Untitled';
      const author = controls.newBookAuthor.value.trim() || 'Unknown';
      try {
        library.addBook(undefined, title, author);
        render(library._snapshot());
        controls.newBookTitle.value = '';
        controls.newBookAuthor.value = '';
      } catch (e) {
        alert(e.message || 'Could not add book');
      }
    });

    controls.addMemberBtn.addEventListener('click', () => {
      const name = controls.memberName.value.trim() || 'NoName';
      const email = controls.memberEmail.value.trim() || '';
      try {
        library.registerMember(undefined, name, email);
        render(library._snapshot());
        controls.memberName.value = '';
        controls.memberEmail.value = '';
      } catch (e) {
        alert(e.message || 'Could not register member');
      }
    });

    controls.checkoutBtn.addEventListener('click', async () => {
      const bId = controls.checkoutBookId.value.trim();
      const mId = controls.checkoutMemberId.value.trim();
      const card = controls.cardForPayment.value.trim() || 'card-test-4242';
      if (!bId || !mId) { alert('Provide both book id and member id'); return; }
      try {
        await library.checkout(bId, mId, card);
        render(library._snapshot());
        controls.checkoutBookId.value = '';
        controls.checkoutMemberId.value = '';
        controls.cardForPayment.value = '';
      } catch (e) {
        alert('Checkout failed: ' + (e.message || e));
      }
    });

    controls.returnBookBtn.addEventListener('click', async () => {
      const bId = controls.returnBookId.value.trim();
      if (!bId) { alert('Provide a book id'); return; }
      try {
        await library.returnBook(bId);
        render(library._snapshot());
        controls.returnBookId.value = '';
      } catch (e) {
        alert('Return failed: ' + (e.message || e));
      }
    });

    controls.search.addEventListener('input', (ev) => {
      const q = ev.target.value;
      const found = library.search(q);
      render(found);
    });
  }
};
