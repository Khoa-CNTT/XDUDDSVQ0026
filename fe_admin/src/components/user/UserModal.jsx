import React, { useState, useEffect } from 'react';

export default function UserModal({ isOpen, onClose, onSave, user, mode }) {
    const [formData, setFormData] = useState({
        name_user: '',
        email: '',
        password: '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name_user: user.name_user || '',
                email: user.email || '',
                password: '', // Don't show password
            });
        } else {
            setFormData({
                name_user: '',
                email: '',
                password: '',
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const isReadOnly = mode === 'view';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="relative w-full max-w-lg p-6 mx-auto my-8 bg-white rounded-lg shadow-xl z-10">
                <div className="flex items-start justify-between pb-3 border-b">
                    <h3 className="text-xl font-semibold">
                        {mode === 'edit' ? 'Sửa Người Dùng' : 'Thông Tin Người Dùng'}
                    </h3>
                    <button
                        className="text-gray-400 hover:text-gray-500"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name_user">
                            Họ Và Tên
                        </label>
                        <input
                            type="text"
                            id="name_user"
                            name="name_user"
                            value={formData.name_user}
                            onChange={handleChange}
                            readOnly={isReadOnly}
                            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isReadOnly ? 'bg-gray-100' : ''}`}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            readOnly={isReadOnly}
                            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isReadOnly ? 'bg-gray-100' : ''}`}
                            required
                        />
                    </div>

                    {mode !== 'view' && (
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                                Mật Khẩu Mới (để trống nếu không đổi)
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        </div>
                    )}

                    {user && (
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                User ID
                            </label>
                            <input
                                type="text"
                                value={user.user_id}
                                readOnly
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-500 bg-gray-100 leading-tight"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                        >
                            Đóng
                        </button>
                        {!isReadOnly && (
                            <button
                                type="submit"
                                className="px-4 py-2 ml-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
                            >
                                Cập Nhật
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
} 