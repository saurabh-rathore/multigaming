import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AuthStatus } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return this.authService.authStatus$.pipe(
      take(1), // Take the current value and complete
      map(status => {
        const isAuthenticated = status === AuthStatus.Authenticated;

        if (isAuthenticated) {
          return true;
        } else {
          // Redirect to login page with the return url
          console.log('[AuthGuard] User not authenticated. Redirecting to login.');
          return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
        }
      }),
      // tap(isAuth => console.log('[AuthGuard] Access allowed:', isAuth)) // For debugging
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class NonAuthGuard implements CanActivate {

    constructor(private authService: AuthService, private router: Router) {}

    canActivate(
      route: ActivatedRouteSnapshot,
      state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

      return this.authService.authStatus$.pipe(
        take(1),
        map(status => {
          const isAuthenticated = status === AuthStatus.Authenticated;
          if (isAuthenticated) {
            // User is authenticated, redirect from login/register to home
            console.log('[NonAuthGuard] User authenticated. Redirecting from auth page to home.');
            return this.router.createUrlTree(['/']);
          } else {
            // User is not authenticated, allow access to login/register
            return true;
          }
        })
      );
    }
}
