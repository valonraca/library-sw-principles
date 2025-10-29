import { BookManager } from "./bookManager.js";
import { StorageAdapter } from "./storageadapter.js";

// External services injected via dependency injection
const messenger = {
  email(to, subject, msg) {
    console.log(`[Mail] → ${to} | ${subject}`);
    return true;
  }
};

const billing = {
  process(amount, cardNo) {
    console.log(`[PaySys] charged $${amount} to ${cardNo}`);
    return { success: true, code: Math.random().toString(36).slice(2) };
  }
};

// Instantiate adapters for persistence
const bookStore = new StorageAdapter("BOOKS_DB");
const memberStore = new StorageAdapter("MEMBERS_DB");

// Create manager
const manager = new BookManager(bookStore, memberStore, messenger, billing);

// --- UI Logic ---
(function initUI() {
  const $ = sel => document.querySelector(sel);

  const renderBooks = () => {
    const books = bookStore.fetchAll();
    const list = books.map(b =>
      `<li>${b.id}: ${b.title} — ${b.author} ${b.available ? '✅' : '❌'}</li>`).join('');
    $('#app').innerHTML = `<ul>${list}</ul>`;
  };

  $('#add').onclick = () => {
    try {
      const info = manager.addNewBook($('#id').value, $('#title').value, $('#author').value);
      alert(info);
      renderBooks();
    } catch (err) { alert(err.message); }
  };

  $('#reg').onclick = () => {
    try {
      const info = manager.createMember($('#mid').value, $('#mname').value, $('#memail').value);
      alert(info);
    } catch (err) { alert(err.message); }
  };

  $('#checkout').onclick = () => {
    try {
      const msg = manager.loanBook($('#bookId').value, $('#memberId').value);
      alert(msg);
      renderBooks();
    } catch (err) { alert(err.message); }
  };

  // ✅ Seed button – generates demo or user-provided data
  $('#seed').onclick = () => {
    const id = $('#id').value || 'B' + Math.random().toString(36).slice(2, 5);
    const title = $('#title').value || `Untitled Book ${Date.now()}`;
    const author = $('#author').value || `Author_${Math.floor(Math.random() * 100)}`;

    manager.addNewBook(id, title, author);
    renderBooks();
    alert(`Seeded book: ${title} by ${author}`);
  };

  // ✅ Reset button – clears all data
  $('#reset').onclick = () => {
    if (confirm('Reset all stored data?')) {
      bookStore.clearAll();
      memberStore.clearAll();
      renderBooks();
      alert('Storage reset complete.');
    }
  };

  renderBooks();
})();
