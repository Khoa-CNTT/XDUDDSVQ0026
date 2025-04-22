import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Lấy danh sách sách
export const getAllBooks = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    const response = await fetch(`${API_URL}/books`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || 'Failed to fetch books');
    }
  } catch (error) {
    console.error('Get books error:', error);
    return { success: false, message: error.message };
  }
};

// Lấy sách miễn phí
export const getFreeBooks = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    const response = await fetch(`${API_URL}/books/free`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || 'Failed to fetch free books');
    }
  } catch (error) {
    console.error('Get free books error:', error);
    return { success: false, message: error.message };
  }
};

// Lấy sách có phí
export const getPaidBooks = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    const response = await fetch(`${API_URL}/books/paid`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || 'Failed to fetch paid books');
    }
  } catch (error) {
    console.error('Get paid books error:', error);
    return { success: false, message: error.message };
  }
};

// Tìm kiếm sách
export const searchBooks = async (query) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    const response = await fetch(`${API_URL}/books/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || 'Failed to search books');
    }
  } catch (error) {
    console.error('Search books error:', error);
    return { success: false, message: error.message };
  }
};

// Lấy chi tiết sách
export const getBookDetails = async (bookId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    const response = await fetch(`${API_URL}/books/${bookId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || 'Failed to fetch book details');
    }
  } catch (error) {
    console.error('Get book details error:', error);
    return { success: false, message: error.message };
  }
};

// Tạo đối tượng chứa tất cả các hàm
const bookService = {
  getAllBooks,
  getFreeBooks,
  getPaidBooks,
  searchBooks,
  getBookDetails
};

// Export default để sửa lỗi "missing required default export"
export default bookService; 