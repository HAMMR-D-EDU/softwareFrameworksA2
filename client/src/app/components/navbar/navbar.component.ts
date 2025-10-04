import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  constructor(private auth: AuthService, private router: Router) {}

  get user() {
    return this.auth.currentUser();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  isSuperAdmin(): boolean {
    return this.user ? this.user.roles.includes('super') : false;
  }
}