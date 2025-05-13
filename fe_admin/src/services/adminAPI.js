import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8001/api';

// Create axios instance with credentials
const authAxios = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Important for Sanctum authentication
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Add a request interceptor to include the token
authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const adminAPI = {
  login: async (email, password) => {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, { 
        email, 
        password 
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        withCredentials: true
      });
      
      if (response.data.success) {
        // Extract token and user data
        const { token, user } = response.data;
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(user));
        return { token, user };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error.response?.data || error;
    }
  },

  logout: async () => {
    try {
      const response = await authAxios.post('/auth/logout');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      return response.data;
    } catch (error) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      throw error.response?.data || error;
    }
  },

  checkAuth: async () => {
    try {
      const response = await authAxios.get('/auth/user');
      return response.data.user;
    } catch (error) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      throw error.response?.data || error;
    }
  },

  // Dashboard
  getDashboardStats: async () => {
    try {
      const response = await authAxios.get('/dashboard');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Books
  getBooks: async (params = {}) => {
    try {
      const response = await authAxios.get('/books', { params });
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getBook: async (id) => {
    try {
      const response = await authAxios.get(`/books/${id}`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  createBook: async (bookData) => {
    try {
      const formData = new FormData();
      
      // Append all book data to FormData
      Object.keys(bookData).forEach(key => {
        formData.append(key, bookData[key]);
      });
      
      const response = await authAxios.post('/books', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateBook: async (id, bookData) => {
    try {
      const formData = new FormData();
      
      // Append all book data to FormData
      Object.keys(bookData).forEach(key => {
        formData.append(key, bookData[key]);
      });
      
      // Add the _method field for Laravel to understand it's a PUT request
      formData.append('_method', 'PUT');
      
      const response = await authAxios.post(`/books/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deleteBook: async (id) => {
    try {
      const response = await authAxios.delete(`/books/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default adminAPI; 