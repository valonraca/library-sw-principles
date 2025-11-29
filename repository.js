export class Repository {
    constructor(storageKey) {
        this.storageKey = storageKey;
    }

    load() {
        try {
            const json = localStorage.getItem(this.storageKey);
            const data = JSON.parse(json);
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    save(list) {
        localStorage.setItem(this.storageKey, JSON.stringify(list));
    }
}
