// src/routes/AppRoutes.jsx

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../components/homepage/HomePage";
import Login from "../components/login/Login";
import Register from "../components/register/Register";
import Charts from "../components/chart/Charts";
import NotFound from "../components/error/NotFound";
import PrivateRoute from "./PrivateRoute";
import Header from "../components/header/Header";
export default function AppRoutes() {
  return (
    <BrowserRouter>
    <Header />
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />

        <Route
          path="/graficos"
          element={
            <PrivateRoute>
              <Charts />
            </PrivateRoute>
          }
        />

<Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}