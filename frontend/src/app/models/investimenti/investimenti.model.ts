export interface PatrimonioGiornaliero {
  id?: number;
  dataValuta: string;
  liquidita: number;
  finanziamentoLong: number;
  garanziaShort: number;
  portafoglio: number;
  patrimonio: number;
  notaMovimento?: string;
}

export interface PortafoglioMovimento {
  id?: number;
  dataValuta: string;
  descrizione: string;
  valore: number;
  descrizioneTitolo?: string;
  isin?: string;
  ticker?: string;
  notaMovimento?: string;
}
