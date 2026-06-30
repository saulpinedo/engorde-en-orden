import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
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
          <button class="menu-toggle" (click)="onMenuToggle()" aria-label="Menú">
            <span>&#9776;</span>
          </button>
          <div class="logo">
            <img src="logo.png" alt="Engorde En Orden" class="logo-icon">
            <span class="logo-text">Engorde <span class="logo-accent">En Orden</span></span>
          </div>
        </div>

        <div class="topbar-right">
          <button class="notification-btn" (click)="showNotifications = !showNotifications" aria-label="Notificaciones">
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
            <span class="user-avatar">{{ userInitial() }}</span>
            <span class="user-email">{{ authService.user()?.email }}</span>
            <button class="logout-btn" (click)="logout()">Cerrar</button>
          </div>
        </div>
      </header>

      <!-- Backdrop mobile: solo visible cuando el drawer está abierto -->
      @if (layoutService.mobileOpen()) {
        <div class="sidebar-backdrop" (click)="layoutService.closeMobileSidebar()"></div>
      }

      <aside class="sidebar"
             [class.collapsed]="layoutService.collapsed() && !layoutService.mobileOpen()"
             [class.mobile-open]="layoutService.mobileOpen()">
        <nav class="sidebar-nav">
          @for (item of layoutService.getMenuItems(); track item.routerLink) {
            <a [routerLink]="item.routerLink"
               routerLinkActive="active"
               class="nav-item"
               (click)="layoutService.closeMobileSidebar()">
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <img src="logo.png" alt="Engorde En Orden" class="brand-icon">
          @if (!layoutService.collapsed() || layoutService.mobileOpen()) {
            <div class="brand-text">
              <span class="brand-name">Engorde <span class="brand-name-accent">En Orden</span></span>
              <span class="brand-tagline">Tecnología para crecer mejor</span>
            </div>
          }
        </div>
      </aside>

      <main class="main-content"
            [class.sidebar-collapsed]="layoutService.collapsed() && !layoutService.mobileOpen()">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container { min-height: 100vh; }

    /* ────────── Topbar ────────── */
    .topbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: var(--dark-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .topbar-left { display: flex; align-items: center; gap: 1rem; }
    .menu-toggle {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
      min-width: 44px;
      min-height: 44px;
    }
    .menu-toggle:hover { color: var(--primary-color); }
    .logo { display: flex; align-items: center; gap: 0.5rem; }
    .logo-icon { width: 36px; height: 36px; object-fit: contain; flex-shrink: 0; }
    .logo-text { color: white; font-size: 1.25rem; font-weight: 700; white-space: nowrap; }
    .logo-accent { color: var(--secondary-color); }
    .topbar-right { display: flex; align-items: center; gap: 0.75rem; }
    .notification-btn {
      background: none; border: none; font-size: 1.25rem; cursor: pointer;
      position: relative; min-width: 44px; min-height: 44px; padding: 0.5rem; color: white;
    }
    .notification-btn:hover { color: var(--primary-color); }
    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--secondary-color);
      color: white;
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
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
      width: 36px; height: 36px;
      background: var(--primary-color); color: var(--dark-color);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: bold; flex-shrink: 0;
    }
    .user-email { color: white; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
    .logout-btn {
      background: var(--secondary-color); color: white; border: none;
      padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; white-space: nowrap;
    }
    .logout-btn:hover { background: #b71c1c; }

    /* ────────── Backdrop mobile ────────── */
    .sidebar-backdrop {
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 998;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* ────────── Sidebar (desktop por defecto) ────────── */
    .sidebar {
      position: fixed;
      top: 60px;
      left: 0;
      width: 280px;
      height: calc(100vh - 60px);
      background: var(--dark-color);
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;
      z-index: 999;
    }
    .sidebar.collapsed { width: 80px; }
    .sidebar.collapsed .nav-label,
    .sidebar.collapsed .brand-text {
      display: none;
    }
    .sidebar.collapsed .nav-item { gap: 0; padding: 0.4rem 0; justify-content: center; }
    .sidebar-nav { flex: 1; padding: 0.4rem 0.5rem; overflow-y: auto; }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.4rem 0.7rem;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      border-radius: 6px;
      margin-bottom: 0.1rem;
      transition: all 0.2s;
      min-height: 30px;
      white-space: nowrap;
      overflow: hidden;
    }
    .nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .nav-item.active { background: var(--primary-color); color: var(--dark-color); font-weight: 600; }
    .nav-icon {
      font-size: 1.05rem;
      width: 20px;
      min-width: 20px;
      text-align: center;
      flex-shrink: 0;
    }
    .nav-label {
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.825rem;
      line-height: 1.2;
    }
    .sidebar-footer {
      padding: 1rem; border-top: 1px solid rgba(255,255,255,0.1);
      display: flex; align-items: center; gap: 0.75rem;
    }
    .brand-icon { width: 44px; height: 44px; object-fit: contain; flex-shrink: 0; }
    .brand-text { display: flex; flex-direction: column; overflow: hidden; }
    .brand-name { color: white; font-weight: 700; font-size: 1rem; white-space: nowrap; }
    .brand-name-accent { color: var(--secondary-color); }
    .brand-tagline { color: rgba(255,255,255,0.5); font-size: 0.75rem; white-space: nowrap; }

    /* ────────── Main content ────────── */
    .main-content {
      margin-left: 280px;
      margin-top: 60px;
      padding: 1.5rem;
      min-height: calc(100vh - 60px);
      background: #f8f9fa;
      transition: margin-left 0.3s ease;
      overflow-x: hidden;
    }
    .main-content.sidebar-collapsed { margin-left: 80px; }

    /* ────────── Mobile ≤ 768px ────────── */
    @media (max-width: 768px) {
      .topbar { padding: 0 0.75rem; }
      .logo-text { display: none; }
      .user-email { display: none; }
      .logout-btn { padding: 0.4rem 0.7rem; font-size: 0.8rem; }

      .sidebar {
        width: 280px;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }
      .sidebar.mobile-open { transform: translateX(0); }
      .sidebar.collapsed { width: 280px; }
      .sidebar.collapsed.mobile-open .nav-label,
      .sidebar.collapsed.mobile-open .brand-text {
        display: flex;
      }
      .sidebar.collapsed:not(.mobile-open) .nav-label,
      .sidebar.collapsed:not(.mobile-open) .brand-text {
        display: none;
      }

      .main-content,
      .main-content.sidebar-collapsed {
        margin-left: 0;
        padding: 1rem 0.75rem;
      }
    }

    /* ────────── Mobile chico ≤ 480px ────────── */
    @media (max-width: 480px) {
      .topbar { padding: 0 0.5rem; }
      .topbar-left { gap: 0.5rem; }
      .topbar-right { gap: 0.5rem; }
      .menu-toggle { min-width: 40px; min-height: 40px; padding: 0.4rem; }
      .notification-btn { min-width: 40px; min-height: 40px; padding: 0.4rem; }
      .user-avatar { width: 32px; height: 32px; font-size: 0.85rem; }
      .logout-btn { padding: 0.35rem 0.6rem; font-size: 0.75rem; }
      .main-content { padding: 0.75rem 0.5rem; }

      .notification-panel {
        right: 0.5rem;
        left: 0.5rem;
        width: auto;
      }
    }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  layoutService = inject(LayoutService);
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  private router = inject(Router);
  private routerSub?: Subscription;

  showNotifications = false;

  ngOnInit(): void {
    this.notificationService.checkNotifications();
    // Cerrar el drawer mobile al navegar a una nueva ruta
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.layoutService.closeMobileSidebar();
        this.showNotifications = false;
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  onMenuToggle(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.layoutService.toggleMobileSidebar();
    } else {
      this.layoutService.toggleSidebar();
    }
  }

  userInitial(): string {
    const email = this.authService.user()?.email || '';
    return email.charAt(0).toUpperCase() || '?';
  }

  onNotificationClick(n: Notification): void {
    this.notificationService.markAsRead(n.id);
    if (n.actionUrl) this.router.navigate([n.actionUrl]);
    this.showNotifications = false;
  }

  logout(): void {
    this.authService.signOut();
  }
}
