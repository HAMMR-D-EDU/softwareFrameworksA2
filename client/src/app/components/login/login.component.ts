import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  submit() {
    this.error = '';
    this.api.login({ username: this.username, password: this.password }).subscribe({
      next: (user) => {
        // Store the user in LocalStorage for the frontend
        this.auth.storeUser(user);
        this.router.navigateByUrl('/');
      },
      error: (error) => {
        this.error = 'Those credentials do not match';
      }
    });
  }
}
