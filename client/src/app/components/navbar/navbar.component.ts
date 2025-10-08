import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ImageUploadService } from '../../services/image-upload.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  constructor(
    private auth: AuthService, 
    private router: Router,
    private imageUploadService: ImageUploadService
  ) {}

  /**
   * Current logged-in user getter.
   */
  get user() {
    return this.auth.currentUser();
  }

  /**
   * Log out and navigate to the login page.
   */
  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Whether the current user is a super admin.
   */
  isSuperAdmin(): boolean {
    return this.user ? this.user.roles.includes('super') : false;
  }

  /**
   * Resolve the avatar URL for the current user (with server prefix if needed).
   */
  getAvatarUrl(): string {
    const user = this.user;
    if (user && user.avatarPath) {
      return user.avatarPath.startsWith('http') 
        ? user.avatarPath 
        : `https://localhost:3000${user.avatarPath}`;
    }
    return 'assets/images/a2-logo.png';
  }

  /**
   * Upload a new avatar for the current user and store updated session.
   */
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!this.user) return;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.imageUploadService.uploadAvatar(this.user.id, file).subscribe({
        next: (res) => {
          const path = res.avatarPath.startsWith('http') 
            ? res.avatarPath 
            : `https://localhost:3000${res.avatarPath}`;
          
          // Update user with new avatar
          const updated = { ...this.user!, avatarPath: res.avatarPath };
          this.auth.storeUser(updated);
          alert('Avatar updated');
        },
        error: (err) => {
          console.error('Avatar upload failed', err);
          alert('Failed to update avatar');
        }
      });
    }
  }
}