import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Đăng nhập
export const login = async (email, password, deviceName = '', enableAutoLogin = true) => {
  try {
    console.log('Sending login request to:', `${API_URL}/dang-nhap`);
    console.log('Auto login enabled:', enableAutoLogin);
    
    const requestBody = { 
      email, 
      password 
    };
    
    if (deviceName) {
      requestBody.device_name = deviceName;
    }
    
    const response = await fetch(`${API_URL}/dang-nhap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Login response raw:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return { success: false, message: 'Lỗi phân tích dữ liệu từ server' };
    }
    
    console.log('Login response data:', data);

    if ((data.success === true || data.status === true) && data.token) {
      // Lưu token và thông tin user
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('email', email);
      
      // Lưu trạng thái tự động đăng nhập và thời gian đăng nhập
      if (enableAutoLogin) {
        await AsyncStorage.setItem('autoLogin', 'true');
        await AsyncStorage.setItem('lastLoginTime', new Date().toISOString());
      } else {
        await AsyncStorage.removeItem('autoLogin');
        await AsyncStorage.removeItem('lastLoginTime');
      }
      
      // Lưu user_id nếu có
      if (data.user_id) {
        await AsyncStorage.setItem('user_id', data.user_id);
      }
      
      // Xử lý thông tin user
      let userData = null;
      if (data.user) {
        userData = data.user;
      } else if (data.ten_user) {
        userData = {
          name: data.ten_user,
          email: email,
          user_id: data.user_id
        };
      }
      
      if (userData) {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        console.log('User data saved:', userData);
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
      // Xóa tất cả thông tin đăng nhập cũ
      await AsyncStorage.multiRemove([
        'token',
        'authToken',
        'user',
        'email',
        'user_id',
        'autoLogin',
        'lastLoginTime'
      ]);
      
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
    // Lấy token để gọi API đăng xuất
    const token = await AsyncStorage.getItem('token');
    
    if (token) {
      try {
        // Gọi API đăng xuất
        await fetch(`${API_URL}/dang-xuat`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (apiError) {
        console.error('Logout API error:', apiError);
      }
    }

    // Xóa tất cả thông tin đăng nhập
    await AsyncStorage.multiRemove([
      'token',
      'authToken',
      'user',
      'user_id',
      'email',
      'autoLogin',
      'lastLoginTime'
    ]);

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

// Kiểm tra trạng thái đăng nhập
export const checkAuthStatus = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      return { isLoggedIn: false };
    }

    const response = await fetch(`${API_URL}/user`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      await AsyncStorage.multiRemove([
        'token',
        'authToken',
        'user',
        'email',
        'user_id'
      ]);
      return { isLoggedIn: false, error: `JSON Parse error: ${parseError.message}` };
    }

    if (data.status && data.user) {
      // Lấy user_id từ phản hồi API
      const userId = data.user.user_id;
      
      if (!userId) {
        console.error('API /user không trả về user_id. Vui lòng kiểm tra ứng dụng phía server.');
        await AsyncStorage.multiRemove([
          'token',
          'authToken',
          'user',
          'email',
          'user_id'
        ]);
        return { isLoggedIn: false, error: 'Không nhận được ID người dùng từ API' };
      }
      
      // Cập nhật thông tin user và user_id
      const userData = data.user;
      
      // Lưu user_id
      await AsyncStorage.setItem('user_id', userId);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      console.log('Auth check successful, user_id:', userId);
      return { isLoggedIn: true, user: userData };
    } else {
      // Token không hợp lệ
      await AsyncStorage.multiRemove([
        'token',
        'authToken',
        'user',
        'email',
        'user_id'
      ]);
      return { isLoggedIn: false };
    }
  } catch (error) {
    console.error('Auth check error:', error);
    await AsyncStorage.multiRemove([
      'token',
      'authToken',
      'user',
      'email',
      'user_id'
    ]);
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

    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return { success: false, message: 'Lỗi phân tích dữ liệu từ server' };
    }

    if (data.status === true) {
      // Lưu lại email để có thể điền sẵn ở trang login
      await AsyncStorage.setItem('last_email', email);
      
      return { 
        success: true, 
        message: data.message || 'Yêu cầu đặt lại mật khẩu đã được gửi thành công' 
      };
    } else {
      return { success: false, message: data.message || 'Yêu cầu đặt lại mật khẩu thất bại' };
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return { success: false, message: 'Có lỗi xảy ra: ' + error.message };
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

// Kiểm tra thông tin đăng nhập trước đó
export const getPreviousLoginInfo = async () => {
  try {
    // Kiểm tra xem có đang bật tự động đăng nhập không
    const autoLogin = await AsyncStorage.getItem('autoLogin');
    if (autoLogin !== 'true') {
      console.log('Auto login is disabled');
      return { hasLogin: false };
    }

    // Kiểm tra thời gian đăng nhập cuối
    const lastLoginTime = await AsyncStorage.getItem('lastLoginTime');
    if (!lastLoginTime) {
      console.log('No last login time found');
      return { hasLogin: false };
    }

    // Kiểm tra xem phiên đăng nhập có hết hạn chưa (72 giờ)
    const lastLogin = new Date(lastLoginTime);
    const now = new Date();
    const hoursDiff = (now - lastLogin) / (1000 * 60 * 60);
    
    if (hoursDiff > 72) {
      console.log('Login session expired');
      // Xóa thông tin đăng nhập cũ
      await AsyncStorage.multiRemove(['token', 'authToken', 'autoLogin', 'lastLoginTime']);
      return { hasLogin: false, needReauth: true, message: 'Phiên đăng nhập đã hết hạn' };
    }

    // Lấy token và email
    const [token, email] = await Promise.all([
      AsyncStorage.getItem('token'),
      AsyncStorage.getItem('email')
    ]);

    if (!token || !email) {
      console.log('Missing token or email');
      return { hasLogin: false };
    }

    // Lấy thông tin user
    const userJson = await AsyncStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;

    return {
      hasLogin: true,
      token,
      email,
      user
    };
  } catch (error) {
    console.error('Error checking previous login:', error);
    return { hasLogin: false, error: error.message };
  }
};

// Get authentication token
export const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('Get auth token error:', error);
    return null;
  }
};

// Đổi mật khẩu
export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      return { success: false, message: 'Bạn chưa đăng nhập' };
    }

    const response = await fetch(`${API_URL}/doi-mat-khau`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword 
      }),
    });

    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return { success: false, message: 'Lỗi phân tích dữ liệu từ server' };
    }

    if (data.status) {
      return { success: true, message: data.message || 'Đổi mật khẩu thành công' };
    } else {
      throw new Error(data.message || 'Đổi mật khẩu thất bại');
    }
  } catch (error) {
    // console.error('Change password error:', error);
    return { success: false, message: error.message };
  }
};

// Cập nhật thông tin người dùng
export const updateUserInfo = async (userData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      return { success: false, message: 'Bạn chưa đăng nhập' };
    }

    const response = await fetch(`${API_URL}/cap-nhat-thong-tin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return { success: false, message: 'Lỗi phân tích dữ liệu từ server' };
    }

    if (data.status) {
      // Cập nhật thông tin user trong AsyncStorage
      if (data.user) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
      }
      return { success: true, message: data.message || 'Cập nhật thông tin thành công', user: data.user };
    } else {
      throw new Error(data.message || 'Cập nhật thông tin thất bại');
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Tạo đối tượng chứa tất cả các hàm
const authService = {
  login,
  register,
  logout,
  checkAuthStatus,
  forgotPassword,
  changePassword,
  updateUserInfo,
  getUserInfo,
  getPreviousLoginInfo,
  getAuthToken
};

// Export default để sửa lỗi "missing required default export"
export default authService; 