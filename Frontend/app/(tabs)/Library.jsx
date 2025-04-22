import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import * as FileSystem from 'expo-file-system';

// Tính toán kích thước phù hợp
const { width } = Dimensions.get("window");
const THUMBNAIL_SIZE = 60; // Kích thước cố định cho hình thu nhỏ

export default function Library() {
  const router = useRouter();
  const [pdfs, setPdfs] = useState([]);
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const [pdfReadingProgress, setPdfReadingProgress] = useState({});
  
  useEffect(() => {
    loadReadingProgress();
  }, []);
  
  // Sử dụng useFocusEffect để tải lại dữ liệu mỗi khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      fetchPDFs();
      loadReadingProgress();
      
      return () => {
        // Cleanup nếu cần
      };
    }, [])
  );
  
  // Dữ liệu mẫu cho các sách
  const books = [
    {
      id: 1,
      title: "Hãy Nhớ Tên Anh Ấy",
      author: "Trần Hồng Quân",
      colors: ["#8e44ad", "#9b59b6", "#a569bd"], // Màu chính, phụ 1, phụ 2
      count: 5,
    },
    {
      id: 2,
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      colors: ["#6a5acd", "#8e7cc3", "#9c87de"], // Màu tím xanh
      count: 49,
    },
    {
      id: 3,
      title: "Đắc Nhân Tâm",
      author: "Dale Carnegie",
      colors: ["#2ecc71", "#27ae60", "#16a085"], // Màu xanh lá
      count: 12,
    },
    {
      id: 4,
      title: "Các Yếu Tố Lãnh Đạo Thành Công",
      author: "John Maxwell",
      colors: ["#3949ab", "#5c6bc0", "#7986cb"], // Màu xanh đậm
      count: 5,
    },
  ];

  // Lấy danh sách PDF từ API
  const fetchPDFs = async () => {
    try {
      setLoadingPdfs(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        setPdfs([]);
        setLoadingPdfs(false);
        return;
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
        setPdfs(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch PDFs');
      }
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      setPdfs([]);
    } finally {
      setLoadingPdfs(false);
    }
  };
  
  // Tải thông tin tiến độ đọc các PDF
  const loadReadingProgress = async () => {
    try {
      // Only use AsyncStorage (removed database sync)
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter(key => key.startsWith('pdf_progress_'));
      
      if (progressKeys.length > 0) {
        const progressItems = await AsyncStorage.multiGet(progressKeys);
        const progressData = {};
        
        progressItems.forEach(([key, value]) => {
          if (value) {
            const pdfId = key.replace('pdf_progress_', '');
            const progress = JSON.parse(value);
            progressData[pdfId] = progress;
          }
        });
        
        setPdfReadingProgress(progressData);
        console.log('Loaded reading progress from local storage for', Object.keys(progressData).length, 'PDFs');
      }
    } catch (error) {
      console.error('Error loading reading progress:', error);
    }
  };

  // Xử lý thêm sách từ thiết bị - Đã cập nhật để mở trang tải lên PDF
  const handleAddBooks = () => {
    router.push('/UploadPdf');
  };

  // Xử lý khi chọn xem PDF
  const handleViewPdf = async (pdfId) => {
    try {
      // Get the reading progress for this PDF
      const progress = pdfReadingProgress[pdfId];
      let currentPage = 1;
      
      if (progress && progress.page) {
        currentPage = parseInt(progress.page, 10);
        console.log(`Opening PDF at saved page ${currentPage}`);
      }
      
      // Check if the PDF exists locally
      const fileName = `pdf_${pdfId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      // Navigate to the PDF reader with local path if available
      router.push({
        pathname: '/PdfViewer',
        params: { 
          pdfId: pdfId,
          localPath: fileInfo.exists ? encodeURIComponent(fileUri) : '',
          initialPage: currentPage
        }
      });
    } catch (error) {
      console.error('Error checking local file:', error);
      
      // Navigate without local path if there was an error
      router.push({
        pathname: '/PdfViewer',
        params: { pdfId: pdfId }
      });
    }
  };
  
  // Lấy tiến độ đọc của một PDF
  const getReadingProgress = (pdfId) => {
    const progress = pdfReadingProgress[pdfId];
    if (progress) {
      // First use the saved percentage if available
      if (progress.percentage) {
        return parseInt(progress.percentage, 10);
      }
      
      // Fall back to calculating from page and total
      if (progress.page && progress.total) {
        return Math.floor((progress.page / progress.total) * 100) || 0;
      }
    }
    return 0;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4">
        <Text className="text-4xl font-bold mt-12 mb-8">Thư Viện</Text>
        
        {/* Add from device menu */}
        <TouchableOpacity
          onPress={handleAddBooks}
          className="flex-row items-center justify-between py-4 border-b border-gray-200"
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="add-circle-outline" size={25} color="#666" />
            <Text className="text-xl ml-4">Thêm từ thiết bị</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        {/* Sách có thể đọc */}
        <View className="mt-6">
          <Text className="text-2xl font-bold mb-4">Sách có thể đọc</Text>
          
          {loadingPdfs ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#0064e1" />
              <Text className="mt-4 text-gray-600">Đang tải danh sách PDF...</Text>
            </View>
          ) : pdfs.length > 0 ? (
            <View>
              {pdfs.map((item) => {
                const progressPercent = getReadingProgress(item.id);
                return (
                  <TouchableOpacity 
                    key={item.id}
                    className="bg-white shadow-sm rounded-lg p-4 mb-3 flex-row"
                    onPress={() => handleViewPdf(item.id)}
                  >
                    <View className="w-14 h-20 bg-blue-100 rounded-md items-center justify-center mr-4">
                      <Ionicons name="document-text" size={32} color="#0064e1" />
                    </View>
                    
                    <View className="flex-1">
                      <Text className="text-base font-bold mb-1">{item.title}</Text>
                      <Text className="text-xs text-gray-500 mb-2">
                        {(item.file_size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                      
                      {/* Hiển thị tiến độ đọc */}
                      <View className="mt-2">
                        <View className="w-full h-1.5 bg-gray-200 rounded-full">
                          <View 
                            className="h-1.5 bg-blue-500 rounded-full" 
                            style={{ width: `${progressPercent}%` }} 
                          />
                        </View>
                        <View className="flex-row justify-between mt-1">
                          <Text className="text-xs text-gray-500">
                            Đã đọc {progressPercent}%
                          </Text>
                          {progressPercent >= 100 && (
                            <Text className="text-xs text-green-600 font-bold">
                              Đã hoàn thành
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={20} color="#0064e1" />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="py-6 items-center">
              <Ionicons name="book-outline" size={50} color="#cccccc" />
              <Text className="mt-4 text-gray-500 text-center">
                Bạn chưa có PDF nào. Hãy tải lên để bắt đầu đọc!
              </Text>
              <TouchableOpacity 
                className="mt-4 bg-blue-500 px-6 py-2 rounded-full"
                onPress={handleAddBooks}
              >
                <Text className="text-white font-semibold">Tải PDF</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Book Collections */}
        <View className="mt-6 mb-8">
          <Text className="text-2xl font-bold mb-4">Bộ sưu tập sách</Text>
          
          {/* Book Collections List */}
          {books.map((book) => (
            <TouchableOpacity
              key={book.id}
              className="flex-row items-center py-3 border-b border-gray-100"
            >
              {/* Stacked Book Thumbnails */}
              <View
                style={{
                  width: THUMBNAIL_SIZE + 25,
                  height: THUMBNAIL_SIZE,
                  marginRight: 14,
                }}
              >
                {/* Third book */}
                <View
                  style={{
                    position: "absolute",
                    left: 20,
                    top: 4,
                    width: THUMBNAIL_SIZE - 16,
                    height: THUMBNAIL_SIZE - 16,
                    backgroundColor: book.colors[2],
                    borderRadius: 8,
                    borderWidth: 0.5,
                    borderColor: "rgba(255,255,255,0.2)",
                    transform: [{ rotate: "-12deg" }],
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 1.5,
                    elevation: 1,
                  }}
                />

                {/* Middle book */}
                <View
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 2,
                    width: THUMBNAIL_SIZE - 8,
                    height: THUMBNAIL_SIZE - 8,
                    backgroundColor: book.colors[1],
                    borderRadius: 8,
                    borderWidth: 0.5,
                    borderColor: "rgba(255,255,255,0.3)",
                    transform: [{ rotate: "-6deg" }],
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.25,
                    shadowRadius: 2.22,
                    elevation: 2,
                    zIndex: 1,
                  }}
                />

                {/* Foreground book */}
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: THUMBNAIL_SIZE,
                    height: THUMBNAIL_SIZE,
                    backgroundColor: book.colors[0],
                    borderRadius: 8,
                    padding: 8,
                    justifyContent: "space-between",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.23,
                    shadowRadius: 2.62,
                    elevation: 3,
                    zIndex: 2,
                  }}
                >
                  {/* Icon in white circle */}
                  <View className="bg-white w-7 h-7 rounded-full items-center justify-center">
                    <Ionicons name="add" size={18} color={book.colors[0]} />
                  </View>

                  {/* "Sách" text at bottom */}
                  <Text className="text-white text-xs font-medium">Sách</Text>
                </View>
              </View>

              {/* Title and author */}
              <View className="flex-1">
                <Text className="text-base font-medium">{book.title}</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {book.author}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  {book.count} sách
                </Text>
              </View>

              {/* More options */}
              <TouchableOpacity className="p-2">
                <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          
          <Text className="text-center text-gray-500 my-8 text-xs">
            {books.length} bộ sách
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
