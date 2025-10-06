import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ImageUploadService } from '../../services/image-upload.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  constructor(private auth: AuthService, private router: Router, private imageUpload: ImageUploadService) {}

  get user() {
    return this.auth.currentUser();
  }

  getAvatarUrl(): string {
    const u = this.user;
    if (!u || !u.avatarPath) return 'assets/images/a2-logo.png';
    return u.avatarPath.startsWith('http') ? u.avatarPath : `https://localhost:3000${u.avatarPath}`;
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const u = this.user;
    if (!u || !input.files || input.files.length === 0) return;
    const file = input.files[0];

    this.imageUpload.uploadAvatar(u.id, file).subscribe({
      next: (res) => {
        const bust = `?t=${Date.now()}`;
        const updated: User = { ...u, avatarPath: `${res.avatarPath}${bust}` };
        this.auth.storeUser(updated);
      },
      error: (err) => {
        console.error('Avatar upload failed', err);
        alert('Failed to update avatar');
      }
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  isSuperAdmin(): boolean {
    return this.user ? this.user.roles.includes('super') : false;
  }
}