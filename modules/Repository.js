export class Repository {
    constructor(storageKey) {
        this.storageKey = storageKey;
    }

    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Error loading ${this.storageKey}`, e);
            return [];
        }
    }

    save(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving ${this.storageKey}`, e);
        }
    }
}