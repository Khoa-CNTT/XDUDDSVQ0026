import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RenderBookItem = ({ item }) => {
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    // Lấy tiến trình đọc sách nếu có
    const getReadingProgress = async () => {
      try {
        const key = `pdf_progress_${item.id || item.book_id}`;
        const progress = await AsyncStorage.getItem(key);
        
        if (progress) {
          const progressData = JSON.parse(progress);
          if (progressData.percentage) {
            setReadingProgress(progressData.percentage);
          }
        }
      } catch (error) {
        console.error('Error loading reading progress:', error);
      }
    };

    getReadingProgress();
    
    // Thiết lập interval để kiểm tra cập nhật
    const interval = setInterval(async () => {
      try {
        const lastUpdate = await AsyncStorage.getItem('reading_progress_updated');
        if (lastUpdate) {
          getReadingProgress();
        }
      } catch (error) {
        console.error('Error checking for progress updates:', error);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [item.id, item.book_id]);
  
  // Xử lý ảnh bìa sách
  const renderBookCover = () => {
    if (!item.image) {
      // Nếu không có ảnh
      return (
        <View className="w-[120px] h-[180px] rounded-lg mb-2 shadow-sm bg-gray-300 justify-center items-center">
          <Text className="text-gray-500">No Image</Text>
        </View>
      );
    }
    
    if (typeof item.image === 'string') {
      // Nếu là đường dẫn URL
      return (
        <Image
          source={{ uri: item.image }}
          className="w-[120px] h-[180px] rounded-lg mb-2 shadow-sm"
          resizeMode="cover"
          defaultSource={require('../../../assets/images/bia1.png')}
        />
      );
    } else {
      // Nếu là local image (require)
      return (
        <Image
          source={item.image}
          className="w-[120px] h-[180px] rounded-lg mb-2 shadow-sm"
          resizeMode="cover"
        />
      );
    }
  };

  return (
    <TouchableOpacity
      className="w-[120px] mr-4"
      onPress={() => {
        if (item.file_path) {
          router.push({
            pathname: '/PdfViewer',
            params: { 
              pdfPath: item.file_path, 
              pdfTitle: item.title || item.name_book,
              pdfId: item.id || item.book_id
            }
          });
        } else {
          router.push(`/Books/${item.id || item.book_id}`);
        }
      }}
    >
      <View className="relative w-[120px] h-[180px]">
        {renderBookCover()}
        
        {readingProgress > 0 && (
          <View className="absolute bottom-2 left-0 right-0 px-2">
            <View className="bg-gray-800 bg-opacity-70 rounded-full h-2 overflow-hidden">
              <View 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${readingProgress}%` }}
              />
            </View>
            
            {readingProgress >= 5 && (
              <Text className="text-white text-xs text-center mt-1 bg-black bg-opacity-50 rounded px-1">
                {readingProgress}%
              </Text>
            )}
          </View>
        )}
      </View>
      
      <Text
        className="font-semibold text-sm mb-0.5"
        numberOfLines={2}
      >
        {item.title || item.name_book || 'Untitled Book'}
      </Text>
      <Text className="text-gray-500 text-xs">{item.author || 'Unknown Author'}</Text>
    </TouchableOpacity>
  );
};

export default RenderBookItem;