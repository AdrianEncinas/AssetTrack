import { ChangeDetectorRef, Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { TickerSearchDTO, StockFullDTO, ChartDTO, WatchlistDTO } from '../../models/interfaces';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-stocks',
  standalone: false,
  templateUrl: './stocks.html',
  styleUrl: './stocks.scss',
})
export class Stocks implements OnInit, OnDestroy {
  @ViewChild('stockChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;
  private searchSubject = new Subject<string>();

  query = '';
  results: TickerSearchDTO[] = [];
  searching = false;

  selectedStock: StockFullDTO | null = null;
  stockLoading = false;
  stockError = '';

  chartData: ChartDTO | null = null;
  chartLoading = false;
  selectedChartPeriod = '1mo';
  chartPeriods = [
    { label: '1D', value: '1d' },
    { label: '1S', value: '1wk' },
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '1A', value: '1y' },
    { label: '5A', value: '5y' },
  ];

  watchlistItems: WatchlistDTO[] = [];
  watchlistLoading = false;
  watchlistError = '';
  watchlistActionLoading = false;
  watchlistNotice = '';
  watchlistNoticeType: 'success' | 'error' = 'success';

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadWatchlist();
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) => {
        this.searching = true;
        return this.api.searchTickers(q).pipe(
          finalize(() => {
            this.searching = false;
            this.cdr.detectChanges();
          })
        );
      })
    ).subscribe({
      next: (res) => {
        this.results = res;
      },
      error: () => { this.results = []; },
    });
  }

  loadWatchlist(): void {
    this.watchlistLoading = true;
    this.watchlistError = '';
    this.api.getWatchlist().pipe(
      finalize(() => {
        this.watchlistLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (items) => {
        this.watchlistItems = items;
      },
      error: () => {
        this.watchlistError = 'No se pudo cargar la watchlist.';
      },
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.searchSubject.complete();
  }

  onQueryChange(): void {
    if (this.query.length >= 1) {
      this.searchSubject.next(this.query);
    } else {
      this.results = [];
      this.searching = false;
      this.cdr.detectChanges();
    }
  }

  selectStock(result: TickerSearchDTO): void {
    this.query = result.symbol;
    this.results = [];
    this.loadStockDetails(result.symbol);
  }

  loadStockDetails(ticker: string): void {
    this.stockLoading = true;
    this.stockError = '';
    this.selectedStock = null;
    this.api.getStockDetails(ticker).pipe(
      finalize(() => {
        this.stockLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (stock) => {
        this.selectedStock = stock;
        this.loadChart(ticker, this.selectedChartPeriod);
      },
      error: () => {
        this.stockError = `No se encontraron datos para "${ticker}".`;
      },
    });
  }

  openWatchlistStock(item: WatchlistDTO): void {
    this.query = item.ticker;
    this.results = [];
    this.loadStockDetails(item.ticker);
  }

  addSelectedToWatchlist(): void {
    if (!this.selectedStock || this.watchlistActionLoading) return;
    if (this.isInWatchlist(this.selectedStock.ticker)) {
      this.showWatchlistNotice('La accion ya esta en watchlist.', 'error');
      return;
    }

    this.watchlistActionLoading = true;
    this.api.addToWatchlist({
      ticker: this.selectedStock.ticker,
      companyName: this.selectedStock.longName || this.selectedStock.ticker,
    }).pipe(
      finalize(() => {
        this.watchlistActionLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (item) => {
        this.watchlistItems = [item, ...this.watchlistItems];
        this.showWatchlistNotice(`${item.ticker} agregado a watchlist`, 'success');
      },
      error: (err) => {
        const msg = typeof err?.error === 'string' ? err.error : 'No se pudo agregar a watchlist.';
        this.showWatchlistNotice(msg, 'error');
      },
    });
  }

  removeFromWatchlist(item: WatchlistDTO, event?: Event): void {
    event?.stopPropagation();
    if (this.watchlistActionLoading) return;
    this.watchlistActionLoading = true;
    this.api.deleteFromWatchlist(item.id).pipe(
      finalize(() => {
        this.watchlistActionLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.watchlistItems = this.watchlistItems.filter((i) => i.id !== item.id);
        this.showWatchlistNotice(`${item.ticker} eliminado de watchlist`, 'success');
      },
      error: () => {
        this.showWatchlistNotice('No se pudo eliminar de watchlist.', 'error');
      },
    });
  }

  isInWatchlist(ticker: string | null | undefined): boolean {
    if (!ticker) return false;
    return this.watchlistItems.some((item) => item.ticker.toUpperCase() === ticker.toUpperCase());
  }

  showWatchlistNotice(msg: string, type: 'success' | 'error'): void {
    this.watchlistNotice = msg;
    this.watchlistNoticeType = type;
    setTimeout(() => {
      this.watchlistNotice = '';
      this.cdr.detectChanges();
    }, 2800);
  }

  loadChart(ticker: string, period: string): void {
    this.chartLoading = true;
    this.api.getStockChart(ticker, period).pipe(
      finalize(() => {
        this.chartLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        this.chartData = data;
        setTimeout(() => this.renderChart(data), 50);
      },
      error: () => {},
    });
  }

  selectChartPeriod(period: string): void {
    this.selectedChartPeriod = period;
    if (this.selectedStock) {
      this.loadChart(this.selectedStock.ticker, period);
    }
  }

  renderChart(data: ChartDTO): void {
    if (!this.chartCanvas) return;
    this.chart?.destroy();

    const labels = data.history.map((h) => h.time);
    const prices = data.history.map((h) => Number(h.price));
    const isPos = prices.length > 1 ? prices[prices.length - 1] >= prices[0] : true;
    const color = isPos ? '#10B981' : '#EF4444';

    const ctx = this.chartCanvas.nativeElement.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, isPos ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: prices,
          borderColor: color,
          borderWidth: 2,
          backgroundColor: gradient,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#94A3B8',
            bodyColor: '#F1F5F9',
            callbacks: {
              label: (c) => ` $${Number(c.raw).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(51,65,85,0.4)', drawTicks: false },
            border: { display: false },
            ticks: { color: '#64748B', font: { size: 11 }, maxTicksLimit: 6, maxRotation: 0 },
          },
          y: {
            grid: { color: 'rgba(51,65,85,0.4)', drawTicks: false },
            border: { display: false },
            ticks: { color: '#64748B', font: { size: 11 }, callback: (v) => `$${Number(v).toFixed(0)}` },
          },
        },
      },
    });
  }

  get chartChangePct(): number | null {
    const history = this.chartData?.history;
    if (!history || history.length < 2) return null;
    const first = Number(history[0].price);
    const last = Number(history[history.length - 1].price);
    if (first === 0) return null;
    return (last - first) / first;
  }

  pct(v: number | null | undefined): string {
    if (v == null) return 'N/D';
    return `${(v * 100).toFixed(2)}%`;
  }

  potentialPct(v: number | null | undefined): string {
    if (v == null) return 'N/D';
    return `${(v).toFixed(2)}%`;
  }

  fmt(v: number | null | undefined, decimals = 2): string {
    if (v == null) return 'N/D';
    return Number(v).toFixed(decimals);
  }

  fmtBig(v: number | null | undefined): string {
    if (v == null) return 'N/D';
    if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  }

  getRecoClass(r: string | null | undefined): string {
    if (!r) return '';
    const lower = r.toLowerCase();
    if (lower.includes('buy') || lower.includes('strong')) return 'positive';
    if (lower.includes('sell')) return 'negative';
    return '';
  }
}
