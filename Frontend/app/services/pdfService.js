import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { API_URL } from "../config";

// Thêm hàm getUserId riêng cho pdfService
const getUserId = async () => {
  try {
    // Lấy trực tiếp user_id (cách chính thức)
    const userId = await AsyncStorage.getItem("user_id");
    if (userId) {
      return userId;
    }

    console.error("❌ ERROR: Không tìm thấy user_id trong bộ nhớ!");
    console.error(
      "❌ Người dùng cần đăng xuất và đăng nhập lại để nhận user_id từ server"
    );

    // Thử kiểm tra token
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.error("❌ Token cũng không tồn tại, người dùng chưa đăng nhập");
    } else {
      console.error(
        "❌ Token tồn tại nhưng user_id không được lưu, API có thể không trả về user_id"
      );
    }

    // Trả về null để báo hiệu lỗi
    return null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
};

// Lấy danh sách PDF
export const getAllPDFs = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/pdfs`, {
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
      throw new Error(data.message || "Failed to fetch PDFs");
    }
  } catch (error) {
    console.error("Get PDFs error:", error);
    return { success: false, message: error.message };
  }
};

// Tải lên PDF
export const uploadPDF = async (fileUri, fileName, title, description = "") => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    // Tạo FormData
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: "application/pdf",
    });

    formData.append("title", title || fileName);

    if (description) {
      formData.append("description", description);
    }

    const response = await fetch(`${API_URL}/pdfs/upload`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        data: data.data,
        message: "PDF uploaded successfully",
      };
    } else {
      throw new Error(data.message || "Failed to upload PDF");
    }
  } catch (error) {
    console.error("Upload PDF error:", error);
    return { success: false, message: error.message };
  }
};

// Lấy chi tiết PDF
export const getPDFDetails = async (pdfId) => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
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
      throw new Error(data.message || "Failed to fetch PDF details");
    }
  } catch (error) {
    console.error("Get PDF details error:", error);
    return { success: false, message: error.message };
  }
};

// Cập nhật thông tin PDF
export const updatePDF = async (pdfId, updateData) => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        data: data.data,
        message: "PDF updated successfully",
      };
    } else {
      throw new Error(data.message || "Failed to update PDF");
    }
  } catch (error) {
    console.error("Update PDF error:", error);
    return { success: false, message: error.message };
  }
};

// Xóa PDF
export const deletePDF = async (pdfId) => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, message: "PDF deleted successfully" };
    } else {
      throw new Error(data.message || "Failed to delete PDF");
    }
  } catch (error) {
    console.error("Delete PDF error:", error);
    return { success: false, message: error.message };
  }
};

// Tải PDF từ server
export const downloadPDF = async (pdfId, customFileName = null) => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    // Lấy thông tin PDF trước khi tải
    const pdfDetails = await getPDFDetails(pdfId);

    if (!pdfDetails.success) {
      throw new Error("Failed to get PDF details for download");
    }

    const fileName =
      customFileName || pdfDetails.data.title || `pdf_${pdfId}.pdf`;
    const fileLocation = `${FileSystem.documentDirectory}${fileName}.pdf`;

    // Kiểm tra xem file đã tồn tại chưa
    const fileInfo = await FileSystem.getInfoAsync(fileLocation);

    if (fileInfo.exists) {
      return {
        success: true,
        uri: fileInfo.uri,
        message: "File already exists",
      };
    }

    // Bắt đầu tải file
    const downloadResumable = FileSystem.createDownloadResumable(
      `${API_URL}/pdfs/${pdfId}/download`,
      fileLocation,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const { uri } = await downloadResumable.downloadAsync();

    return { success: true, uri, message: "PDF downloaded successfully" };
  } catch (error) {
    console.error("Download PDF error:", error);
    return { success: false, message: error.message };
  }
};

// Thêm mới: Tải bản dịch PDF từ server
export const downloadTranslatedPDF = async (pdfId, customFileName = null) => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    // Lấy thông tin PDF trước khi tải
    const pdfDetails = await getPDFDetails(pdfId);

    if (!pdfDetails.success) {
      throw new Error("Failed to get PDF details for download");
    }

    // Kiểm tra xem có bản dịch không
    if (!pdfDetails.data.file_path_translate) {
      throw new Error("No translated version available for this PDF");
    }
    
    const fileName =
      customFileName || `${pdfDetails.data.title}_translated` || `pdf_${pdfId}_translated.pdf`;
    const fileLocation = `${FileSystem.documentDirectory}${fileName}.pdf`;

    // Kiểm tra xem file đã tồn tại chưa
    const fileInfo = await FileSystem.getInfoAsync(fileLocation);

    if (fileInfo.exists) {
      // Xóa file cũ để đảm bảo luôn tải bản mới nhất
      await FileSystem.deleteAsync(fileLocation, { idempotent: true });
      console.log("Deleted existing translated file to ensure fresh download");
    }

    console.log(`Downloading translated PDF to: ${fileLocation}`);

    // Bắt đầu tải file
    const downloadResumable = FileSystem.createDownloadResumable(
      `${API_URL}/pdfs/${pdfId}/download-translated`,
      fileLocation,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        console.log(`Translated PDF download progress: ${progress * 100}%`);
      }
    );

    const { uri } = await downloadResumable.downloadAsync();

    console.log("Translated PDF downloaded successfully:", uri);
    return { 
      success: true, 
      uri, 
      message: "Translated PDF downloaded successfully",
      isTranslated: true
    };
  } catch (error) {
    console.error("Download translated PDF error:", error);
    return { success: false, message: error.message };
  }
};

// Lưu tiến độ đọc PDF lên server
export const savePdfReadingProgress = async (
  pdfId,
  currentPage,
  totalPages
) => {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.log("❌ Không thể lưu tiến độ: không có user_id");
      return { success: false, error: "USER_NOT_AUTHENTICATED" };
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.log("❌ Không thể lưu tiến độ: không có token");
      return { success: false, error: "USER_NOT_AUTHENTICATED" };
    }

    // Validate pdfId
    if (!pdfId || typeof pdfId !== "string") {
      console.error("❌ pdf_id không hợp lệ:", pdfId);
      return {
        success: false,
        error: "INVALID_PDF_ID",
        message: "ID tài liệu không hợp lệ",
      };
    }

    // Parse và validate các tham số
    const currentPageInt = parseInt(currentPage, 10) || 1;
    const totalPagesInt = parseInt(totalPages, 10) || 1;
    const percentage = Math.floor((currentPageInt / totalPagesInt) * 100) || 0;

    // Lưu thông tin tiến độ vào local storage để hoạt động offline
    const progress = {
      page: currentPageInt,
      total: totalPagesInt,
      percentage,
      timestamp: new Date().toISOString(),
    };

    const key = `pdf_progress_${pdfId}`;
    await AsyncStorage.setItem(key, JSON.stringify(progress));

    console.log("📄 Gửi dữ liệu đọc PDF lên server:", {
      pdf_id: pdfId,
      current_page: currentPageInt,
      total_pages: totalPagesInt,
      percentage: percentage,
    });

    // Gửi lên server
    const response = await fetch(`${API_URL}/pdf-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pdf_id: pdfId,
        current_page: currentPageInt,
        total_pages: totalPagesInt,
        percentage: percentage,
      }),
    });

    const data = await response.json();

    if (data.status) {
      console.log("📄 Đã đồng bộ tiến độ đọc PDF lên server");
      console.log(
        `📄 Đã lưu tiến độ đọc PDF lên server thành công: ${percentage}%`
      );
      console.log(
        `📄 Đã cập nhật danh sách PDF đã xem cho người dùng ${userId}`
      );
      return { success: true, data: data.data };
    } else {
      console.error("❌ Lỗi khi đồng bộ tiến độ đọc PDF:", data.message);
      return { success: false, error: "SERVER_ERROR", message: data.message };
    }
  } catch (error) {
    console.error("Error saving PDF reading progress:", error);
    return { success: false, error: "NETWORK_ERROR", message: error.message };
  }
};

