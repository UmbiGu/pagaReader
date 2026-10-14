export interface MargineMese {
  id?: number;
  sheetName: string;
  anno: number;
  mese: number;
  totaleSpese: number;
  entrate: number;
  risparmiati: number;
  speseCasa?: number;
  note?: string;
}

export interface MargineMovimento {
  id?: number;
  sheetName?: string;
  anno: number;
  mese: number;
  data: string; // YYYY-MM-DD
  conto: string;
  descrizione: string;
  uscite: number;
  note?: string;
  pagato: boolean;
  categoria?: string;
}
