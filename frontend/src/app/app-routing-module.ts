import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { Stocks } from './components/stocks/stocks';
import { Profile } from './components/profile/profile';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [AuthGuard] },
  { path: 'market', component: Stocks, canActivate: [AuthGuard] },
  { path: 'stocks', redirectTo: 'market', pathMatch: 'full' },
  { path: 'watchlist', redirectTo: 'market', pathMatch: 'full' },
  { path: 'profile', component: Profile, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
