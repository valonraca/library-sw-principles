class LocalStorageAdapter {
  load() {
    try {
      const raw = localStorage.getItem('LIB_DATA');
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load from localStorage', e);
      return {};
    }
  }

  save(partialData) {
    const current = this.load();
    const merged = { ...current, ...partialData };
    localStorage.setItem('LIB_DATA', JSON.stringify(merged));
  }
}
