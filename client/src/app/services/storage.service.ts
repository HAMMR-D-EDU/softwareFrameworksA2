import { Injectable } from '@angular/core';

type Key = 'app:users' | 'app:groups' | 'app:channels' | 'app:session'; //types of keys we're allowed

@Injectable({ providedIn: 'root' })
export class StorageService {
    //method to set item in local storage parses to string from db
  get<T>(key: Key, fallback: T): T {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  }

// generic so we can use all data incase for db fuck ups + dif data types in keys etc
//stores to local storage
  set<T>(key: Key, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));//sets item in local storage converts to string from db
  }

//remove item in local storage
  remove(key: Key): void {
    localStorage.removeItem(key);
  }
  //clear all items in local storage
  clear(): void {
    localStorage.clear();
  }
}

//this is only utilsied in auth.service.ts