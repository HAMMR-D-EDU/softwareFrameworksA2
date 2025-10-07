import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';

export type Role = 'super' | 'super_admin' | 'groupAdmin' | 'group_admin' | 'user';
export interface User {
  id: string;
  username: string;
  password: string; 
  email?: string;
  roles: Role[];
  groups: string[];
  avatarPath?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private USERS_KEY = 'app:users' as const;
  private SESSION_KEY = 'app:session' as const;
  private userSubject = new BehaviorSubject<User | null>(null);

  constructor(private store: StorageService) {
    // seed on first run
    const users = this.store.get<User[]>(this.USERS_KEY, []);
    if (users.length === 0) {
      this.store.set(this.USERS_KEY, [
        { id: 'u_1', username: 'super', password: '123', email: '', roles: ['super'], groups: [] }
      ]);
      this.store.set('app:groups' as any, []);
      this.store.set('app:channels' as any, []);
    }
    
    // Initialize user subject with current user
    const currentUser = this.currentUser();
    this.userSubject.next(currentUser);
  }

  currentUser(): User | null {
    return this.store.get<User | null>(this.SESSION_KEY, null);
  }

  login(username: string, password: string): boolean {
    const users = this.store.get<User[]>(this.USERS_KEY, []);
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      this.store.set(this.SESSION_KEY, found);
      return true;
    }
    return false;
  }

  register(newUser: { username: string; password: string; email?: string }): { ok: boolean; msg?: string } {
    const users = this.store.get<User[]>(this.USERS_KEY, []);
    if (users.some(u => u.username === newUser.username)) {
      return { ok: false, msg: 'Username already exists' };
    }
    const id = `u_${users.length + 1}`;
    users.push({ id, username: newUser.username, password: newUser.password, email: newUser.email ?? '', roles: ['user'], groups: [] });
    this.store.set(this.USERS_KEY, users);
    return { ok: true };
    // (No auto-login; navigate to /login after success)
  }

  logout(): void {
    this.store.remove(this.SESSION_KEY);
    this.userSubject.next(null);
  }

  storeUser(user: any): void {
    this.store.set(this.SESSION_KEY, user);
    this.userSubject.next(user);
  }

  onUserChange(): Observable<User | null> {
    return this.userSubject.asObservable();
  }
}