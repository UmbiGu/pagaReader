export interface Payslip {
  id?: number;
  month: number;
  year: number;
  baseSalary: number;
  contingency: number;
  superminimo: number;
  terzoElemento: number;
  straordinarioForfetizzato: number;
  edr: number;
  totaleCompetenze: number;
  totaleTrattenute: number;
  inpsTaxable: number;
  irpefTaxable: number;
  irpefLorda: number;
  netIrpef: number;
  detrazioni: number;
  ulterioriDetrazioni: number;
  netSalary: number;
  remainingHolidays: number;
  remainingExFest: number;
  remainingRol: number;
  fonteDipendente: number;
  fonteAzienda: number;
  fileName?: string;
  voci?: any[];
}
