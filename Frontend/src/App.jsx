import React, { useEffect } from "react";
import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Home from "./views/Home.jsx";
import Login from "./views/login.jsx";
import Register from "./views/Register.jsx";
import Members from "./views/Members.jsx";
import MembersInvite from "./views/memebrsInvite.jsx";
import { loadUser } from "./actions/authActions";

const GuestOnly = ({ children }) => {
  const { user, checked } = useSelector((state) => state.auth);
  if (!checked) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
};

const RequireAuth = ({ children }) => {
  const { user, checked } = useSelector((state) => state.auth);
  if (!checked) return null;
  if (!user) return <Navigate to="/login" replace />;
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
        <Route
          path="/members"
          element={
            <RequireAuth>
              <Members />
            </RequireAuth>
          }
        />
        <Route
          path="/members/invite"
          element={
            <RequireAuth>
              <MembersInvite />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
