export interface Payslip {
  id?: number;
  month: number;
  year: number;
  baseSalary: number;
  contingency: number;
  superminimo: number;
  inpsTaxable: number;
  irpefTaxable: number;
  netIrpef: number;
  netSalary: number;
  remainingHolidays: number;
  remainingExFest: number;
  remainingRol: number;
  fonteDipendente: number;
  fonteAzienda: number;
  fileName?: string;
}
