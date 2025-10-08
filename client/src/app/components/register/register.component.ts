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
  username = ''; //dec empty
  password = ''; //dec empty
  email = ''; //dec empty
  error = ''; //dec empty
  success = ''; //dec empty

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {} //SAME AS LOGIN

//submit used in html similiar to login 
  submit() {
    this.error = ''; //dec empty
    this.success = ''; //dec empty
    //checks if all fields are filled
    if (!this.username.trim() || !this.password.trim() || !this.email.trim()) {
      this.error = 'All fields are required';
      return;
    }
    
    this.api.register({ username: this.username, password: this.password, email: this.email }).subscribe({ //async api call to api.service.ts
      next: (result) => { //register check passed
        if (result.ok) {
          this.success = 'Account created! Please login.';
          setTimeout(() => this.router.navigateByUrl('/login'), 2000); //2 second delay then navigates to login for security instead of driectly logging in 
        } else {
          this.error = result.msg || 'Registration failed'; //error handling eg dupe email/username
        }
      },
      error: (error) => {
        this.error = error.error?.msg || 'Registration failed';
      }
    });
  }
}
