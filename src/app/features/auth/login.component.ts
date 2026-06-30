import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <img src="logo.png" alt="Engorde En Orden" class="logo-icon">
          <h1>Engorde <span class="brand-accent">En Orden</span></h1>
          <p class="tagline">Tecnología para crecer mejor</p>
        </div>
        
        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" [(ngModel)]="email" name="email" 
                   placeholder="tu@email.com" class="input-field"/>
          </div>
          
          <div class="field">
            <label for="password">Contraseña</label>
            <input id="password" type="password" [(ngModel)]="password" name="password" 
                   placeholder="Contraseña" class="input-field"/>
          </div>
          
          <button type="submit" class="btn-primary" [disabled]="loading">
            {{ loading ? 'Ingresando...' : 'Ingresar' }}
          </button>
          
          @if (errorMessage) {
            <div class="error-message">{{ errorMessage }}</div>
          }
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--dark-color) 0%, #444 100%);
      padding: 1rem;
    }
    .login-card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .logo-icon {
      width: 96px;
      height: 96px;
      object-fit: contain;
      display: block;
      margin: 0 auto 0.75rem;
    }
    .login-header h1 {
      margin: 0;
      color: var(--dark-color);
      font-size: 1.6rem;
      font-weight: 800;
    }
    .brand-accent { color: var(--secondary-color); }
    .tagline {
      margin: 0.5rem 0 0 0;
      color: #666;
      font-size: 0.875rem;
      letter-spacing: 0.05em;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .field label {
      font-weight: 500;
      color: var(--dark-color);
    }
    .input-field {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
    }
    .input-field:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.2);
    }
    .btn-primary {
      background: var(--primary-color);
      color: var(--dark-color);
      border: none;
      padding: 0.875rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-primary:hover {
      background: #e5ac00;
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }
    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 0.75rem;
      border-radius: 8px;
      text-align: center;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'Ingresa email y contraseña';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    
    const result = await this.authService.signIn(this.email, this.password);
    this.loading = false;

    if (result.success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage = result.error || 'Error al iniciar sesión';
    }
  }
}
