import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'auth/login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { 
    path: '', 
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'granjas', loadComponent: () => import('./features/granjas/granjas.component').then(m => m.GranjasComponent) },
      { path: 'lotes', loadComponent: () => import('./features/lotes/lotes.component').then(m => m.LotesComponent) },
      { path: 'timeline', loadComponent: () => import('./features/timeline/timeline.component').then(m => m.TimelineComponent) },
      { path: 'timeline/:id', loadComponent: () => import('./features/timeline/timeline.component').then(m => m.TimelineComponent) },
      { path: 'mortalidad', loadComponent: () => import('./features/mortalidad/mortalidad.component').then(m => m.MortalidadComponent) },
      { path: 'consumo', loadComponent: () => import('./features/consumo/consumo.component').then(m => m.ConsumoComponent) },
      { path: 'pesajes', loadComponent: () => import('./features/pesajes/pesajes.component').then(m => m.PesajesComponent) },
      { path: 'vacunas', loadComponent: () => import('./features/vacunas/vacunas.component').then(m => m.VacunasComponent) },
      { path: 'formulas', loadComponent: () => import('./features/formulas/formulas.component').then(m => m.FormulasComponent) },
      { path: 'galpones', loadComponent: () => import('./features/galpones/galpones.component').then(m => m.GalponesComponent) }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
