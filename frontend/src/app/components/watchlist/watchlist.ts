import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { ChartDTO, StockFullDTO, WatchlistDTO } from '../../models/interfaces';

@Component({
	selector: 'app-watchlist',
	standalone: false,
	templateUrl: './watchlist.html',
	styleUrl: './watchlist.scss',
})
export class Watchlist implements OnInit {
	items: WatchlistDTO[] = [];
	loading = true;
	toast = '';
	toastType: 'success' | 'error' = 'success';

	showDetailModal = false;
	detailTicker = '';
	detailStock: StockFullDTO | null = null;
	detailLoading = false;
	detailError = '';
	detailChartData: ChartDTO | null = null;
	detailChartLoading = false;
	detailSelectedChartPeriod = '1mo';
	detailChartPeriods = [
		{ label: '1D', value: '1d' },
		{ label: '1S', value: '1wk' },
		{ label: '1M', value: '1mo' },
		{ label: '3M', value: '3mo' },
		{ label: '1A', value: '1y' },
		{ label: '5A', value: '5y' },
	];

	showAddModal = false;
	addTicker = '';
	addName = '';
	addLoading = false;
	addError = '';

	deleteLoading: { [id: number]: boolean } = {};

	constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

	ngOnInit(): void {
		this.load();
	}

	load(): void {
		this.loading = true;
		this.api.getWatchlist().pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		).subscribe({
			next: (data) => {
				this.items = data;
			},
			error: () => {},
		});
	}

	openAdd(): void {
		this.addTicker = '';
		this.addName = '';
		this.addError = '';
		this.showAddModal = true;
	}

	submitAdd(): void {
		if (!this.addTicker || !this.addName) {
			this.addError = 'Ticker y nombre son obligatorios.';
			return;
		}
		this.addLoading = true;
		this.addError = '';
		this.api.addToWatchlist({ ticker: this.addTicker.toUpperCase(), companyName: this.addName }).pipe(
			finalize(() => {
				this.addLoading = false;
				this.cdr.detectChanges();
			})
		).subscribe({
			next: (item) => {
				this.items.push(item);
				this.showAddModal = false;
				this.showToast(`${item.ticker} agregado a watchlist`, 'success');
			},
			error: (err) => {
				this.addError = err?.error || 'Error al agregar.';
			},
		});
	}

	remove(item: WatchlistDTO): void {
		this.deleteLoading[item.id] = true;
		this.api.deleteFromWatchlist(item.id).pipe(
			finalize(() => {
				delete this.deleteLoading[item.id];
				this.cdr.detectChanges();
			})
		).subscribe({
			next: () => {
				this.items = this.items.filter((i) => i.id !== item.id);
				this.showToast(`${item.ticker} eliminado`, 'success');
			},
			error: () => {
				this.showToast('Error al eliminar.', 'error');
			},
		});
	}

	openDetail(item: WatchlistDTO): void {
		this.showDetailModal = true;
		this.detailTicker = item.ticker;
		this.detailSelectedChartPeriod = '1mo';
		this.detailChartData = null;
		this.detailChartLoading = false;
		this.detailError = '';
		this.loadDetail(item.ticker);
	}

	closeDetail(): void {
		this.showDetailModal = false;
		this.detailTicker = '';
		this.detailStock = null;
		this.detailLoading = false;
		this.detailError = '';
		this.detailChartData = null;
		this.detailChartLoading = false;
		this.detailSelectedChartPeriod = '1mo';
	}

	loadDetail(ticker: string): void {
		this.detailLoading = true;
		this.detailError = '';
		this.detailStock = null;
		this.api.getStockDetails(ticker).pipe(
			finalize(() => {
				this.detailLoading = false;
				this.cdr.detectChanges();
			})
		).subscribe({
			next: (stock) => {
				this.detailStock = stock;
				this.loadDetailChart(stock.ticker, this.detailSelectedChartPeriod);
			},
			error: () => {
				this.detailError = `No se encontraron datos para "${ticker}".`;
			},
		});
	}

	loadDetailChart(ticker: string, period: string): void {
		this.detailChartLoading = true;
		this.api.getStockChart(ticker, period).pipe(
			finalize(() => {
				this.detailChartLoading = false;
				this.cdr.detectChanges();
			})
		).subscribe({
			next: (data) => {
				this.detailChartData = data;
			},
			error: () => {},
		});
	}

	selectDetailChartPeriod(period: string): void {
		this.detailSelectedChartPeriod = period;
		if (this.detailStock) {
			this.loadDetailChart(this.detailStock.ticker, period);
		}
	}

	get detailChartChangePct(): number | null {
		const history = this.detailChartData?.history;
		if (!history || history.length < 2) return null;
		const first = Number(history[0].price);
		const last = Number(history[history.length - 1].price);
		if (first === 0) return null;
		return (last - first) / first;
	}

	showToast(msg: string, type: 'success' | 'error'): void {
		this.toast = msg;
		this.toastType = type;
		setTimeout(() => (this.toast = ''), 3000);
	}
}
