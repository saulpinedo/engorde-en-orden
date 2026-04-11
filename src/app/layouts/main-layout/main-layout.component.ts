import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LayoutService } from '../../core/services/layout.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService, Notification } from '../../core/services/notification.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="app-container">
      <header class="topbar">
        <div class="topbar-left">
          <button class="menu-toggle" (click)="toggleSidebar()">
            <span>&#9776;</span>
          </button>
          <div class="logo">
            <span class="logo-icon">🐔</span>
            <span class="logo-text">EngordeEnOrden</span>
          </div>
        </div>
        
        <div class="topbar-right">
          <button class="notification-btn" (click)="showNotifications = !showNotifications">
            <span>🔔</span>
            @if (notificationService.unreadCount() > 0) {
              <span class="badge">{{ notificationService.unreadCount() }}</span>
            }
          </button>
          
          @if (showNotifications) {
            <div class="notification-panel">
              <h4>Notificaciones</h4>
              @for (n of notificationService.notifications(); track n.id) {
                <div class="notification-item" [class.unread]="!n.read" (click)="onNotificationClick(n)">
                  <strong>{{ n.title }}</strong>
                  <p>{{ n.message }}</p>
                </div>
              }
              @if (notificationService.notifications().length === 0) {
                <p class="no-notifications">No hay notificaciones</p>
              }
            </div>
          }
          
          <div class="user-menu">
            <span class="user-avatar">A</span>
            <span class="user-email">{{ authService.user()?.email }}</span>
            <button class="logout-btn" (click)="logout()">Cerrar</button>
          </div>
        </div>
      </header>
      
      <aside class="sidebar" [class.collapsed]="layoutService.collapsed()">
        <nav class="sidebar-nav">
          @for (item of layoutService.getMenuItems(); track item.routerLink) {
            <a [routerLink]="item.routerLink" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        </nav>
        
        <div class="sidebar-footer">
          <span class="brand-icon">🐔</span>
          @if (!layoutService.collapsed()) {
            <div class="brand-text">
              <span class="brand-name">EngordeEnOrden</span>
              <span class="brand-tagline">Tecnología para crecer mejor</span>
            </div>
          }
        </div>
      </aside>
      
      <main class="main-content" [class.sidebar-collapsed]="layoutService.collapsed()">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container { min-height: 100vh; }
    .topbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: #2B2B2B;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .topbar-left { display: flex; align-items: center; gap: 1rem; }
    .menu-toggle { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
    .logo { display: flex; align-items: center; gap: 0.5rem; }
    .logo-icon { font-size: 1.5rem; }
    .logo-text { color: #FFC107; font-size: 1.25rem; font-weight: 700; }
    .topbar-right { display: flex; align-items: center; gap: 1rem; }
    .notification-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; position: relative; }
    .badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #D32F2F;
      color: white;
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 10px;
    }
    .notification-panel {
      position: absolute;
      top: 60px;
      right: 1rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      width: 350px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 1001;
    }
    .notification-panel h4 { margin: 0; padding: 1rem; border-bottom: 1px solid #eee; }
    .notification-item { padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; }
    .notification-item:hover { background: #f5f5f5; }
    .notification-item.unread { background: #fff3cd; }
    .notification-item strong { display: block; margin-bottom: 0.25rem; }
    .notification-item p { margin: 0; font-size: 0.875rem; color: #666; }
    .no-notifications { padding: 2rem; text-align: center; color: #999; }
    .user-menu { display: flex; align-items: center; gap: 0.5rem; }
    .user-avatar {
      width: 36px;
      height: 36px;
      background: #FFC107;
      color: #2B2B2B;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    .user-email { color: white; font-size: 0.875rem; }
    .logout-btn { background: #D32F2F; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
    .sidebar {
      position: fixed;
      top: 60px;
      left: 0;
      width: 280px;
      height: calc(100vh - 60px);
      background: #2B2B2B;
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;
      z-index: 999;
    }
    .sidebar.collapsed { width: 80px; }
    .sidebar-nav { flex: 1; padding: 1rem 0.75rem; }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      border-radius: 8px;
      margin-bottom: 0.25rem;
      transition: all 0.2s;
    }
    .nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .nav-item.active { background: #FFC107; color: #2B2B2B; font-weight: 600; }
    .nav-icon { font-size: 1.125rem; width: 24px; text-align: center; }
    .sidebar-footer { padding: 1rem; border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 0.75rem; }
    .brand-icon { font-size: 2rem; }
    .brand-name { color: #FFC107; font-weight: 700; font-size: 1rem; display: block; }
    .brand-tagline { color: rgba(255,255,255,0.5); font-size: 0.75rem; }
    .main-content {
      margin-left: 280px;
      margin-top: 60px;
      padding: 1.5rem;
      min-height: calc(100vh - 60px);
      background: #f8f9fa;
      transition: margin-left 0.3s ease;
    }
    .main-content.sidebar-collapsed { margin-left: 80px; }
    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); }
      .main-content { margin-left: 0; }
      .user-email { display: none; }
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  layoutService = inject(LayoutService);
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  showNotifications = false;

  ngOnInit(): void {
    this.notificationService.checkNotifications();
  }

  toggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }

  getIcon(label: string): string {
    const icons: Record<string, string> = {
      'Dashboard': '🏠',
      'Granjas': '🏢',
      'Galpones': '📦',
      'Lotes': '🐣',
      'Timeline': '📅',
      'Vacunas': '💉',
      'Mortalidad': '⚠️',
      'Consumo': '🌽',
      'Pesajes': '⚖️',
      'Fórmulas': '📋'
    };
    return icons[label] || '•';
  }

  onNotificationClick(n: Notification): void {
    this.notificationService.markAsRead(n.id);
    if (n.actionUrl) this.router.navigate([n.actionUrl]);
    this.showNotifications = false;
  }

  logout(): void {
    this.authService.signOut();
  }

  private router = inject(Router);
}
