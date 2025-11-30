// LocalStorageAdapter: simple async wrapper around localStorage.
// Exposes save(data) and load() methods. Keeps serialization in one place.

export class LocalStorageAdapter {
  constructor(key = 'LIB_DATA') {
    this.key = key;
    this.isAvailable = typeof window !== 'undefined' && !!window.localStorage;
  }

  async save(data) {
    if (!this.isAvailable) return;
    try {
      const serialized = JSON.stringify(data);
      window.localStorage.setItem(this.key, serialized);
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  async load() {
    if (!this.isAvailable) return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage load failed', e);
      return null;
    }
  }

  // convenience: clear stored data
  async clear() {
    if (!this.isAvailable) return;
    try {
      window.localStorage.removeItem(this.key);
    } catch (e) {
      console.warn('LocalStorage clear failed', e);
    }
  }
}
