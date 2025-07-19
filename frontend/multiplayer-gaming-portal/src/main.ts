import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router'; // Import withComponentInputBinding
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'; // For conceptual HttpClient use in services

import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes'; // Import the defined routes

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes,
      withComponentInputBinding() // Enables binding route params to component inputs
    ),
    provideHttpClient(withInterceptorsFromDi()) // Provide HttpClient conceptually
  ]
}).catch(err => console.error(err));
