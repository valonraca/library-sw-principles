export default class LocalStorageLibraryStore {
  constructor(storageKey = 'LIB_DATA') {
    this.storageKey = storageKey;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return { books: [], members: [] };
      const data = JSON.parse(raw);
      return {
        books: data.books || [],
        members: data.members || []
      };
    } catch (e) {
      console.warn('Failed to load library data, resetting.', e);
      return { books: [], members: [] };
    }
  }

  save({ books, members }) {
    const payload = JSON.stringify({ books, members });
    localStorage.setItem(this.storageKey, payload);
  }
}
