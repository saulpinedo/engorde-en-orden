import { Injectable, inject } from '@angular/core';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject, FirebaseStorage
} from 'firebase/storage';
import { FirebaseService } from './firebase.service';

export interface UploadResult {
  url: string;
  path: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage: FirebaseStorage = inject(FirebaseService).storage;

  /**
   * Sube un archivo arbitrario al path indicado en Storage.
   * Devuelve la URL pública de descarga + el path (para borrar después).
   */
  async uploadFile(path: string, file: Blob | File): Promise<UploadResult> {
    const storageRef = ref(this.storage, path);
    const task = uploadBytesResumable(storageRef, file);
    return new Promise<UploadResult>((resolve, reject) => {
      task.on(
        'state_changed',
        undefined,
        (err) => reject(err),
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve({ url, path });
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  async deleteFile(path: string): Promise<void> {
    if (!path) return;
    const storageRef = ref(this.storage, path);
    await deleteObject(storageRef).catch(() => {
      // si no existe, ignorar (mejor no romper el flujo de delete del gasto)
    });
  }

  /**
   * Sube el comprobante de un gasto: si es imagen, la comprime en cliente
   * (max 1600px de ancho, JPEG quality 0.7 → ~150-250KB). Si es PDF u
   * otro tipo, sube el archivo original sin tocarlo.
   */
  async uploadComprobanteGasto(
    loteId: string,
    gastoId: string,
    file: File
  ): Promise<UploadResult> {
    const safeName = (file.name || 'comprobante')
      .replace(/[^\w.\-]+/g, '_')
      .slice(-40);
    const path = `gastos/${loteId}/${gastoId}-${safeName}`;

    let blob: Blob = file;
    if (file.type && file.type.startsWith('image/')) {
      blob = await this.compressImage(file, 1600, 0.7);
    }
    return this.uploadFile(path, blob);
  }

  /**
   * Comprime una imagen en el cliente usando <canvas>.
   * - Mantiene el aspect ratio.
   * - Si la imagen ya es más chica que maxWidth, igual la re-encodea en
   *   JPEG con la calidad indicada (sigue bajando el peso).
   * - Devuelve un Blob JPEG listo para subir.
   */
  async compressImage(
    file: File | Blob,
    maxWidth = 1600,
    quality = 0.7
  ): Promise<Blob> {
    const dataUrl = await this.readAsDataURL(file);
    const img = await this.loadImage(dataUrl);

    const ratio = Math.min(1, maxWidth / img.width);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear contexto 2D del canvas');

    // fondo blanco (evita que PNG transparente quede negro en JPEG)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob devolvió null'))),
        'image/jpeg',
        quality
      );
    });
  }

  private readAsDataURL(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = src;
    });
  }
}
