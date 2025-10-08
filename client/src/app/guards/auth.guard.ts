import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}


  //Allow route activation only when a user is logged in; otherwise redirect to /login.
  canActivate(): boolean {
    if (this.auth.currentUser()) { //checks if user is logged in
      return true; //returns true if user is logged in
    }
    this.router.navigateByUrl('/login');
    return false; //returns false if user is not logged in
  }
}


//gaurd that checks if a user is logged in, if not redirect to login page