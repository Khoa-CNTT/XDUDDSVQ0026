import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { admin, logout } = useAuth();
    
    const isActiveRoute = (path) => {
        return location.pathname === path ? 'bg-blue-700' : '';
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="fixed top-0 h-full z-10 block shadow-lg text-start">
            <nav className="h-full bg-gray-800 p-4 w-64">
                <div className="container mx-auto block">
                    <div className="flex items-center mb-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        <div className="text-white text-2xl font-bold">Book Admin</div>
                    </div>
                    
                    {/* Admin info section */}
                    {admin && (
                        <div className="mb-6 p-3 bg-gray-700 rounded-lg">
                            <div className="flex items-center">
                                <div className="bg-blue-500 text-white rounded-full h-10 w-10 flex items-center justify-center mr-3">
                                    {admin.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-white font-medium">{admin.name}</div>
                                    <div className="text-gray-400 text-sm">{admin.role}</div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="mb-8">
                        <p className="text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider">Quản lý</p>
                        <ul className="space-y-2">
                            <li>
                                <Link 
                                    to="/dashboard" 
                                    className={`flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-2 rounded-md ${isActiveRoute('/dashboard')}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                    </svg>
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    to="/book" 
                                    className={`flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-2 rounded-md ${isActiveRoute('/book')}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                    </svg>
                                    Quản Lý Sách
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    to="/category" 
                                    className={`flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-2 rounded-md ${isActiveRoute('/category')}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                                    </svg>
                                    Quản Lý Danh Mục
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    to="/user" 
                                    className={`flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-2 rounded-md ${isActiveRoute('/user')}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                    </svg>
                                    Quản Lý Người Dùng
                                </Link>
                            </li>
                        </ul>
                    </div>
                    
                    <div>
                        <p className="text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider">Hệ thống</p>
                        <ul className="space-y-2">
                            <li>
                                <button 
                                    onClick={handleLogout}
                                    className="flex items-center w-full text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-2 rounded-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 3a1 1 0 10-2 0v6.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 12.586V6z" clipRule="evenodd" />
                                    </svg>
                                    Đăng Xuất
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        </div>
    );
}