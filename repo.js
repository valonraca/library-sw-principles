export class LocalStorageRepo {
  constructor(key) {
    this.key = key;
  }

  getAll() {
    return JSON.parse(localStorage.getItem(this.key) || '[]');
  }

  saveAll(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  clear() {
    localStorage.removeItem(this.key);
  }
}
