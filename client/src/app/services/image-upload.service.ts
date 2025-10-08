import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UploadResponse {
  result: string;
  data: {
    filename: string;
    size: number;
    path: string;
  };
  numberOfImages: number; //shoudl always be 1
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private apiUrl = 'https://localhost:3000/api';

  constructor(private http: HttpClient) {}

//follows lecture toturial
//image uplaod method
  uploadImage(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    
    return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData); //post to uplaod route await for response
  }

//profile picture uplaod method
  uploadAvatar(userId: string, file: File): Observable<{ ok: boolean; avatarPath: string; msg: string }> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    return this.http.post<{ ok: boolean; avatarPath: string; msg: string }>(`${this.apiUrl}/upload/avatar/${userId}`, formData); //same await and set to db
  }
}
