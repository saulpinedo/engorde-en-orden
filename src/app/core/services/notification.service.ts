import { Injectable, signal, computed } from '@angular/core';
import { LotService, Lote, Hito, Mortalidad, ConsumoDiario } from './lot.service';
import { format, isToday, differenceInDays, parseISO, isBefore } from 'date-fns';

export interface Notification {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  date: Date;
  read: boolean;
  actionUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSignal = signal<Notification[]>([]);
  
  notifications = this.notificationsSignal.asReadonly();
  unreadCount = computed(() => this.notificationsSignal().filter(n => !n.read).length);

  constructor(private lotService: LotService) {}

  async checkNotifications(): Promise<void> {
    const notifications: Notification[] = [];
    
    try {
      const lotes = await this.lotService.getLotes();
      const activeLotes = lotes.filter(l => l.estado === 'ACTIVO');
      
      for (const lote of activeLotes) {
        const loteNotifications = await this.checkLoteNotifications(lote);
        notifications.push(...loteNotifications);
      }
      
      this.notificationsSignal.set(notifications);
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }

  private async checkLoteNotifications(lote: Lote): Promise<Notification[]> {
    const notifications: Notification[] = [];
    const diasVida = this.lotService.getDiasVida(lote.fechaInicio);
    const today = new Date();

    const mortalidades = await this.lotService.getMortalidades(lote.id!);
    const consumos = await this.lotService.getConsumos(lote.id!);
    const hitos = await this.lotService.getHitos(lote.id!);

    const mortalidadesHoy = mortalidades.filter(m => isToday(parseISO(m.fecha)));
    if (mortalidadesHoy.length === 0 && diasVida > 0) {
      notifications.push({
        id: `mortalidad-${lote.id}-${format(today, 'yyyyMMdd')}`,
        type: 'warning',
        title: 'Sin registro de mortalidad',
        message: `Lote "${lote.nombre || 'Sin nombre'}" no tiene registro de mortalidad hoy.`,
        date: today,
        read: false,
        actionUrl: `/mortalidad/${lote.id}`
      });
    }

    const consumosHoy = consumos.filter(c => isToday(parseISO(c.fecha)));
    if (consumosHoy.length === 0 && diasVida > 0) {
      notifications.push({
        id: `consumo-${lote.id}-${format(today, 'yyyyMMdd')}`,
        type: 'warning',
        title: 'Sin registro de alimento',
        message: `Lote "${lote.nombre || 'Sin nombre'}" no tiene registro de consumo de alimento hoy.`,
        date: today,
        read: false,
        actionUrl: `/consumo/${lote.id}`
      });
    }

    const etapaActual = this.lotService.getEtapaActual(diasVida);
    if (lote.etapaActual !== etapaActual) {
      notifications.push({
        id: `etapa-${lote.id}`,
        type: 'info',
        title: 'Cambio de etapa',
        message: `Lote "${lote.nombre || 'Sin nombre'}" pasó a etapa ${etapaActual} (Día ${diasVida}).`,
        date: today,
        read: false,
        actionUrl: `/lotes/${lote.id}`
      });
    }

    const vacunasPendientes = hitos.filter(h =>
      h.tipo === 'VACUNA' &&
      h.estado === 'PENDIENTE' &&
      (isToday(parseISO(h.fecha)) || isBefore(parseISO(h.fecha), today))
    );

    for (const vacuna of vacunasPendientes) {
      notifications.push({
        id: `vacuna-pendiente-${vacuna.id}`,
        type: 'warning',
        title: 'Vacuna pendiente',
        message: `${vacuna.titulo} - Lote "${lote.nombre || 'Sin nombre'}"`,
        date: today,
        read: false,
        actionUrl: `/vacunas/${lote.id}`
      });
    }

    if (lote.cantidadActual <= Math.floor(lote.cantidadInicial * 0.8)) {
      notifications.push({
        id: `mortalidad-alta-${lote.id}`,
        type: 'error',
        title: 'Mortalidad elevada',
        message: `Lote "${lote.nombre || 'Sin nombre'}" tiene ${((1 - lote.cantidadActual/lote.cantidadInicial) * 100).toFixed(1)}% de mortalidad.`,
        date: today,
        read: false,
        actionUrl: `/lotes/${lote.id}`
      });
    }

    return notifications;
  }

  markAsRead(id: string): void {
    this.notificationsSignal.update(notifications =>
      notifications.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  markAllAsRead(): void {
    this.notificationsSignal.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
  }

  addNotification(notification: Omit<Notification, 'id' | 'date' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: `manual-${Date.now()}`,
      date: new Date(),
      read: false
    };
    this.notificationsSignal.update(notifications => [newNotification, ...notifications]);
  }

  removeNotification(id: string): void {
    this.notificationsSignal.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }
}
