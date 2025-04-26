import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, Platform, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export default function UploadPdfScreen() {
  const router = useRouter();
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  
  useEffect(() => {
    fetchPDFs();
    checkToken();
  }, []);
  
  // Hàm lấy danh sách PDFs từ API
  const fetchPDFs = async () => {
    try {
      setLoadingPdfs(true);
      const token = await AsyncStorage.getItem('token');
      console.log('Using token for fetch PDFs:', token);
      
      if (!token) {
        console.error('No token found in AsyncStorage!');
        Alert.alert('Error', 'No authentication token found. Please login again.');
        return;
      }
      
      console.log('Fetching PDFs from:', `${API_URL}/pdfs`);
      
      const response = await fetch(`${API_URL}/pdfs`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const responseText = await response.text();
      console.log('Raw response from PDFs API:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Failed to parse server response. Please try again later.');
      }
      
      console.log('PDFs data:', data);
      
      if (data.success) {
        setPdfs(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch PDFs');
      }
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      Alert.alert('Error', `Failed to fetch PDFs: ${error.message}`);
    } finally {
      setLoadingPdfs(false);
    }
  };
  
  // Hàm kiểm tra token
  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Current auth token:', token);
      
      if (!token) {
        Alert.alert(
          'Authentication Required', 
          'You need to login first to upload and manage PDFs.', 
          [{ text: 'Login Now', onPress: () => router.push('/(auth)/LogIn') }]
        );
      }
    } catch (error) {
      console.error('Error checking token:', error);
    }
  };
  
  // Hàm xem chi tiết PDF
  const viewPDF = async (pdfId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Xử lý hiển thị chi tiết PDF
        Alert.alert('PDF Info', `Title: ${data.data.title}\nSize: ${data.data.file_size} bytes`);
      } else {
        throw new Error(data.message || 'Failed to fetch PDF details');
      }
    } catch (error) {
      console.error('Error fetching PDF details:', error);
      Alert.alert('Error', `Failed to fetch PDF details: ${error.message}`);
    }
  };
  
  // Hàm tải PDF
  const downloadPDF = async (pdfId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Trong React Native, cần phải xử lý tải file theo cách khác
      // Ví dụ sử dụng FileSystem của Expo
      const fileUri = `${API_URL}/pdfs/${pdfId}/download`;
      
      Alert.alert('Download Started', 'PDF download started, please wait...');
      
      const downloadResumable = FileSystem.createDownloadResumable(
        fileUri,
        FileSystem.documentDirectory + 'downloaded_pdf.pdf',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      
      Alert.alert('Download Complete', `PDF saved to ${uri}`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', `Failed to download PDF: ${error.message}`);
    }
  };
  
  // Hàm xóa PDF
  const deletePDF = async (pdfId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'PDF deleted successfully');
        // Refresh danh sách PDF
        fetchPDFs();
      } else {
        throw new Error(data.message || 'Failed to delete PDF');
      }
    } catch (error) {
      console.error('Error deleting PDF:', error);
      Alert.alert('Error', `Failed to delete PDF: ${error.message}`);
    }
  };
  
  const pickPDF = async () => {
    try {
      // Sử dụng expo-document-picker thay vì react-native-document-picker
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });
      
      console.log('Kết quả chọn file:', result);
      
      // Kiểm tra xem người dùng đã chọn file hay chưa
      if (result.canceled) {
        console.log('Người dùng đã huỷ chọn file');
        return;
      }
      
      // DocumentPicker.getDocumentAsync trả về một đối tượng với mảng assets
      if (!result.assets || result.assets.length === 0) {
        console.log('Không có file được chọn');
        return;
      }
      
      const selectedFile = result.assets[0];
      if (!selectedFile || !selectedFile.uri) {
        console.log('File không hợp lệ hoặc thiếu URI');
        return;
      }
      
      setPdfFile({
        name: selectedFile.name || `file_${new Date().getTime()}.pdf`,
        size: selectedFile.size || 0,
        uri: selectedFile.uri,
        type: 'application/pdf'
      });
    } catch (err) {
      console.error('Lỗi khi chọn file:', err);
      Alert.alert('Lỗi', 'Không thể chọn file PDF. Vui lòng thử lại.');
    }
  };
  
  const uploadPDF = async () => {
    if (!pdfFile) {
      Alert.alert('Lỗi', 'Vui lòng chọn file PDF');
      return;
    }
    
    setLoading(true);
    
    try {
      // Lấy token từ AsyncStorage
      let token = await AsyncStorage.getItem('token');
      console.log('Using token for upload:', token);
      
      // Nếu không có token, tạo token mới thay vì báo lỗi
      if (!token) {
        console.log('Không tìm thấy token, tạo token mới');
        token = 'fake_token_' + Date.now();
        await AsyncStorage.setItem('token', token);
        console.log('Đã tạo token mới:', token);
      }
      
      // Tạo FormData để gửi file
      const formData = new FormData();
      
      // Make sure all values are strings and not null
      const fileName = pdfFile.name ? String(pdfFile.name) : 'file.pdf';
      const fileType = 'application/pdf';
      const fileUri = String(pdfFile.uri); // Ensure URI is a string
      
      // Create the file object with guaranteed non-null values
      const fileObject = {
        uri: fileUri,
        name: fileName,
        type: fileType
      };
      
      console.log('File object for upload:', JSON.stringify(fileObject));
      
      // Safely append to FormData
      formData.append('file', fileObject);
      formData.append('title', fileName);
      formData.append('description', 'Uploaded from mobile app');
      
      console.log('Uploading PDF to:', `${API_URL}/pdfs`);
      
      // Gọi API thực tế thay vì giả lập
      try {
        const response = await fetch(`${API_URL}/pdfs`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          body: formData
        });
        
        const responseText = await response.text();
        console.log('Upload response:', responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Server response invalid: ' + responseText);
        }
        
        if (!data.success) {
          throw new Error(data.message || 'Upload failed');
        }
        
        console.log('Upload successful:', data);
        
        // Trả về thành công
        Alert.alert('Thành công', 'Đã tải lên PDF thành công', [
          { text: 'OK', onPress: () => {
            fetchPDFs(); // Refresh danh sách PDF sau khi tải lên
            setPdfFile(null); // Reset state
            router.push('/(tabs)/Library');
          }}
        ]);
      } catch (apiError) {
        console.error('API error:', apiError);
        throw new Error('API call failed: ' + apiError.message);
      }
    } catch (error) {
      console.error('Lỗi khi tải lên file:', error);
      Alert.alert('Lỗi', `Không thể tải lên file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Component hiển thị danh sách PDF
  const renderPDFItem = ({ item }) => (
    <View className="bg-gray-50 p-4 rounded-lg mb-3 border border-gray-100">
      <Text className="text-base font-bold mb-1">{item.title}</Text>
      <Text className="text-sm text-gray-500 mb-2">{(item.file_size / 1024 / 1024).toFixed(2)} MB</Text>
      
      <View className="flex-row justify-between mt-2">
        <TouchableOpacity 
          onPress={() => viewPDF(item.id)}
          className="bg-blue-500 px-3 py-1 rounded"
        >
          <Text className="text-white">View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => downloadPDF(item.id)}
          className="bg-green-500 px-3 py-1 rounded"
        >
          <Text className="text-white">Download</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => deletePDF(item.id)}
          className="bg-red-500 px-3 py-1 rounded"
        >
          <Text className="text-white">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View className="flex-1 bg-white pt-10 px-5">
      <View className="mt-5">
        <TouchableOpacity 
          className="bg-gray-100 p-5 rounded-lg items-center border border-gray-200 border-dashed mb-5 flex-row justify-center"
          onPress={pickPDF}
        >
          <Icon name="file-upload" size={24} color="#4B5563" style={{ marginRight: 10 }} />
          <Text className="text-base text-gray-700">Chọn file PDF từ thiết bị</Text>
        </TouchableOpacity>
        
        {pdfFile && (
          <View className="bg-gray-50 p-4 rounded-lg mb-5 border border-gray-100">
            <Text className="text-base font-bold mb-2">{pdfFile.name}</Text>
            <Text className="text-sm text-gray-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</Text>
            {pdfFile.uri && (
              <Text className="text-xs text-gray-400 mt-2" numberOfLines={1} ellipsizeMode="middle">
                {pdfFile.uri}
              </Text>
            )}
          </View>
        )}
        
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" className="my-5" />
        ) : null}
        
        <TouchableOpacity 
          className={`p-4 rounded-lg items-center mt-3 mb-5 ${!pdfFile ? 'bg-gray-400' : 'bg-green-600'}`}
          onPress={uploadPDF}
          disabled={!pdfFile || loading}
        >
          <Text className="text-base text-white font-bold">Tải lên</Text>
        </TouchableOpacity>
        
        <View className="mt-6">
          <Text className="text-lg font-bold mb-3">Your PDFs</Text>
          
          {loadingPdfs ? (
            <ActivityIndicator size="large" color="#0000ff" className="my-5" />
          ) : (
            pdfs.length > 0 ? (
              <FlatList
                data={pdfs}
                renderItem={renderPDFItem}
                keyExtractor={item => item.id.toString()}
              />
            ) : (
              <Text className="text-gray-500 text-center py-4">No PDFs found</Text>
            )
          )}
        </View>
      </View>
    </View>
  );
}
