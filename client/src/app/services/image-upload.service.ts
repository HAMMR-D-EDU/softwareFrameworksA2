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
  numberOfImages: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private apiUrl = 'https://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Upload image file using FormData
   * Follows the ZZIMAGEUPLAOD pattern
   */
  uploadImage(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    
    return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData);
  }
}
