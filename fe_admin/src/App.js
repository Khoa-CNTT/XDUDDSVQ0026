import React from 'react';
import "../src/index.css";
import Navbar from './components/Navbar';
import AppRoutes from './Route';
import { AuthProvider } from './services/AuthContext';

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
