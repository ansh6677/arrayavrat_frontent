import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home.component';
import { AboutComponent } from './pages/about.component';
import { ContactComponent } from './pages/contact.component';
import { ProductsComponent } from './pages/products.component';
import { CartComponent } from './pages/cart.component';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { DashboardComponent } from './pages/dashboard.component';

import { MgmtLoginComponent } from './management/mgmt-login.component';
import { MgmtLayoutComponent } from './management/mgmt-layout.component';
import { OverviewComponent } from './management/overview.component';
import { CustomersComponent } from './management/customers.component';
import { CustomerDetailComponent } from './management/customer-detail.component';
import { ExpensesComponent } from './management/expenses.component';
import { ExtraSalesComponent } from './management/extra-sales.component';
import { ProductsAdminComponent } from './management/products-admin.component';
import { StaffComponent } from './management/staff.component';

import { adminGuard, customerGuard, fullAdminGuard } from './core/guards';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'cart', component: CartComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [customerGuard] },

  { path: 'management', component: MgmtLoginComponent },
  {
    path: 'management/panel',
    component: MgmtLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', component: OverviewComponent },
      { path: 'customers', component: CustomersComponent },
      { path: 'customers/:id', component: CustomerDetailComponent },
      { path: 'expenses', component: ExpensesComponent },
      { path: 'extra-sales', component: ExtraSalesComponent },
      { path: 'products', component: ProductsAdminComponent },
      { path: 'staff', component: StaffComponent, canActivate: [fullAdminGuard] }
    ]
  },

  { path: '**', redirectTo: '' }
];
