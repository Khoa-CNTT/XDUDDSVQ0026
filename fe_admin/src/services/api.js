// API Service for Book Management Admin Panel
const API_URL = 'http://127.0.0.1:8001/api';

// Helper function to extract data from Laravel response format
const extractData = (response) => {
  if (!response) return [];
  
  console.log('Processing API response:', response);
  
  // Handle Laravel's {success: true, data: [...]} format
  if (response.success === true && response.data) {
    return response.data;
  }
  
  // Handle the case where response.data is inside the "data" object of pagination
  if (response.data && response.data.data) {
    return response.data.data;
  }
  
  // Legacy format {status: true, data: [...]}
  if (response.status === true && response.data) {
    return response.data;
  }
  
  // Already a direct array
  if (Array.isArray(response)) {
    return response;
  }
  
  // Return the object itself if it doesn't match other formats
  console.warn('Unexpected response format:', response);
  return response;
};

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('adminToken');
};

// Generic fetch wrapper with improved error handling
export const fetchAPI = async (endpoint, options = {}) => {
    try {
        const adminToken = localStorage.getItem('admin_token');
        // Make sure we use the full API URL by combining the API_URL with the endpoint
        const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}),
                ...(options.headers || {})
            },
            credentials: 'omit'  // Không gửi cookies - tắt hoàn toàn CSRF
        };

        const fetchOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        if (options.data) {
            fetchOptions.body = JSON.stringify(options.data);
            delete fetchOptions.data;
        }

        console.log(`Fetching ${url} with options:`, fetchOptions);
        
        const response = await fetch(url, fetchOptions);
        
        // Get the response content type
        const contentType = response.headers.get('content-type');
        let data;
        
        // Parse response based on content type
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
            // Try to check if it's JSON anyway
            try {
                data = JSON.parse(data);
            } catch (e) {
                // It's truly not JSON, leave it as text
            }
        }
        
        console.log(`Response from ${url}:`, data);
        
        // Handle error responses
        if (!response.ok) {
            const error = new Error(
                typeof data === 'object' && data.message
                    ? data.message
                    : `HTTP error! status: ${response.status}`
            );
            
            // Attach the response and data to the error for more details
            error.status = response.status;
            error.response = response;
            error.data = data;
            
            console.error(`API Error (${response.status}):`, data);
            throw error;
        }
        
        // Return success status if not already included
        if (data.success === undefined && typeof data === 'object') {
            return { success: true, data: data };
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// User related API calls
export const userAPI = {
  getAllUsers: async () => {
    try {
      // Use Laravel user endpoint (requires auth normally)
      const response = await fetchAPI('/users', { method: 'GET' });
      console.log('Raw users response:', response);
      return extractData(response);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return []; // Return empty array on error
    }
  },
  
  getUserDetails: async (userId) => {
    try {
      const response = await fetchAPI(`/users/${userId}`, { method: 'GET' });
      return extractData(response);
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
      return null;
    }
  },
  
  createUser: async (userData) => {
    try {
      return await fetchAPI('/dang-ky', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },
  
  updateUser: async (userId, userData) => {
    try {
      console.log('Updating user with ID:', userId, 'Type:', typeof userId);
      
      // Sử dụng endpoint users (số nhiều) theo format API đang sử dụng
      console.log('API URL:', `${API_URL}/users/${userId}`);
      console.log('Updating user with data:', userData);
      
      // Add _method field for Laravel to understand it's a PUT request
      const processedData = {
        ...userData,
        _method: 'PUT'
      };
      
      // Nếu mật khẩu trống, loại bỏ trường password
      if (!processedData.password || processedData.password.trim() === '') {
        delete processedData.password;
      }
      
      // Loại bỏ trường device_type nếu không cần thiết
      if (processedData.device_type === 'web' || !processedData.device_type) {
        delete processedData.device_type;
      }
      
      // Thử với cả 2 cách - truyền user_id trong URL và trong body
      // Có thể backend không nhận user_id từ URL mà cần từ body request
      processedData.id = userId; 
      
      // Gửi request tới đúng endpoint dựa trên API Laravel
      const response = await fetchAPI(`/users/${userId}`, {
        method: 'POST', // Use POST with _method=PUT for better compatibility
        data: processedData
      });
      
      console.log('User update response:', response);
      
      if (!response.success && response.message) {
        throw new Error(response.message || 'Failed to update user');
      }
      
      return response.data || response;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  },
  
  deleteUser: async (userId) => {
    try {
      return await fetchAPI(`/users/${userId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }
};

// Book related API calls
export const bookAPI = {
  getAllBooks: async () => {
    try {
      // Use Laravel books endpoint
      const response = await fetchAPI('/books', { method: 'GET' });
      return extractData(response);
    } catch (error) {
      console.error('Failed to fetch books:', error);
      return []; // Return empty array on error
    }
  },
  
  getBookDetails: async (bookId) => {
    try {
      const response = await fetchAPI(`/books/${bookId}`, { method: 'GET' });
      return extractData(response);
    } catch (error) {
      console.error(`Failed to fetch book ${bookId}:`, error);
      return null;
    }
  },
  
  createBook: async (bookData) => {
    try {
      console.log('Creating book with data:', bookData);
      
      // Ensure required fields
      if (!bookData.name_book) throw new Error('Book name is required');
      if (!bookData.author_id) throw new Error('Author is required');
      if (!bookData.category_id) throw new Error('Category is required');
      
      // Convert numbers and booleans properly
      const processedData = {
        ...bookData,
        price: bookData.is_free ? 0 : (parseFloat(bookData.price) || 0),
        pages: bookData.pages ? parseInt(bookData.pages, 10) : null,
        is_free: !!bookData.is_free
      };
      
      const response = await fetchAPI('/books', {
        method: 'POST',
        data: processedData
      });
      
      console.log('Book creation response:', response);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to create book');
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to create book:', error);
      throw error;
    }
  },
  
  updateBook: async (bookId, bookData) => {
    try {
      return await fetchAPI(`/books/${bookId}`, {
        method: 'PUT',
        data: bookData
      });
    } catch (error) {
      console.error('Failed to update book:', error);
      throw error;
    }
  },
  
  deleteBook: async (bookId) => {
    try {
      return await fetchAPI(`/books/${bookId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete book:', error);
      throw error;
    }
  },
  
  uploadBook: async (formData) => {
    try {
      const adminToken = localStorage.getItem('admin_token');
      const headers = {};
      
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
      
      headers['X-Requested-With'] = 'XMLHttpRequest';
      
      console.log("Uploading book file to API:", `${API_URL}/books/upload`);
      
      const response = await fetch(`${API_URL}/books/upload`, {
        method: 'POST',
        headers,
        body: formData, // Note: No Content-Type header for multipart/form-data
        credentials: 'omit'  // No cookies needed
      });
      
      console.log("Upload response status:", response.status);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          console.error("Upload error response:", error);
          throw new Error(error.message || 'Upload failed');
        } else {
          const text = await response.text();
          console.error("Upload error text:", text);
          throw new Error(`Upload failed: ${response.status}`);
        }
      }
      
      const result = await response.json();
      console.log("Upload success response:", result);
      return result;
    } catch (error) {
      console.error('Failed to upload book:', error);
      throw error;
    }
  }
};

// Category related API calls
export const categoryAPI = {
  getAllCategories: async () => {
    try {
      // Use Laravel categories endpoint
      const response = await fetchAPI('/categories', { method: 'GET' });
      return extractData(response);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return []; // Return empty array on error
    }
  },
  
  getCategoryDetails: async (categoryId) => {
    try {
      const response = await fetchAPI(`/categories/${categoryId}`, { method: 'GET' });
      return extractData(response);
    } catch (error) {
      console.error(`Failed to fetch category ${categoryId}:`, error);
      return null;
    }
  },
  
  createCategory: async (categoryData) => {
    try {
      console.log('API createCategory called with data:', categoryData);
      
      const response = await fetchAPI('/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData)
      });
      
      console.log('API createCategory response:', response);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to create category');
      }
      
      return response;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  },
  
  updateCategory: async (categoryId, categoryData) => {
    try {
      return await fetchAPI(`/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(categoryData)
      });
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  },
  
  deleteCategory: async (categoryId) => {
    try {
      return await fetchAPI(`/categories/${categoryId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  }
};

// Author related API calls
export const authorAPI = {
  getAllAuthors: async () => {
    try {
      console.log('Fetching all authors...');
      // Use Laravel authors endpoint 
      const response = await fetchAPI('/authors', { method: 'GET' });
      console.log('Raw authors response:', response);
      
      const extractedData = extractData(response);
      console.log('Extracted authors data:', extractedData);
      
      return extractedData;
    } catch (error) {
      console.error('Failed to fetch authors:', error);
      alert('Error loading authors: ' + error.message);
      return []; // Return empty array on error
    }
  },
  
  searchAuthors: async (query) => {
    try {
      const response = await fetchAPI(`/authors/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
      return extractData(response);
    } catch (error) {
      console.error('Failed to search authors:', error);
      return [];
    }
  },
  
  getAuthorDetails: async (authorId) => {
    try {
      const response = await fetchAPI(`/authors/${authorId}`, { method: 'GET' });
      return extractData(response);
    } catch (error) {
      console.error(`Failed to fetch author ${authorId}:`, error);
      return null;
    }
  },
  
  createAuthor: async (authorData) => {
    try {
      return await fetchAPI('/authors', {
        method: 'POST',
        body: JSON.stringify(authorData)
      });
    } catch (error) {
      console.error('Failed to create author:', error);
      throw error;
    }
  },
  
  updateAuthor: async (authorId, authorData) => {
    try {
      return await fetchAPI(`/authors/${authorId}`, {
        method: 'PUT',
        body: JSON.stringify(authorData)
      });
    } catch (error) {
      console.error('Failed to update author:', error);
      throw error;
    }
  },
  
  deleteAuthor: async (authorId) => {
    try {
      return await fetchAPI(`/authors/${authorId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete author:', error);
      throw error;
    }
  }
};

// Admin API calls
export const adminAPI = {
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!data.status) {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to login:', error);
      throw error;
    }
  },
  
  checkAdmin: async () => {
    try {
      const token = getAuthToken();
      if (!token) return { status: false };
      
      const response = await fetch(`${API_URL}/admin/check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      return await response.json();
    } catch (error) {
      console.error('Failed to check admin:', error);
      return { status: false };
    }
  },
  
  logout: async () => {
    try {
      localStorage.removeItem('adminToken');
      return { status: true };
    } catch (error) {
      console.error('Failed to logout:', error);
      localStorage.removeItem('adminToken');
      return { status: false };
    }
  },
  
  getProfile: async () => {
    try {
      const response = await fetchAPI('/admin/profile', { method: 'GET' });
      return extractData(response);
    } catch (error) {
      console.error('Failed to fetch admin profile:', error);
      return null;
    }
  }
};

const apiService = {
  user: userAPI,
  book: bookAPI,
  category: categoryAPI,
  author: authorAPI,
  admin: adminAPI
};

export default apiService; 