export class BookRepo {
  constructor(storage) {
    this.storage = storage;
    this.key = "BOOKS";
    this.books = storage.load(this.key) || [];
  }

  save() {
    this.storage.save(this.key, this.books);
  }

  add(book) {
    this.books.push(book);
    this.save();
  }

  get(id) {
    return this.books.find(b => b.id === id);
  }

  update(book) {
    const idx = this.books.findIndex(b => b.id === book.id);
    this.books[idx] = book;
    this.save();
  }

  search(term) {
    return this.books.filter(
      b => b.title.toLowerCase().includes(term) || 
           b.author.toLowerCase().includes(term)
    );
  }
}
