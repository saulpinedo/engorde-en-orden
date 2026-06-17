import { Injectable, signal } from '@angular/core';

interface MenuItem {
  label: string;
  icon: string;
  routerLink: string;
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private collapsedSignal = signal(false);
  collapsed = this.collapsedSignal.asReadonly();

  /** Estado del drawer en mobile (off-canvas). Independiente de collapsed. */
  private mobileOpenSignal = signal(false);
  mobileOpen = this.mobileOpenSignal.asReadonly();

  toggleSidebar(): void {
    this.collapsedSignal.update(v => !v);
  }

  toggleMobileSidebar(): void {
    this.mobileOpenSignal.update(v => !v);
  }

  closeMobileSidebar(): void {
    this.mobileOpenSignal.set(false);
  }

  getMenuItems(): MenuItem[] {
    return [
      { label: 'Dashboard', icon: '🏠', routerLink: '/dashboard' },
      { label: 'Granjas', icon: '🏢', routerLink: '/granjas' },
      { label: 'Galpones', icon: '📦', routerLink: '/galpones' },
      { label: 'Lotes', icon: '🐣', routerLink: '/lotes' },
      { label: 'Timeline', icon: '📅', routerLink: '/timeline' },
      { label: 'Ventas', icon: '💰', routerLink: '/ventas' },
      { label: 'Gastos Operativos', icon: '💸', routerLink: '/gastos-operativos' },
      { label: 'Clientes', icon: '👥', routerLink: '/clientes' },
      { label: 'Cobrar', icon: '📝', routerLink: '/pagos' },
      { label: 'Vacunas', icon: '💉', routerLink: '/vacunas' },
      { label: 'Antibióticos', icon: '💊', routerLink: '/antibioticos' },
      { label: 'Vitaminas', icon: '🌿', routerLink: '/vitaminas' },
      { label: 'Desinfectantes', icon: '🧴', routerLink: '/desinfectantes' },
      { label: 'Mortalidad', icon: '⚠️', routerLink: '/mortalidad' },
      { label: 'Consumo', icon: '🌽', routerLink: '/consumo' },
      { label: 'Pesajes', icon: '⚖️', routerLink: '/pesajes' },
      { label: 'Fases Alimento', icon: '📊', routerLink: '/fases-alimento' },
      { label: 'Fórmulas', icon: '📋', routerLink: '/formulas' }
    ];
  }
}
