function BookRepo() {
  this.storageKey = 'LIB_BOOKS';

  this.getAll = function () {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  };

  this.add = function (book) {
    const books = this.getAll();
    books.push(book);
    localStorage.setItem(this.storageKey, JSON.stringify(books));
  };

  this.find = function (id) {
    return this.getAll().find(b => b.id === id);
  };

  this.update = function (book) {
    const books = this.getAll().map(b => (b.id === book.id ? book : b));
    localStorage.setItem(this.storageKey, JSON.stringify(books));
  };
}
