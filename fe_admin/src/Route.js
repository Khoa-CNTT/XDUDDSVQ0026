import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from './services/AuthContext';
import User from "./components/user/User";
import Book from "./components/book/Book";
import Category from "./components/categoty/Category";
import Dashboard from "./components/dashboard/Dashboard";
import Login from './components/auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

function AppRoutes() {
    const { isAuthenticated } = useAuth();

    return (
      <>
        {isAuthenticated ? (
          <div className="grid grid-cols-5 grid-rows-5 gap-4">
            <div className="row-span-5">
              <Navbar />
            </div>
            <div className="col-span-4 row-span-5">
              <Routes>
                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/user" element={
                  <ProtectedRoute>
                    <User />
                  </ProtectedRoute>
                } />
                <Route path="/book" element={
                  <ProtectedRoute>
                    <Book />
                  </ProtectedRoute>
                } />
                <Route path="/category" element={
                  <ProtectedRoute>
                    <Category />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </>
    );
}

export default AppRoutes;
