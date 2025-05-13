import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

// Lấy danh sách thể loại
export const getAllCategories = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/categories`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || "Failed to fetch categories");
    }
  } catch (error) {
    console.error("Get categories error:", error);
    return { success: false, message: error.message };
  }
};

// Lấy chi tiết thể loại
export const getCategoryDetails = async (categoryId) => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/categories/${categoryId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || "Failed to fetch category details");
    }
  } catch (error) {
    console.error("Get category details error:", error);
    return { success: false, message: error.message };
  }
};

// Tạo đối tượng chứa tất cả các hàm
const categoryService = {
  getAllCategories,
  getCategoryDetails,
};

// Export default để sửa lỗi "missing required default export"
export default categoryService;
