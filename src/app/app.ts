import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from './shared/ui/app-header';

@Component({
  imports: [RouterOutlet, AppHeader],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
