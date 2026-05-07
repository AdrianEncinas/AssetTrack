import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserResponse } from '../../models/interfaces';

@Component({
	selector: 'app-nav',
	standalone: false,
	templateUrl: './nav.html',
	styleUrl: './nav.scss',
})
export class Nav implements OnInit {
	@Input() mobileOpen = false;
	@Output() navigate = new EventEmitter<void>();

	user: UserResponse | null = null;

	navItems = [
		{ path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
		{ path: '/market',    label: 'Mercado',   icon: 'search' },
		{ path: '/profile',   label: 'Perfil',    icon: 'person' },
	];

	constructor(public router: Router, private auth: AuthService) {}

	ngOnInit(): void {
		this.auth.getMe().subscribe({
			next: (u) => {
				// Avoid NG0100 when an observable emits during the same change-detection turn.
				Promise.resolve().then(() => {
					this.user = u;
				});
			},
			error: () => {},
		});
	}

	isActive(path: string): boolean {
		return this.router.url.startsWith(path);
	}

	onNavigate(): void {
		this.navigate.emit();
	}

	logout(): void {
		this.navigate.emit();
		this.auth.logout();
	}
}
