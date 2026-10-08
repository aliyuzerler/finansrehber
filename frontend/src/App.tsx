import { Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import PlaceholderPage from "./components/PlaceholderPage";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="hisseler" element={<PlaceholderPage title="Hisseler" />} />
        <Route path="endeksler" element={<PlaceholderPage title="Endeksler" />} />
        <Route path="doviz" element={<PlaceholderPage title="Döviz & Altın" />} />
        <Route path="kripto" element={<PlaceholderPage title="Kripto" />} />
        <Route path="fonlar" element={<PlaceholderPage title="Fonlar" />} />
        <Route path="tarama" element={<PlaceholderPage title="Tarama" />} />
        <Route path="portfoy" element={<PlaceholderPage title="Portföy" />} />
        <Route path="makro" element={<PlaceholderPage title="Makro" />} />
        <Route path="viop" element={<PlaceholderPage title="VIOP" />} />
        <Route path="takvim" element={<PlaceholderPage title="Ekonomik Takvim" />} />
        <Route path="*" element={<PlaceholderPage title="Sayfa Bulunamadı" />} />
      </Route>
    </Routes>
  );
}
