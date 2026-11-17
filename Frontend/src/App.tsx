import { useEffect, type ReactNode } from "react";
import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./hooks";
import Home from "./views/Home";
import Login from "./views/login";
import Register from "./views/Register";
import Members from "./views/Members";
import MembersInvite from "./views/memebrsInvite";
import Dashboard from "./views/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import Catalogs from "./views/Catalogs";
import CatalogForm from "./views/CatalogForm";
import CatalogDetail from "./views/CatalogDetail";
import Products from "./views/Products";
import ProductDetail from "./views/ProductDetail";
import Matches from "./views/Matches";
import Compare from "./views/Compare";
import Reviews from "./views/Reviews";
import Export from "./views/Export";
import AcceptInvite from "./views/AcceptInvite";
import ForgotPassword from "./views/ForgotPassword";
import ResetPassword from "./views/ResetPassword";
import { loadUser } from "./actions/authActions";

const GuestOnly = ({ children }: { children: ReactNode }) => {
  const { user, checked } = useAppSelector((state) => state.auth);
  if (!checked) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, checked } = useAppSelector((state) => state.auth);
  if (!checked) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const RequireInvite = ({ children }: { children: ReactNode }) => {
  const { role } = useAppSelector((state) => state.auth);
  if (role !== "owner") {
    return <Navigate to="/dashboard/members" replace />;
  }
  return children;
};

const App = () => {
  const dispatch = useAppDispatch();
  const { checked } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!checked) {
      dispatch(loadUser());
    }
  }, [checked, dispatch]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <Register />
            </GuestOnly>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestOnly>
              <ForgotPassword />
            </GuestOnly>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <GuestOnly>
              <ResetPassword />
            </GuestOnly>
          }
        />
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/members" element={<Navigate to="/dashboard/members" replace />} />
        <Route
          path="/members/invite"
          element={<Navigate to="/dashboard/members/invite" replace />}
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="catalogs" element={<Catalogs />} />
          <Route path="catalogs/new" element={<CatalogForm />} />
          <Route path="catalogs/:id" element={<CatalogDetail />} />
          <Route path="catalogs/:id/edit" element={<CatalogForm />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="matches" element={<Matches />} />
          <Route path="compare" element={<Compare />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="export" element={<Export />} />
          <Route path="members" element={<Members />} />
          <Route
            path="members/invite"
            element={
              <RequireInvite>
                <MembersInvite />
              </RequireInvite>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
