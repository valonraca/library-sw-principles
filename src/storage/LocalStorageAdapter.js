export const LocalStorageAdapter = {
  load(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },

  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};