// Lấy lịch sử đọc PDF từ server
export const getRecentlyViewedPdfs = async () => {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.log(
        "❌ Không thể lấy danh sách tài liệu đã xem: không có user_id"
      );
      return { success: false, error: "USER_NOT_AUTHENTICATED" };
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.log("❌ Không thể lấy danh sách tài liệu đã xem: không có token");
      return { success: false, error: "USER_NOT_AUTHENTICATED" };
    }

    console.log(
      "📄 Đang lấy danh sách tài liệu đã xem cho người dùng:",
      userId
    );

    // Lấy từ API
    const response = await fetch(`${API_URL}/pdf-history`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        "❌ Lỗi khi lấy danh sách tài liệu đã xem:",
        errorData.message
      );
      return {
        success: false,
        error: "API_ERROR",
        message: errorData.message || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.status && Array.isArray(data.data)) {
      console.log(`📄 Đã lấy ${data.data.length} tài liệu đã xem từ server`);
      return { success: true, data: data.data };
    } else {
      console.error(
        "❌ Lỗi khi lấy danh sách tài liệu đã xem:",
        data.message || "Không có dữ liệu"
      );
      return {
        success: false,
        error: "INVALID_RESPONSE",
        message: data.message || "Dữ liệu không hợp lệ",
      };
    }
  } catch (error) {
    console.error("Error getting recently viewed PDFs:", error);
    return {
      success: false,
      error: "NETWORK_ERROR",
      message: error.message || "Lỗi kết nối mạng",
    };
  }
};

// Tạo đối tượng chứa tất cả các hàm
const pdfService = {
  getAllPDFs,
  uploadPDF,
  getPDFDetails,
  updatePDF,
  deletePDF,
  downloadPDF,
  downloadTranslatedPDF,
  savePdfReadingProgress,
  getRecentlyViewedPdfs,
};

// Export default để sửa lỗi "missing required default export"
export default pdfService;
