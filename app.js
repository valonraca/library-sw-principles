import { LibraryService } from "./LibraryService.js";
import { FakePayment } from "./FakePayment.js";
import { ConsoleNotifier } from "./ConsoleNotifier.js";

// Simple in-memory “repos”
const books = [];
const members = [];

const service = new LibraryService(
  books,
  members,
  new FakePayment(),
  new ConsoleNotifier()
);

// UI wiring
(function bootstrap() {

  const $ = sel => document.querySelector(sel);

  $('#add').onclick = () => {
    try {
      service.addBook($('#id').value, $('#title').value, $('#author').value);
      render();
    } catch (e) { alert(e.message); }
  };

  $('#reg').onclick = () => {
    try {
      service.registerMember($('#mid').value, $('#mname').value, $('#memail').value);
      render();
    } catch (e) { alert(e.message); }
  };

  $('#checkout').onclick = () => {
    try {
      const res = service.checkoutBook($('#bookId').value, $('#memberId').value);
      render();
    } catch (e) { alert(e.message); }
  };

  function render() {
    $('#app').innerHTML =
      `<h3>Inventory</h3>` +
      `<ul>` +
      books.map(b => `<li>${b.available ? '✓' : '✗'} ${b.id}: ${b.title}</li>`).join('') +
      `</ul>`;
  }

  render();
})();
