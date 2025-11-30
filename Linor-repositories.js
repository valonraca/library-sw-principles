/****************************************************
 * Linor-repositories.js
 * LocalStorage-based repositories for books/members
 ****************************************************/

export class LocalStorageBookRepo {
  constructor(key = "LIB_DATA") {
    this.key = key;
  }

  load() {
    const raw  = localStorage.getItem(this.key) || "{}";
    const data = JSON.parse(raw);
    return data.books || [];
  }

  save(books) {
    const raw  = localStorage.getItem(this.key) || "{}";
    const data = JSON.parse(raw);
    data.books = books;
    localStorage.setItem(this.key, JSON.stringify(data));
  }
}

export class LocalStorageMemberRepo {
  constructor(key = "LIB_DATA") {
    this.key = key;
  }

  load() {
    const raw  = localStorage.getItem(this.key) || "{}";
    const data = JSON.parse(raw);
    return data.members || [];
  }

  save(members) {
    const raw  = localStorage.getItem(this.key) || "{}";
    const data = JSON.parse(raw);
    data.members = members;
    localStorage.setItem(this.key, JSON.stringify(data));
  }
}
