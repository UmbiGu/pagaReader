import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in">
      <h2 class="mb-0 fw-bold"><i class="bi bi-people-fill text-primary me-2"></i> User Management</h2>
      <button class="btn btn-primary rounded-pill shadow-sm px-4" (click)="toggleAddForm()">
        <i class="bi bi-person-plus-fill me-2"></i> Add New User
      </button>
    </div>

    <!-- Create User Form (Hidden by default) -->
    <div class="card shadow-sm border-0 mb-4 animate-fade-in" *ngIf="showAddForm">
      <div class="card-header bg-primary bg-opacity-10 text-primary fw-bold border-bottom-0 py-3">
        Create New User
      </div>
      <div class="card-body">
        <form (submit)="createUser($event)" class="row g-3">
          <div class="col-md-4">
            <label class="form-label text-muted small">Email Address</label>
            <input type="email" class="form-control" [(ngModel)]="newUser.email" name="email" required>
          </div>
          <div class="col-md-4">
            <label class="form-label text-muted small">Password</label>
            <input type="password" class="form-control" [(ngModel)]="newUser.password" name="password" required>
          </div>
          <div class="col-md-3">
            <label class="form-label text-muted small">Role</label>
            <select class="form-select" [(ngModel)]="newUser.role" name="role">
              <option value="USER">User (Standard)</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div class="col-md-1 d-flex align-items-end">
            <button type="submit" class="btn btn-success w-100"><i class="bi bi-check-lg"></i> Save</button>
          </div>
        </form>
        <div *ngIf="errorMsg" class="alert alert-danger mt-3 py-2 small mb-0">{{ errorMsg }}</div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="card shadow-sm border-0 animate-fade-in delay-1">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-modern table-hover mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th class="ps-4">ID</th>
                <th>Email Account</th>
                <th>Role</th>
                <th class="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users">
                <td class="ps-4 text-muted">#{{ user.id }}</td>
                <td class="fw-medium">{{ user.email }}</td>
                <td>
                  <span class="badge rounded-pill" [ngClass]="user.role === 'ADMIN' ? 'bg-danger bg-opacity-10 text-danger' : 'bg-primary bg-opacity-10 text-primary'">
                    {{ user.role }}
                  </span>
                </td>
                <td class="text-end pe-4">
                  <button class="btn btn-sm btn-outline-danger rounded-circle" style="width:32px; height:32px; padding:0" 
                          (click)="deleteUser(user.id, user.email)" 
                          [disabled]="user.email === 'test@pagareader.com'"
                          title="Delete User">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
              <tr *ngIf="users.length === 0">
                <td colspan="4" class="text-center py-5 text-muted">Loading users...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class UsersComponent implements OnInit {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/admin/users`;

  users: any[] = [];
  showAddForm = false;
  errorMsg = '';
  
  newUser = { email: '', password: '', role: 'USER' };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchUsers();
    }
  }

  fetchUsers() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => this.users = data,
      error: (err) => console.error("Error fetching users", err)
    });
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    this.errorMsg = '';
  }

  createUser(event: Event) {
    event.preventDefault();
    this.errorMsg = '';
    
    if (!this.newUser.email || !this.newUser.password) {
      this.errorMsg = "Email and password are required.";
      return;
    }

    this.http.post(this.apiUrl, this.newUser).subscribe({
      next: () => {
        this.fetchUsers();
        this.newUser = { email: '', password: '', role: 'USER' };
        this.showAddForm = false;
      },
      error: (err) => {
        this.errorMsg = err.error || "Error creating user.";
      }
    });
  }

  deleteUser(id: number, email: string) {
    if (confirm(`Are you sure you want to completely delete the user ${email} and ALL their payslips?`)) {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => this.fetchUsers(),
        error: (err) => alert(err.error || "Error deleting user")
      });
    }
  }
}
