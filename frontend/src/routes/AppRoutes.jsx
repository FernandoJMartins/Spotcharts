// src/routes/AppRoutes.jsx

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Home from "../components/homepage/HomePage";
import Login from "../components/login/Login";
import Register from "../components/register/Register";
import Charts from "../components/chart/Charts";
import NotFound from "../components/error/NotFound";
import PrivateRoute from "./PrivateRoute";
import Header from "../components/header/Header";

// Layout wrapper to conditionally show header
function LayoutWrapper({ children }) {
  const location = useLocation();
  const hideHeader = ["/login", "/registro"].includes(location.pathname);

  return (
    <>
      {!hideHeader && <Header />}
      {children}
    </>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <LayoutWrapper>
              <Home />
            </LayoutWrapper>
          }
        />
        <Route
          path="/login"
          element={
            <LayoutWrapper>
              <Login />
            </LayoutWrapper>
          }
        />
        <Route
          path="/registro"
          element={
            <LayoutWrapper>
              <Register />
            </LayoutWrapper>
          }
        />
        <Route
          path="/graficos"
          element={
            <LayoutWrapper>
              <PrivateRoute>
                <Charts />
              </PrivateRoute>
            </LayoutWrapper>
          }
        />
        <Route
          path="*"
          element={
            <LayoutWrapper>
              <NotFound />
            </LayoutWrapper>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}