/**
 * Local persistence adapter.
 *
 * Two jobs:
 *  1. Offline field data collection — field officers capture visits, beneficiary
 *     verifications and case notes with no connectivity; rows are written here
 *     first and pushed when the device reconnects.
 *  2. Evaluation mode — the application remains fully usable before a Supabase
 *     project is attached, so demonstrations never hit a dead screen.
 *
 * No authentication tokens or API keys are ever written here (security baseline §5).
 */

const DB_NAME = 'negolinks-ngo-erp'
const DB_VERSION = 1
const STORE = 'records'
const META = 'meta'

export interface LocalRow {
  id: string
  table?: string
  org_id?: string
  updated_at?: string
  dirty?: boolean
  is_demo?: boolean
  deleted_at?: string | null
  [key: string]: unknown
}

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * IndexedDB is unavailable in some environments — private browsing with storage
 * disabled, hardened enterprise browsers, and server-side rendering among them.
 * Callers treat an unavailable store as "no cached data" rather than an error,
 * so the application still runs; it simply loses offline capability.
 */
export const isLocalStorageAvailable = (): boolean =>
  typeof indexedDB !== 'undefined' && indexedDB !== null

const openDb = (): Promise<IDBDatabase> => {
  if (!isLocalStorageAvailable()) {
    return Promise.reject(new Error('Local storage is unavailable in this browser'))
  }
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'pk' })
        store.createIndex('by_table', 'table', { unique: false })
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Unable to open local database'))
  })
  // A failed open must not poison every later call.
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

const pk = (table: string, id: string): string => `${table}::${id}`

const tx = async <T,>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const request = run(transaction.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error(request.error?.message ?? 'Local storage error'))
  })
}

export const localAdapter = {
  async list<T extends LocalRow = LocalRow>(table: string): Promise<T[]> {
    const db = await openDb()
    return new Promise<T[]>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly')
      const index = transaction.objectStore(STORE).index('by_table')
      const request = index.getAll(IDBKeyRange.only(table))
      request.onsuccess = () => resolve((request.result as T[]) ?? [])
      request.onerror = () => reject(new Error('Local read failed'))
    })
  },

  async get<T,>(table: string, id: string): Promise<T | null> {
    const row = await tx<T | undefined>(STORE, 'readonly', (store) => store.get(pk(table, id)))
    return row ?? null
  },

  async put(table: string, row: Record<string, unknown> & { id: string }): Promise<void> {
    await tx(STORE, 'readwrite', (store) =>
      store.put({ ...row, table, pk: pk(table, row.id) }),
    )
  },

  async putMany(table: string, rows: (Record<string, unknown> & { id: string })[]): Promise<void> {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      const store = transaction.objectStore(STORE)
      rows.forEach((row) => store.put({ ...row, table, pk: pk(table, row.id) }))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Bulk local write failed'))
    })
  },

  async remove(table: string, id: string): Promise<void> {
    await tx(STORE, 'readwrite', (store) => store.delete(pk(table, id)))
  },

  async clearTable(table: string): Promise<void> {
    const rows = await this.list(table)
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      const store = transaction.objectStore(STORE)
      rows.forEach((row) => store.delete(pk(table, row.id)))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Bulk local delete failed'))
    })
  },

  async clearAll(): Promise<void> {
    await tx(STORE, 'readwrite', (store) => store.clear())
  },

  async getMeta<T,>(key: string): Promise<T | null> {
    const row = await tx<{ key: string; value: T } | undefined>(META, 'readonly', (store) =>
      store.get(key),
    )
    return row?.value ?? null
  },

  async setMeta<T,>(key: string, value: T): Promise<void> {
    await tx(META, 'readwrite', (store) => store.put({ key, value }))
  },
}

/** Rows captured offline and awaiting sync. */
export const pendingSyncCount = async (tables: string[]): Promise<number> => {
  const counts = await Promise.all(
    tables.map(async (table) => (await localAdapter.list(table)).filter((r) => r.dirty).length),
  )
  return counts.reduce((total, value) => total + value, 0)
}
