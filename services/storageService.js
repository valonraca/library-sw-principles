// StorageService isolates persistence (localStorage) from domain logic
(function(){
  class StorageService {
    constructor(key = 'LIB_DATA') { this.key = key; }
    load() {
      try {
        const data = JSON.parse(localStorage.getItem(this.key) || '{}');
        return { books: data.books || [], members: data.members || [] };
      } catch (e) {
        return { books: [], members: [] };
      }
    }
    save(payload) {
      localStorage.setItem(this.key, JSON.stringify(payload));
    }
  }

  window.StorageService = StorageService;
})();
