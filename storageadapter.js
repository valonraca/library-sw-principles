export class StorageAdapter {
  constructor(key) {
    this.key = key;
  }

  fetchAll() {
    return JSON.parse(localStorage.getItem(this.key) || "[]");
  }

  saveAll(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  clearAll() {
    localStorage.removeItem(this.key);
  }
}
