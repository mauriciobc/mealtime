// Utility for managing storage with caching and persistence
export class StorageService {
  private cache: Map<string, any> = new Map();

  get<T>(key: string): T | null {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      const parsedValue = JSON.parse(storedValue);
      this.cache.set(key, parsedValue);
      return parsedValue;
    }

    return null;
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
    localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.cache.delete(key);
    localStorage.removeItem(key);
  }

  clear(): void {
    this.cache.clear();
    localStorage.clear();
  }
}

// Example usage:
// const storage = new StorageService();
// storage.set('user', { id: 1, name: 'John Doe' });