export interface AssetQuote {
  symbol: string;
  label?: string;
  kind?: "index" | "fx" | "crypto";
  group?: string;
  last?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  prev_close?: number | null;
  change?: number | null;
  change_percent?: number | null;
  volume?: number | null;
  market_cap?: number | null;
  update_time?: string | null;
  name?: string;
  description?: string | null;
}

export interface MarketSummary {
  assets: AssetQuote[];
  errors?: { symbol: string; error: string }[];
  cached: boolean;
}

export interface StockRow {
  symbol: string;
  name: string;
  company_name: string;
  close: number | null;
  change: number | null;
  volume: number | null;
  market_cap: number | null;
}

export interface StockListResponse {
  count: number;
  stocks: StockRow[];
  cached: boolean;
}

export interface StockInfo {
  symbol: string;
  name?: string;
  sector?: string | null;
  industry?: string | null;
  website?: string | null;
  last: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  change?: number | null;
  change_percent?: number | null;
  volume?: number | null;
  marketCap?: number | null;
  sharesOutstanding?: number | null;
  trailingPE?: number | null;
  priceToBook?: number | null;
  dividendYield?: number | null;
  trailingAnnualDividendYield?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  fiftyDayAverage?: number | null;
  twoHundredDayAverage?: number | null;
  foreignRatio?: number | null;
  longBusinessSummary?: string | null;
  update_time?: string | null;
  [key: string]: unknown;
}

export interface Candle {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume?: number | null;
}

export interface HistoryResponse {
  candles: Candle[];
  period: string;
  interval: string;
}

export interface IndexMeta {
  symbol: string;
  name: string;
  count?: number;
  last?: number | null;
  change?: number | null;
  change_percent?: number | null;
}

export interface NewsItem {
  Date?: string;
  Title?: string;
  URL?: string;
  [key: string]: unknown;
}

export interface DividendRow {
  tarih?: string;
  Amount?: number;
  GrossRate?: number;
  NetRate?: number;
  TotalDividend?: number;
  [key: string]: unknown;
}

export interface FinancialRow {
  kalem: string;
  [period: string]: unknown;
}

export interface CryptoPair {
  symbol: string;
  last?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  change?: number | null;
  change_percent?: number | null;
  volume?: number | null;
  update_time?: string | null;
}
