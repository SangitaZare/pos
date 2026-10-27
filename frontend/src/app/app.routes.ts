import { Routes } from '@angular/router';
import { Pos } from './pos/pos';
import { Receipt } from './receipt/receipt';
import { Dashboard } from './dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: Pos },
  { path: 'dashboard', component: Dashboard },
  { path: 'receipt/:id', component: Receipt },
  { path: '**', redirectTo: '' }
];
