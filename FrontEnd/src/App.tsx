import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Overview } from "./pages/Overview";
import { OurCatalog } from "./pages/OurCatalog";
import { Manufacturers } from "./pages/Manufacturers";
import { ManufacturerDetail } from "./pages/ManufacturerDetail";
import { Competitors } from "./pages/Competitors";
import { Comparison } from "./pages/Comparison";
import { ReviewQueue } from "./pages/ReviewQueue";
import { ProcessingRuns } from "./pages/ProcessingRuns";
import { Exports } from "./pages/Exports";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="our-catalog" element={<OurCatalog />} />
          <Route path="manufacturers" element={<Manufacturers />} />
          <Route path="manufacturers/:id" element={<ManufacturerDetail />} />
          <Route path="competitors" element={<Competitors />} />
          <Route path="comparison" element={<Comparison />} />
          <Route path="review-queue" element={<ReviewQueue />} />
          <Route path="processing-runs" element={<ProcessingRuns />} />
          <Route path="exports" element={<Exports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
