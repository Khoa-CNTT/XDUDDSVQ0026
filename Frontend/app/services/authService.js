import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Đăng nhập
export const login = async (email, password, deviceName = '') => {
  try {
    console.log('Sending login request to:', `${API_URL}/dang-nhap`);
    
    // Prepare request body
    const requestBody = { 
      email, 
      password 
    };
    
    // Add device_name if provided
    if (deviceName) {
      requestBody.device_name = deviceName;
    }
    
    // Gọi API đăng nhập thực tế
    const response = await fetch(`${API_URL}/dang-nhap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Lấy response dưới dạng text trước
    const responseText = await response.text();
    console.log('Login response raw:', responseText);
    
    // Convert to JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return { success: false, message: 'Lỗi phân tích dữ liệu từ server' };
    }
    
    console.log('Login response data:', data);

    // Kiểm tra cả success và status để tương thích với nhiều API khác nhau
    if ((data.success === true || data.status === true) && data.token) {
      // Lưu token vào AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      console.log('Token saved:', data.token);
      
      // Lưu token vào authToken để tương thích với code cũ
      await AsyncStorage.setItem('authToken', data.token);

      // Lưu email đã đăng nhập
      await AsyncStorage.setItem('email', email);
      console.log('Email saved:', email);
      
      // Lưu thông tin user nếu có
      let userData = null;
      if (data.user) {
        userData = data.user;
      } else if (data.ten_user) {
        // Tạo đối tượng user từ ten_user nếu không có đối tượng user đầy đủ
        userData = {
          name: data.ten_user,
          email: email // Sử dụng email đã nhập
        };
      }
      
      if (userData) {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        console.log('User data saved:', userData);
      } else {
        console.log('No user data available to save');
      }
      
      return { 
        success: true, 
        user: userData,
        token: data.token,
        message: data.message || 'Đăng nhập thành công' 
      };
    } else {
      return { 
        success: false,
        message: data.message || 'Email hoặc mật khẩu không chính xác'
      };
    }
  } catch (error) {
    console.error('Login fetch error:', error);
    return { 
      success: false,
      message: error.message || 'Có lỗi xảy ra khi kết nối đến server'
    };
  }
};

// Đăng ký
export const register = async (userData) => {
  try {
    console.log('Sending register request to:', `${API_URL}/dang-ky`);
    console.log('Register data:', userData);
    
    const response = await fetch(`${API_URL}/dang-ky`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    // Get response as text first to handle potential HTML responses
    const responseText = await response.text();
    console.log('Register response raw:', responseText);
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return { success: false, message: 'Lỗi phân tích dữ liệu từ server' };
    }
    
    console.log('Register response data:', data);

    if (data.success || data.status) {
      return { success: true, message: data.message || 'Đăng ký thành công' };
    } else {
      throw new Error(data.message || 'Đăng ký thất bại');
    }
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, message: error.message };
  }
};

// Đăng xuất
export const logout = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Không tìm thấy token');
    }

    const response = await fetch(`${API_URL}/dang-xuat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    // Xóa token và thông tin user trong AsyncStorage
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');

    return { success: true, message: data.message || 'Đăng xuất thành công' };
  } catch (error) {
    console.error('Logout error:', error);
    
    // Xóa token và thông tin user trong AsyncStorage dù có lỗi
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    
    return { success: false, message: error.message };
  }
};

// Kiểm tra trạng thái đăng nhập
export const checkAuthStatus = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      return { isLoggedIn: false };
    }

    // Lấy thông tin user từ API
    const response = await fetch(`${API_URL}/user`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    // Get response as text first to handle potential HTML responses
    const responseText = await response.text();
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // The server might be returning HTML or an invalid response
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      return { isLoggedIn: false, error: `JSON Parse error: ${parseError.message}` };
    }

    if (data.success) {
      // Cập nhật thông tin user trong AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      return { isLoggedIn: true, user: data.user };
    } else {
      // Token không hợp lệ, xóa token
      console.log('Token không hợp lệ, đang xóa...');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      return { isLoggedIn: false };
    }
  } catch (error) {
    console.error('Auth check error:', error);
    // Có lỗi xảy ra, xóa token để an toàn
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    return { isLoggedIn: false, error: error.message };
  }
};

// Quên mật khẩu
export const forgotPassword = async (email) => {
  try {
    const response = await fetch(`${API_URL}/quen-mat-khau`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, message: data.message };
    } else {
      throw new Error(data.message || 'Yêu cầu đặt lại mật khẩu thất bại');
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return { success: false, message: error.message };
  }
};

// Lấy thông tin user
export const getUserInfo = async () => {
  try {
    const userString = await AsyncStorage.getItem('user');
    if (userString) {
      return JSON.parse(userString);
    }
    return null;
  } catch (error) {
    console.error('Get user info error:', error);
    return null;
  }
};

// Lấy thông tin đăng nhập trước đó
export const getPreviousLoginInfo = async () => {
  try {
    console.log('Getting previous login info...');
    const token = await AsyncStorage.getItem('token');
    console.log('Retrieved token:', token ? 'Token exists' : 'No token');
    
    const userString = await AsyncStorage.getItem('user');
    console.log('Retrieved user string:', userString ? 'User data exists' : 'No user data');
    
    // Nếu có token, lấy thông tin user từ API nếu không có trong local storage
    if (token) {
      // Nếu có user data trong local storage
      if (userString) {
        try {
          const user = JSON.parse(userString);
          console.log('User data parsed successfully:', user);
          return { 
            hasLogin: true, 
            token, 
            user 
          };
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          // Không return false ngay, thử lấy thông tin từ API
        }
      }
      
      // Nếu không có user data hoặc parse lỗi, thử lấy từ API
      try {
        console.log('Trying to get user info from API...');
        // Lấy thông tin user từ API
        const response = await fetch(`${API_URL}/user`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const responseText = await response.text();
        const data = JSON.parse(responseText);
        
        if (data.success && data.user) {
          // Lưu thông tin user mới vào AsyncStorage
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          console.log('User data retrieved from API and saved');
          return { 
            hasLogin: true, 
            token, 
            user: data.user 
          };
        } else {
          // Token không hợp lệ hoặc không lấy được thông tin user
          console.log('Could not retrieve user data from API');
        }
      } catch (apiError) {
        console.error('Error getting user info from API:', apiError);
        // Tiếp tục kiểm tra có email không
      }
      
      // Cuối cùng, nếu vẫn không có thông tin user đầy đủ nhưng có token,
      // tạo một đối tượng user giả với email từ AsyncStorage
      const email = await AsyncStorage.getItem('email');
      if (email) {
        const user = { email };
        console.log('Created minimal user object with email:', email);
        return { 
          hasLogin: true, 
          token, 
          user 
        };
      }
      
      // Nếu có token nhưng không thể lấy thông tin user, vẫn cho phép đăng nhập
      return { 
        hasLogin: true, 
        token, 
        user: { name: 'Người dùng' } 
      };
    }
    
    // Nếu không có token, không có đăng nhập trước đó
    console.log('No previous login detected');
    return { hasLogin: false };
  } catch (error) {
    console.error('Get previous login info error:', error);
    return { hasLogin: false, error: error.message };
  }
};

// Tạo đối tượng chứa tất cả các hàm
const authService = {
  login,
  register,
  logout,
  checkAuthStatus,
  forgotPassword,
  getUserInfo,
  getPreviousLoginInfo
};

// Export default để sửa lỗi "missing required default export"
export default authService; 