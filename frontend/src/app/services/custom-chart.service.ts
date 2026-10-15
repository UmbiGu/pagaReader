import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CustomChartConfig {
  id: string;
  title: string;
  sourceModule: 'margine' | 'investimenti' | 'payslips';
  chartType: 'bar' | 'line' | 'doughnut' | 'pie';
  metric: string;
  categoryFilter?: string;
  timeframe?: string; // 'all' | '6m' | '1y'
  colorScheme: 'purple' | 'blue' | 'green' | 'amber' | 'rose' | 'teal';
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomChartService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private storageKey = 'pagareader_custom_charts';

  getCharts(moduleFilter?: 'margine' | 'investimenti' | 'payslips'): CustomChartConfig[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(this.storageKey);
      let list: CustomChartConfig[] = raw ? JSON.parse(raw) : [];
      if (moduleFilter) {
        return list.filter(c => c.sourceModule === moduleFilter);
      }
      return list;
    } catch (e) {
      console.error('Error loading custom charts:', e);
      return [];
    }
  }

  saveChart(chart: Omit<CustomChartConfig, 'id' | 'createdAt'> & { id?: string }): CustomChartConfig {
    if (!this.isBrowser) {
      return { ...chart, id: 'temp_' + Date.now(), createdAt: Date.now() };
    }
    const current = this.getCharts();
    const id = chart.id || 'chart_' + Date.now();
    const existingIndex = current.findIndex(c => c.id === id);

    const savedChart: CustomChartConfig = {
      ...chart,
      id,
      createdAt: existingIndex >= 0 ? current[existingIndex].createdAt : Date.now()
    };

    if (existingIndex >= 0) {
      current[existingIndex] = savedChart;
    } else {
      current.push(savedChart);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(current));
    return savedChart;
  }

  deleteChart(id: string): void {
    if (!this.isBrowser) return;
    const current = this.getCharts().filter(c => c.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(current));
  }
}
