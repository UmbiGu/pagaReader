import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { PayslipService } from '../../services/payslip.service';
import { Payslip } from '../../models/payslip.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="row mb-4">
      <div class="col-md-4 mb-3 animate-fade-in">
        <div class="card h-100 shadow-sm border-start border-4 border-success p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Latest Net Salary</h6>
                <h2 class="fw-bold mb-0 text-success">€ {{ latestNet | number:'1.2-2' }}</h2>
              </div>
              <div class="bg-success bg-opacity-10 p-3 rounded-circle text-success">
                <i class="bi bi-wallet2 fs-3"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4 mb-3 animate-fade-in delay-1">
        <div class="card h-100 shadow-sm border-start border-4 border-primary p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Est. Annual Gross (RAL)</h6>
                <h2 class="fw-bold mb-0 text-primary">€ {{ estimatedRal | number:'1.0-0' }}</h2>
              </div>
              <div class="bg-primary bg-opacity-10 p-3 rounded-circle text-primary">
                <i class="bi bi-briefcase fs-3"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">*Calculated on latest fixed base x 14 months</small>
          </div>
        </div>
      </div>
      <div class="col-md-4 mb-3 animate-fade-in delay-2">
        <div class="card h-100 shadow-sm border-start border-4 border-info p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Total Historical Net</h6>
                <h2 class="fw-bold mb-0 text-info">€ {{ totalNet | number:'1.2-2' }}</h2>
              </div>
              <div class="bg-info bg-opacity-10 p-3 rounded-circle text-info">
                <i class="bi bi-bank fs-3"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row mb-4 animate-fade-in delay-2">
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-header bg-body-tertiary fw-bold py-3 border-bottom-0">
            <i class="bi bi-graph-up text-primary me-2"></i> Last 6 Months Net Salary Trend
          </div>
          <div class="card-body">
            <div style="display: block; height: 300px;">
              <canvas baseChart
                [data]="barChartData"
                [options]="barChartOptions"
                [type]="'bar'">
              </canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit {
  private payslipService = inject(PayslipService);
  
  latestNet = 0;
  totalNet = 0;
  estimatedRal = 0;

  barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: 'rgba(150, 150, 150, 0.1)' } },
      x: { grid: { display: false } }
    }
  };

  ngOnInit() {
    this.payslipService.getPayslips().subscribe(data => {
      this.calculateMetrics(data);
      this.buildChart(data);
    });
  }

  private calculateMetrics(data: Payslip[]) {
    if (data.length > 0) {
      const latest = data[data.length - 1];
      this.latestNet = latest.netSalary;
      this.totalNet = data.reduce((acc, curr) => acc + curr.netSalary, 0);
      
      // Rough RAL calculation (Gross Fixed Base * 14 months typically for Terziario Confcommercio)
      // Or we can just sum up Base + Contingency + Superminimo and multiply by 14
      const grossFixed = latest.baseSalary + latest.contingency + latest.superminimo;
      this.estimatedRal = grossFixed * 14; 
    } else {
      this.latestNet = 0;
      this.totalNet = 0;
      this.estimatedRal = 0;
    }
  }

  private buildChart(data: Payslip[]) {
    const recent = data.slice(-6); // Take up to last 6 months
    this.barChartData = {
      labels: recent.map(p => `${this.payslipService.getMonthName(p.month)} ${p.year}`),
      datasets: [
        { 
          data: recent.map(p => p.netSalary), 
          label: 'Net Salary (€)',
          backgroundColor: 'rgba(25, 135, 84, 0.8)',
          borderColor: 'rgba(25, 135, 84, 1)',
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: 'rgba(25, 135, 84, 1)'
        }
      ]
    };
  }
}
