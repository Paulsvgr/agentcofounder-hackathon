import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ThemeProvider } from "./lib/theme";
import { AddRunPage } from "./pages/AddRunPage";
import { HowToPage } from "./pages/HowToPage";
import { RunDetailPage } from "./pages/RunDetailPage";
import { RunsPage } from "./pages/RunsPage";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<RunsPage />} />
            <Route path="add" element={<AddRunPage />} />
            <Route path="how-to" element={<HowToPage />} />
            <Route path="runs/:id" element={<RunDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
