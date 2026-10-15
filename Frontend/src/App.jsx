import React, { useEffect } from "react";
import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Home from "./views/Home.jsx";
import Login from "./views/login.jsx";
import Register from "./views/Register.jsx";
import Members from "./views/Members.jsx";
import MembersInvite from "./views/memebrsInvite.jsx";
import Dashboard from "./views/Dashboard.jsx";
import DashboardLayout from "./components/DashboardLayout.jsx";
import Catalogs from "./views/Catalogs.jsx";
import CatalogForm from "./views/CatalogForm.jsx";
import CatalogDetail from "./views/CatalogDetail.jsx";
import Products from "./views/Products.jsx";
import Matches from "./views/Matches.jsx";
import Reviews from "./views/Reviews.jsx";
import Export from "./views/Export.jsx";
import { loadUser } from "./actions/authActions";

const GuestOnly = ({ children }) => {
  const { user, checked } = useSelector((state) => state.auth);
  if (!checked) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const RequireAuth = ({ children }) => {
  const { user, checked } = useSelector((state) => state.auth);
  if (!checked) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const RequireInvite = ({ children }) => {
  const { role } = useSelector((state) => state.auth);
  if (role !== "owner" && role !== "admin") {
    return <Navigate to="/dashboard/members" replace />;
  }
  return children;
};

const App = () => {
  const dispatch = useDispatch();
  const { checked } = useSelector((state) => state.auth);

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
          <Route path="matches" element={<Matches />} />
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
