export class BookRepo {
  constructor(storageKey = "LIB_BOOKS") {
    this.key = storageKey;
    this.load();
  }

  load() {
    this.data = JSON.parse(localStorage.getItem(this.key) || "[]");
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.data));
  }

  add(book) {
    this.data.push(book);
    this.save();
  }

  get(id) {
    return this.data.find(b => b.id === id);
  }

  update(id, updated) {
    const i = this.data.findIndex(b => b.id === id);
    if (i >= 0) this.data[i] = updated;
    this.save();
  }

  all() {
    return this.data;
  }
}

export class MemberRepo {
  constructor(storageKey = "LIB_MEMBERS") {
    this.key = storageKey;
    this.load();
  }

  load() {
    this.data = JSON.parse(localStorage.getItem(this.key) || "[]");
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.data));
  }

  add(member) {
    this.data.push(member);
    this.save();
  }

  get(id) {
    return this.data.find(m => m.id === id);
  }

  update(id, updated) {
    const i = this.data.findIndex(m => m.id === id);
    if (i >= 0) this.data[i] = updated;
    this.save();
  }

  all() {
    return this.data;
  }
}
