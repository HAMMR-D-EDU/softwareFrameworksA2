import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username = '';
  password = '';
  email = '';
  error = '';
  success = '';

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  submit() {
    this.error = '';
    this.success = '';
    
    this.api.register({ username: this.username, password: this.password, email: this.email }).subscribe({
      next: (result) => {
        if (result.ok) {
          this.success = 'Account created! Please login.';
          setTimeout(() => this.router.navigateByUrl('/login'), 2000);
        } else {
          this.error = result.msg || 'Registration failed';
        }
      },
      error: (error) => {
        this.error = error.error?.msg || 'Registration failed';
      }
    });
  }
}
