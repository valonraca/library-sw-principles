export default class LocalStorageLibraryStore {
  constructor(key = 'LIB_DATA') {
    this.key = key;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return { books: [], members: [] };
      return JSON.parse(raw);
    } catch {
      return { books: [], members: [] };
    }
  }

  save(state) {
    localStorage.setItem(this.key, JSON.stringify(state));
  }
}
