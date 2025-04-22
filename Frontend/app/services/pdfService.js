import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { API_URL } from '../config';

// Lấy danh sách PDF
export const getAllPDFs = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    const response = await fetch(`${API_URL}/pdfs`, {
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
      throw new Error(data.message || 'Failed to fetch PDFs');
    }
  } catch (error) {
    console.error('Get PDFs error:', error);
    return { success: false, message: error.message };
  }
};

// Tải lên PDF
export const uploadPDF = async (fileUri, fileName, title, description = '') => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    // Tạo FormData
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'application/pdf'
    });
    
    formData.append('title', title || fileName);
    
    if (description) {
      formData.append('description', description);
    }
    
    const response = await fetch(`${API_URL}/pdfs/upload`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, data: data.data, message: 'PDF uploaded successfully' };
    } else {
      throw new Error(data.message || 'Failed to upload PDF');
    }
  } catch (error) {
    console.error('Upload PDF error:', error);
    return { success: false, message: error.message };
  }
};

// Lấy chi tiết PDF
export const getPDFDetails = async (pdfId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
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
      throw new Error(data.message || 'Failed to fetch PDF details');
    }
  } catch (error) {
    console.error('Get PDF details error:', error);
    return { success: false, message: error.message };
  }
};

// Cập nhật thông tin PDF
export const updatePDF = async (pdfId, updateData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, data: data.data, message: 'PDF updated successfully' };
    } else {
      throw new Error(data.message || 'Failed to update PDF');
    }
  } catch (error) {
    console.error('Update PDF error:', error);
    return { success: false, message: error.message };
  }
};

// Xóa PDF
export const deletePDF = async (pdfId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, message: 'PDF deleted successfully' };
    } else {
      throw new Error(data.message || 'Failed to delete PDF');
    }
  } catch (error) {
    console.error('Delete PDF error:', error);
    return { success: false, message: error.message };
  }
};

// Tải PDF từ server
export const downloadPDF = async (pdfId, customFileName = null) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('Unauthorized. Please login.');
    }
    
    // Lấy thông tin PDF trước khi tải
    const pdfDetails = await getPDFDetails(pdfId);
    
    if (!pdfDetails.success) {
      throw new Error('Failed to get PDF details for download');
    }
    
    const fileName = customFileName || pdfDetails.data.title || `pdf_${pdfId}.pdf`;
    const fileLocation = `${FileSystem.documentDirectory}${fileName}.pdf`;
    
    // Kiểm tra xem file đã tồn tại chưa
    const fileInfo = await FileSystem.getInfoAsync(fileLocation);
    
    if (fileInfo.exists) {
      return { success: true, uri: fileInfo.uri, message: 'File already exists' };
    }
    
    // Bắt đầu tải file
    const downloadResumable = FileSystem.createDownloadResumable(
      `${API_URL}/pdfs/${pdfId}/download`,
      fileLocation,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const { uri } = await downloadResumable.downloadAsync();
    
    return { success: true, uri, message: 'PDF downloaded successfully' };
  } catch (error) {
    console.error('Download PDF error:', error);
    return { success: false, message: error.message };
  }
};

// Tạo đối tượng chứa tất cả các hàm
const pdfService = {
  getAllPDFs,
  uploadPDF,
  getPDFDetails,
  updatePDF,
  deletePDF,
  downloadPDF
};

// Export default để sửa lỗi "missing required default export"
export default pdfService; 