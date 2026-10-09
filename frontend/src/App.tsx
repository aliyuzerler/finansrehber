import { Route, Routes } from "react-router-dom";

import AiPage from "./pages/AiPage";
import Layout from "./components/Layout";
import PlaceholderPage from "./components/PlaceholderPage";
import CalendarPage from "./pages/CalendarPage";
import CryptoPage from "./pages/CryptoPage";
import FundDetailPage from "./pages/FundDetailPage";
import FundsPage from "./pages/FundsPage";
import FxPage from "./pages/FxPage";
import HomePage from "./pages/HomePage";
import MacroPage from "./pages/MacroPage";
import ViopPage from "./pages/ViopPage";
import { IndexDetailPage, IndicesPage } from "./pages/IndicesPage";
import PortfolioPage from "./pages/PortfolioPage";
import ScreenerPage from "./pages/ScreenerPage";
import StockDetailPage from "./pages/StockDetailPage";
import StocksPage from "./pages/StocksPage";
import { UsStockDetailPage, UsStocksPage } from "./pages/UsStocksPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="hisseler" element={<StocksPage />} />
        <Route path="hisse/:symbol" element={<StockDetailPage />} />
        <Route path="abd-borsa" element={<UsStocksPage />} />
        <Route path="abd-borsa/:symbol" element={<UsStockDetailPage />} />
        <Route path="endeksler" element={<IndicesPage />} />
        <Route path="endeksler/:symbol" element={<IndexDetailPage />} />
        <Route path="doviz" element={<FxPage />} />
        <Route path="kripto" element={<CryptoPage />} />
        <Route path="fonlar" element={<FundsPage />} />
        <Route path="fonlar/:code" element={<FundDetailPage />} />
        <Route path="tarama" element={<ScreenerPage />} />
        <Route path="portfoy" element={<PortfolioPage />} />
        <Route path="makro" element={<MacroPage />} />
        <Route path="viop" element={<ViopPage />} />
        <Route path="takvim" element={<CalendarPage />} />
        <Route path="ai" element={<AiPage />} />
        <Route path="*" element={<PlaceholderPage title="Sayfa Bulunamadı" />} />
      </Route>
    </Routes>
  );
}
