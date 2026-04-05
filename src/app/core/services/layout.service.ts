import { Injectable, signal } from '@angular/core';

interface MenuItem {
  label: string;
  icon: string;
  routerLink: string;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private collapsedSignal = signal(false);
  collapsed = this.collapsedSignal.asReadonly();

  toggleSidebar(): void {
    this.collapsedSignal.update(v => !v);
  }

  getMenuItems(): MenuItem[] {
    return [
      { label: 'Dashboard', icon: '🏠', routerLink: '/dashboard' },
      { label: 'Granjas', icon: '🏢', routerLink: '/granjas' },
      { label: 'Galpones', icon: '📦', routerLink: '/galpones' },
      { label: 'Lotes', icon: '🐣', routerLink: '/lotes' },
      { label: 'Timeline', icon: '📅', routerLink: '/timeline' },
      { label: 'Vacunas', icon: '💉', routerLink: '/vacunas' },
      { label: 'Mortalidad', icon: '⚠️', routerLink: '/mortalidad' },
      { label: 'Consumo', icon: '🌽', routerLink: '/consumo' },
      { label: 'Pesajes', icon: '⚖️', routerLink: '/pesajes' },
      { label: 'Fórmulas', icon: '📋', routerLink: '/formulas' }
    ];
  }
}
