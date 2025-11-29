export class LocalStorageBookRepo {
  constructor(key = "LIB_BOOKS") {
    this.key = key;
    this.books = JSON.parse(localStorage.getItem(key) || "[]");
  }

  save(book) {
    this.books.push(book);
    this._persist();
  }

  update(book) {
    this.books = this.books.map(b => (b.id === book.id ? book : b));
    this._persist();
  }

  find(id) {
    return this.books.find(b => b.id === id);
  }

  all() {
    return [...this.books];
  }

  _persist() {
    localStorage.setItem(this.key, JSON.stringify(this.books));
  }
}
