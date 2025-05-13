import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import UserTable from './UserTable';
import UserModal from './UserModal';

export default function User() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('view'); // 'view', 'edit' - removed 'create'

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userAPI.getAllUsers();
            console.log('Fetched users data:', data);
            
            // Đảm bảo user_id được xử lý đúng, làm việc với kiểu dữ liệu số và chuỗi
            const processedUsers = Array.isArray(data) ? data.map(user => ({
                ...user,
                // Đảm bảo user_id là chuỗi
                user_id: user.user_id !== undefined ? String(user.user_id) : user.id || ''
            })) : [];
            
            setUsers(processedUsers);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError('Failed to load users. Please try again later.');
            // For demo, use mock data if API fails
            setUsers([
                { user_id: '1', name_user: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com' },
                { user_id: '2', name_user: 'Trần Thị B', email: 'tranthib@gmail.com' },
                { user_id: '3', name_user: 'Lê Văn C', email: 'levanc@gmail.com' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleView = (user) => {
        setSelectedUser(user);
        setModalMode('view');
        setModalOpen(true);
    };

    const handleDelete = async (userId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
            try {
                await userAPI.deleteUser(userId);
                setUsers(users.filter(user => user.user_id !== userId));
                alert('Xóa người dùng thành công!');
            } catch (err) {
                console.error('Failed to delete user:', err);
                alert('Không thể xóa người dùng. Vui lòng thử lại sau.');
            }
        }
    };

    // Removed handleCreate function since we don't want admins to create users

    const handleSave = async (userData) => {
        try {
            // Removed the create case since we don't want admins to create users
            if (modalMode === 'edit') {
                // Tạo bản sao dữ liệu để xử lý
                const processedData = { ...userData };
                
                // Nếu email không thay đổi, loại bỏ trường email để tránh validation error
                if (processedData.email === selectedUser.email) {
                    delete processedData.email;
                }
                
                // Debug
                console.log('Selected user:', selectedUser);
                console.log('Trying to update user with ID:', selectedUser.user_id);
                
                // Đảm bảo user_id đúng định dạng - lấy từ thông tin hiện tại
                // Nếu ID trong DB là 0, chuyển sang chuỗi "0"
                const userId = selectedUser.user_id !== undefined ? String(selectedUser.user_id) : "0";
                
                await userAPI.updateUser(userId, processedData);
                
                // Cập nhật state người dùng trong list, nhưng giữ nguyên email nếu đã bị xóa
                const updatedUser = { 
                    ...selectedUser, 
                    ...processedData,
                    email: processedData.email || selectedUser.email  // Giữ lại email cũ nếu không có email mới
                };
                
                setUsers(users.map(user => 
                    user.user_id === selectedUser.user_id ? updatedUser : user
                ));
                
                alert('Cập nhật người dùng thành công!');
            }
            setModalOpen(false);
        } catch (err) {
            console.error('Failed to save user:', err);
            let errorMessage = 'Không thể lưu thông tin người dùng. ';
            
            // Hiển thị thông tin lỗi chi tiết nếu có
            if (err.data && err.data.errors) {
                const errors = err.data.errors;
                const errorDetails = Object.keys(errors)
                    .map(field => `${field}: ${errors[field].join(', ')}`)
                    .join('\n');
                errorMessage += `Lỗi: \n${errorDetails}`;
            } else {
                errorMessage += err.message || 'Vui lòng thử lại sau.';
            }
            
            alert(errorMessage);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Quản Lý Người Dùng</h1>
                {/* Removed "Thêm Người Dùng" button */}
            </div>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
                    <p>{error}</p>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <UserTable 
                    users={users} 
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                    onView={handleView}
                />
            )}

            {modalOpen && (
                <UserModal 
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                    user={selectedUser}
                    mode={modalMode}
                />
            )}
        </div>
    );
}