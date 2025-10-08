import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';

export type Role = 'super' | 'super_admin' | 'groupAdmin' | 'group_admin' | 'user'; //figure out whcih group admin is the dud
export interface User {
  id: string;
  username: string;
  password: string; 
  email?: string;
  roles: Role[];
  groups: string[];
  avatarPath?: string;
}

@Injectable({ providedIn: 'root' }) //app-wide singleton service
export class AuthService {
  private USERS_KEY = 'app:users' as const; //key for users in local storage
  private SESSION_KEY = 'app:session' as const; //key for session in local storage
  private userSubject = new BehaviorSubject<User | null>(null); //subject for user changes

//
  constructor(private store: StorageService) { //inject storage service
    // seed on first run (if no users, set super user)
    const users = this.store.get<User[]>(this.USERS_KEY, []); 
    if (users.length === 0) { //if no users,
      this.store.set(this.USERS_KEY, [
        { id: 'u_1', username: 'super', password: '123', email: '', roles: ['super'], groups: [] }
      ]);
      this.store.set('app:groups' as any, []);
      this.store.set('app:channels' as any, []);
    }
    
    // Initialize user subject with current user and notfiies components of changes
    const currentUser = this.currentUser();
    this.userSubject.next(currentUser);
  }

  
  //Get the currently authenticated user from LOCAL storage. then will allow access to app used by routegaurds  and components
  currentUser(): User | null { //boolean return to check if user is logged in
    return this.store.get<User | null>(this.SESSION_KEY, null); //gets user from local storage
  }

  logout(): void {
    this.store.remove(this.SESSION_KEY); //removes user from session storage
    this.userSubject.next(null);
  }

//stores user in locla for auto login
  storeUser(user: any): void { 
    this.store.set(this.SESSION_KEY, user); //stores user in session storage to preent refreshes logging people out see if you can chaneg to db down the line not sur ehow to implement
    this.userSubject.next(user); //notify subs of logged ein user (investigate wha thappens when two brosers runnign)
  }

//subscribtion to user changes for otehr componenets 
  onUserChange(): Observable<User | null> {
    return this.userSubject.asObservable();
  }
}