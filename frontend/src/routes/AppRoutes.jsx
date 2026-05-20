// src/routes/AppRoutes.jsx

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Home from "../components/homepage/HomePage";
import Login from "../components/login/Login";
import AuthSuccess from "../components/login/AuthSuccess";
import Register from "../components/register/Register";
import Charts from "../components/chart/Charts";
import NotFound from "../components/error/NotFound";
import PrivateRoute from "./PrivateRoute";
import Header from "../components/header/Header";
import TopTracks from "../components/pages/TopTrack";

// Layout wrapper to conditionally show header
function LayoutWrapper({ children }) {
  const location = useLocation();
  const hideHeader = ["/login", "/registro", "/auth/success"].includes(
    location.pathname
  );

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
          path="/auth/success"
          element={
            <LayoutWrapper>
              <AuthSuccess />
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
          path="/top-tracks"
          element={
            <LayoutWrapper>
              <TopTracks />
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