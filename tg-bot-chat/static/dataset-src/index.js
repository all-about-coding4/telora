// Dataset creation

export default class user_dataset {
  constructor(db_name) {
    this.db_name = db_name;
    this.db_version = 1;
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      
      const request = indexedDB.open(this.db_name);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getVersion() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.db_name);

      request.onsuccess = () => {
        const db = request.result;
        const version = db.version;
        db.close();
        resolve(version);
      };

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        // Database doesn't exist yet
        event.target.result.close();
        resolve(1);
      };
    });
  }

  async create_table(table_name) {
    const currentVersion = await this.getVersion();

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.db_name, currentVersion + 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(table_name)) {
          db.createObjectStore(table_name);
        }
      };

      request.onsuccess = () => {
        request.result.close();
        resolve(true);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async insert(table_name, value, key) {
    try {

      const db = await this.openDB();

     

      return new Promise((resolve, reject) => {
        const tx = db.transaction(table_name, "readwrite");
        const store = tx.objectStore(table_name);

        store.put(value, key);

        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };

        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async select_from(table_name, key) {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(table_name, "readonly");
        const store = tx.objectStore(table_name);

        const request = store.get(key);

        request.onsuccess = () => {
          db.close();
          resolve(request.result);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async delete_from(table_name, key) {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(table_name, "readwrite");
        const store = tx.objectStore(table_name);

        store.delete(key);

        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };

        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async delete_all(table_name) {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(table_name, "readwrite");
        const store = tx.objectStore(table_name);

        store.clear();

        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };

        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async delete_dataset() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.db_name);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}