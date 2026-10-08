import { Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import PlaceholderPage from "./components/PlaceholderPage";
import CryptoPage from "./pages/CryptoPage";
import FundDetailPage from "./pages/FundDetailPage";
import FundsPage from "./pages/FundsPage";
import FxPage from "./pages/FxPage";
import HomePage from "./pages/HomePage";
import { IndexDetailPage, IndicesPage } from "./pages/IndicesPage";
import ScreenerPage from "./pages/ScreenerPage";
import StockDetailPage from "./pages/StockDetailPage";
import StocksPage from "./pages/StocksPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="hisseler" element={<StocksPage />} />
        <Route path="hisse/:symbol" element={<StockDetailPage />} />
        <Route path="endeksler" element={<IndicesPage />} />
        <Route path="endeksler/:symbol" element={<IndexDetailPage />} />
        <Route path="doviz" element={<FxPage />} />
        <Route path="kripto" element={<CryptoPage />} />
        <Route path="fonlar" element={<FundsPage />} />
        <Route path="fonlar/:code" element={<FundDetailPage />} />
        <Route path="tarama" element={<ScreenerPage />} />
        <Route path="portfoy" element={<PlaceholderPage title="Portföy" />} />
        <Route path="makro" element={<PlaceholderPage title="Makro" />} />
        <Route path="viop" element={<PlaceholderPage title="VIOP" />} />
        <Route path="takvim" element={<PlaceholderPage title="Ekonomik Takvim" />} />
        <Route path="*" element={<PlaceholderPage title="Sayfa Bulunamadı" />} />
      </Route>
    </Routes>
  );
}
