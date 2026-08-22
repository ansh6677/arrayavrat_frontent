import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';
import { UserInfo } from '../core/models';
import { IconComponent } from '../shared/icon.component';

/** Panel logins: ADMIN = full access, VIEWER = read-only. */
@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <h2>Login Management</h2>
    <p class="mgmt-sub">
      Control who can sign in to this panel. A <b>Full access</b> login can add, edit and delete;
      a <b>View only</b> login can see everything but change nothing.
    </p>

    <div class="panel">
      <div class="toolbar">
        <button class="btn btn-primary push" (click)="openAdd()">
          <app-icon name="plus" [size]="15" [stroke]="2.4" /> Add Login
        </button>
      </div>

      @if (error) { <div class="alert alert-error">{{ error }}</div> }

      @if (loading) {
        <div class="skeleton" style="height: 220px;"></div>
      } @else {
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr><th>Name</th><th>Login ID</th><th>Access</th><th>Status</th><th class="right">Actions</th></tr>
            </thead>
            <tbody>
              @for (s of staff; track s.id) {
                <tr>
                  <td><b>{{ s.name }}</b> @if (s.id === auth.user()?.id) { <span class="muted">(you)</span> }</td>
                  <td>{{ s.phone }}</td>
                  <td>
                    @if (s.role === 'ADMIN') { <span class="badge badge-gold">Full access</span> }
                    @else { <span class="badge badge-off">View only</span> }
                  </td>
                  <td>
                    @if (s.active) { <span class="badge badge-ok">Active</span> }
                    @else { <span class="badge badge-off">Inactive</span> }
                  </td>
                  <td class="right actions">
                    <button class="btn btn-outline btn-sm" (click)="openEdit(s)">
                      <app-icon name="edit" [size]="14" /> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="remove(s)">
                      <app-icon name="trash" [size]="14" /> Delete
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="hint mt">
          The primary administrator account is system-managed and cannot be edited or deleted.
        </p>
      }
    </div>

    <!-- ============ Add / Edit login modal ============ -->
    @if (formOpen) {
      <div class="modal-back" (click)="formOpen = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editing ? 'Edit login — ' + editing.name : 'New login' }}</h3>
            <button type="button" class="modal-close" (click)="formOpen = false" aria-label="Close">
              <app-icon name="close" [size]="16" [stroke]="2.2" />
            </button>
          </div>
          @if (modalError) { <div class="alert alert-error">{{ modalError }}</div> }
          <div class="form-grid">
            <div class="field">
              <label>Name <span class="req">*</span></label>
              <input name="sname" [(ngModel)]="form.name" placeholder="e.g. Ramesh (Manager)" />
            </div>
            <div class="field">
              <label>Login ID <span class="req">*</span></label>
              <input name="sid" [(ngModel)]="form.loginId" placeholder="e.g. ramesh_view" />
            </div>
            <div class="field">
              <label>{{ editing ? 'New password' : 'Password' }}</label>
              <input name="spass" [(ngModel)]="form.password"
                     placeholder="{{ editing ? 'Blank = no change' : 'Leave blank to use the login ID as password' }}" />
            </div>
            <div class="field">
              <label>Access level <span class="req">*</span></label>
              <select name="srole" [(ngModel)]="form.role">
                <option value="ADMIN">Full access (add/edit/delete)</option>
                <option value="VIEWER">View only (read-only)</option>
              </select>
            </div>
            <div class="field">
              <label>Status</label>
              <select name="sactive" [(ngModel)]="form.active">
                <option [ngValue]="true">Active</option>
                <option [ngValue]="false">Inactive (login blocked)</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="formOpen = false">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } {{ editing ? 'Update' : 'Create login' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .actions { white-space: nowrap; }
    .actions .btn { margin-left: 6px; }
  `]
})
export class StaffComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  auth = inject(AuthService);

  staff: UserInfo[] = [];
  loading = true;
  formOpen = false;
  editing: UserInfo | null = null;
  saving = false;
  msg = '';
  error = '';
  modalError = '';

  form: any = this.blank();

  ngOnInit() {
    this.load();
  }

  private blank() {
    return { name: '', loginId: '', password: '', role: 'VIEWER', active: true };
  }

  load() {
    this.loading = true;
    this.api.getStaff().subscribe({
      next: list => {
        this.staff = list;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || 'Could not load the login list.';
        this.loading = false;
      }
    });
  }

  openAdd() {
    this.editing = null;
    this.form = this.blank();
    this.modalError = '';
    this.formOpen = true;
  }

  openEdit(s: UserInfo) {
    this.editing = s;
    this.form = { name: s.name, loginId: s.phone, password: '', role: s.role, active: s.active };
    this.modalError = '';
    this.formOpen = true;
  }

  save() {
    this.modalError = '';
    this.msg = '';
    if (!this.form.name.trim() || !this.form.loginId.trim()) {
      this.modalError = 'Name and Login ID are required.';
      return;
    }
    this.saving = true;
    const done = (message: string) => {
      this.saving = false;
      this.formOpen = false;
      this.toast.success(message);
      this.load();
    };
    const fail = (err: any) => {
      this.saving = false;
      this.modalError = err?.error?.error || 'Could not save. Please try again.';
    };

    if (this.editing) {
      this.api.updateStaff(this.editing.id, this.form).subscribe({ next: () => done('Login updated.'), error: fail });
    } else {
      this.api.addStaff(this.form).subscribe({
        next: () => done('Login created. (If the password was blank, the login ID is the password.)'),
        error: fail
      });
    }
  }

  async remove(s: UserInfo) {
    const ok = await this.confirm.ask({
      title: 'Delete this login?',
      message: `${s.name} (${s.phone}) will no longer be able to sign in to the panel.`,
      confirmLabel: 'Delete login'
    });
    if (!ok) return;
    this.api.deleteStaff(s.id).subscribe({
      next: () => {
        this.toast.success('Login deleted.');
        this.load();
      },
      error: err => this.toast.error(err?.error?.error || 'Delete failed.')
    });
  }
}
