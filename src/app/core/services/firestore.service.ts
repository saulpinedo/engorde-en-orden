import { Injectable, inject } from '@angular/core';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, runTransaction, serverTimestamp,
  Timestamp, onSnapshot, QueryConstraint,
  CollectionReference, DocumentReference, Firestore, Unsubscribe
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

export interface BaseDoc {
  id: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Wrapper CRUD genérico sobre Firestore.
 * Las colecciones se nombran en camelCase top-level (granjas, lotes, mortalidades, etc.)
 * Los modelos del frontend se almacenan también en camelCase.
 */
@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private fs: Firestore = inject(FirebaseService).firestore;

  // ──────────── helpers ────────────
  col(name: string): CollectionReference {
    return collection(this.fs, name);
  }

  docRef(colName: string, id: string): DocumentReference {
    return doc(this.fs, `${colName}/${id}`);
  }

  newId(colName: string): string {
    return doc(collection(this.fs, colName)).id;
  }

  // ──────────── reads ────────────
  async getAll<T = any>(
    colName: string,
    orderField?: string,
    dir: 'asc' | 'desc' = 'desc',
    max = 500
  ): Promise<T[]> {
    const constraints: QueryConstraint[] = [limit(max)];
    if (orderField) constraints.unshift(orderBy(orderField, dir));
    const snap = await getDocs(query(this.col(colName), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...this.normalizeTimestamps(d.data()) })) as T[];
  }

  async getById<T = any>(colName: string, id: string): Promise<T | null> {
    const snap = await getDoc(this.docRef(colName, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...this.normalizeTimestamps(snap.data()) } as T;
  }

  async whereEq<T = any>(
    colName: string,
    field: string,
    value: any,
    orderField?: string,
    dir: 'asc' | 'desc' = 'desc',
    max = 500
  ): Promise<T[]> {
    const constraints: QueryConstraint[] = [where(field, '==', value), limit(max)];
    if (orderField) constraints.push(orderBy(orderField, dir));
    const snap = await getDocs(query(this.col(colName), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...this.normalizeTimestamps(d.data()) })) as T[];
  }

  /**
   * Búsqueda prefijo (Firestore no tiene LIKE; usamos truco de range).
   * Para 'juan' busca documentos cuyo campo esté entre 'juan' y 'juao' (inclusive).
   */
  async wherePrefix<T = any>(
    colName: string,
    field: string,
    term: string,
    max = 10
  ): Promise<T[]> {
    if (!term) return [];
    const end = this.incrementLastChar(term);
    const snap = await getDocs(
      query(
        this.col(colName),
        where(field, '>=', term),
        where(field, '<', end),
        limit(max)
      )
    );
    return snap.docs.map(d => ({ id: d.id, ...this.normalizeTimestamps(d.data()) })) as T[];
  }

  // ──────────── writes ────────────
  async create<T = any>(colName: string, data: Partial<T>): Promise<T & { id: string }> {
    const id = this.newId(colName);
    const payload = this.stripUndefined({
      ...data,
      id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(this.docRef(colName, id), payload);
    return { id, ...data } as T & { id: string };
  }

  async update(colName: string, id: string, data: any): Promise<void> {
    const payload = this.stripUndefined({
      ...data,
      updatedAt: serverTimestamp()
    });
    await updateDoc(this.docRef(colName, id), payload);
  }

  async remove(colName: string, id: string): Promise<void> {
    await deleteDoc(this.docRef(colName, id));
  }

  // ──────────── realtime ────────────
  observe<T = any>(
    colName: string,
    cb: (rows: T[]) => void,
    orderField?: string
  ): Unsubscribe {
    const constraints: QueryConstraint[] = [];
    if (orderField) constraints.push(orderBy(orderField, 'desc'));
    const q = constraints.length ? query(this.col(colName), ...constraints) : this.col(colName);
    return onSnapshot(q, snap => {
      const rows = snap.docs.map(d => ({
        id: d.id,
        ...this.normalizeTimestamps(d.data())
      })) as T[];
      cb(rows);
    });
  }

  // ──────────── transactions ────────────
  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return runTransaction(this.fs, fn);
  }

  // ──────────── utils ────────────
  /**
   * Convierte campos Timestamp de Firestore a ISO string (YYYY-MM-DD o full ISO).
   * Mantiene el resto de campos tal cual.
   */
  private normalizeTimestamps<T = any>(data: T): any {
    if (!data) return data;
    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v instanceof Timestamp) {
        out[k] = v.toDate().toISOString();
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  /** Helper para truco prefijo: 'juan' → 'juao' */
  private incrementLastChar(s: string): string {
    if (!s) return s;
    const arr = s.split('');
    arr[arr.length - 1] = String.fromCharCode(arr[arr.length - 1].charCodeAt(0) + 1);
    return arr.join('');
  }

  /**
   * Devuelve un nuevo objeto sin las claves cuyo valor sea `undefined`.
   * Firestore rechaza `undefined` en cualquier campo (incluso dentro de
   * un spread), por eso se limpian antes de `setDoc`/`updateDoc`.
   * No muta el input.
   */
  private stripUndefined<T = any>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    const out: any = {};
    for (const [k, v] of Object.entries(obj as Record<string, any>)) {
      if (v !== undefined) out[k] = v;
    }
    return out as T;
  }
}
