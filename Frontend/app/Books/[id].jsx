import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, SafeAreaView, Alert, Share, ToastAndroid, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { authService } from '../services/authService';
import { getBookPdfViewUrl } from '../services/bookService';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Chỉ cần tải dữ liệu sách từ API, các trạng thái lưu/thích sẽ được lấy từ API
    fetchBookData();
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      
      const fetchData = async () => {
        if (isActive) {
          await fetchBookData();
        }
      };
      
      fetchData();
      
      return () => {
        isActive = false;
      };
    }, [id])
  );

  const fetchBookData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/books/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.status && data.data) {
        const apiBook = data.data;
        // Thêm log để debug
        console.log('API Response:', {
          is_saved: apiBook.is_saved,
          is_favorite: apiBook.is_favorite
        });
        
        setBook({
          id: apiBook.book_id,
          title: apiBook.name_book,
          description: apiBook.title, // Trong dữ liệu seed, title chứa mô tả sách
          image: typeof apiBook.image === 'string' ? { uri: apiBook.image } : require('../../assets/images/bia1.png'),
          author: apiBook.author ? apiBook.author.name_author : 'Không rõ tác giả',
          price: apiBook.is_free ? 'Miễn phí' : `${apiBook.price} ₫`,
          genre: apiBook.category ? apiBook.category.name_category : 'Chưa phân loại',
          pages: apiBook.pages || '0',
          publisher: apiBook.publisher || 'NXB Trẻ',
          year: apiBook.year || '2023',
          file_path: apiBook.file_path,
          // Lưu trạng thái từ server
          is_saved: apiBook.is_saved,
          is_favorite: apiBook.is_favorite,
        });
        
        // Cập nhật state trực tiếp từ API response
        setIsSaved(!!apiBook.is_saved);
        setIsFavorite(!!apiBook.is_favorite);
      } else {
        // Nếu API không trả về dữ liệu hoặc lỗi, sử dụng dữ liệu local
        console.log('Book not found in API, falling back to local data');
        
        const bookId = String(id);
      
        // Search through all book collections
        const allBooks = [
          ...booksData.featuredBooks,
          ...booksData.bestSellers,
          ...booksData.freeBooks
        ];
        
        const foundBook = allBooks.find(b => b.id === bookId);
        
        if (foundBook) {
          setBook(foundBook);
        } else {
          setError('Không tìm thấy thông tin sách');
        }
      }
    } catch (error) {
      console.error('Error fetching book:', error);
      setError('Có lỗi xảy ra khi tải thông tin sách');
      
      // Fallback to local data if API fails
      const bookId = String(id);
      const allBooks = [
        ...booksData.featuredBooks,
        ...booksData.bestSellers,
        ...booksData.freeBooks
      ];
      
      const foundBook = allBooks.find(b => b.id === bookId);
      if (foundBook) {
        setBook(foundBook);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBook = async () => {
    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        showToast('Vui lòng đăng nhập để lưu sách');
        return;
      }

      const newSavedStatus = !isSaved;
      // Cập nhật UI ngay lập tức
      setIsSaved(newSavedStatus);
      
      const response = await fetch(`${API_URL}/books/${id}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          is_saved: newSavedStatus
        }),
      });
      
      const result = await response.json();
      if (!result.status) {
        // Nếu API call thất bại, revert state
        setIsSaved(!newSavedStatus);
        showToast(result.message || 'Không thể cập nhật, vui lòng thử lại sau');
      } else {
        showToast(result.message);
        // Sau khi API thành công, fetch lại dữ liệu mới nhất
        await fetchBookData();
      }
    } catch (error) {
      console.error('Error saving book:', error);
      setIsSaved(!isSaved);
      showToast('Có lỗi xảy ra, vui lòng thử lại sau');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFavoriteBook = async () => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            showToast('Vui lòng đăng nhập để thêm vào yêu thích');
            return;
        }
        const newFavoriteStatus = !isFavorite;
        setIsFavorite(newFavoriteStatus);
        const response = await fetch(`${API_URL}/books/${id}/favorite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                is_favorite: newFavoriteStatus
            }),
        });
        const result = await response.json();
        if (!result.status) {
            setIsFavorite(!newFavoriteStatus); // Revert state if failed
            showToast(result.message || 'Không thể cập nhật, vui lòng thử lại sau');
        } else {
            showToast(result.message);
            setBook(prevBook => ({
                ...prevBook,
                is_favorite: newFavoriteStatus
            }));
        }
    } catch (error) {
        console.error('Error favoriting book:', error);
        setIsFavorite(!isFavorite); // Revert state on error
        showToast('Có lỗi xảy ra, vui lòng thử lại sau');
    }
  };

  const handleShareBook = async () => {
    if (!book) return;
    
    try {
      const result = await Share.share({
        message: `Hãy đọc "${book.title}" bởi ${book.author}. Một cuốn sách tuyệt vời mà tôi đã tìm thấy!`,
        title: book.title
      });
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
          console.log('Shared with activity type:', result.activityType);
        } else {
          // shared
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ cuốn sách này.');
    }
  };

  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Thông báo', message);
    }
  };

  const handleReadBook = async () => {
    if (!book) return;
    
    try {
      setIsLoading(true);
      
      // Kiểm tra đăng nhập
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để đọc sách');
        setIsLoading(false);
        return;
      }
      
      // Không tạo URL PDF ở đây nữa
      console.log('Opening book with ID:', id);
      
      // Chuyển đến BookViewer với bookId nhưng KHÔNG truyền pdfUrl
      router.push({
        pathname: '/BookViewer',
        params: { 
          bookId: id,
          bookTitle: book.title
        }
      });
    } catch (error) {
      console.error('Error opening book:', error);
      Alert.alert('Lỗi', 'Không thể mở sách, vui lòng thử lại sau');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-lg mt-4">Đang tải thông tin sách...</Text>
      </SafeAreaView>
    );
  }
  
  if (error && !book) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center px-4">
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text className="text-lg text-center mt-4">{error}</Text>
        <TouchableOpacity 
          className="mt-6 bg-blue-500 px-6 py-3 rounded-lg"
          onPress={fetchBookData}
        >
          <Text className="text-white font-bold">Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <Text className="text-lg">Không tìm thấy thông tin sách</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" >
      <Stack.Screen
        options={{
          headerTitle: 'Chi tiết sách',
          headerBackTitle: 'Quay lại',
          headerShown: true,
        }}
      />
     
     <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center pt-6 pb-8 shadow-lg">
          <Image
            source={book.image}
            className="w-[180px] h-[270px] rounded-xl"
            resizeMode="cover"
          />
        </View>
       
        <View className="px-6 ">
          <Text className="text-2xl font-bold text-center mb-2">{book.title}</Text>
          <Text className="text-base text-center mb-4">{book.author}</Text>
         
          <View className="flex-row justify-center items-center mb-8">
              <TouchableOpacity 
                className="items-center mx-4 w-20"
                onPress={handleSaveBook}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <Ionicons 
                    name={isSaved ? "bookmark" : "bookmark-outline"} 
                    size={30} 
                    color={isSaved ? "#3b82f6" : "#000"} 
                  />
                )}
                <Text className="text-sm mt-1">Lưu</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="items-center mx-4 w-20"
                onPress={handleShareBook}
              >
                <Ionicons name="share-outline" size={30} />
                <Text className="text-sm mt-1">Chia sẻ</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="items-center mx-4 w-20"
                onPress={handleFavoriteBook}
              >
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={30} 
                  color={isFavorite ? "#f43f5e" : "#000"} 
                />
                <Text className="text-sm mt-1">Yêu thích</Text>
              </TouchableOpacity>
          </View>
         
          <View className="p-4 rounded-xl mb-6" >
            <Text className="text-xl font-bold mb-2" >Giới thiệu sách</Text>
            <Text className="text-lg font-bold text-blue-500 mb-2">{book.title}</Text>
            <Text className="text-base leading-6" >
              {book.description}
            </Text>
          </View>
         
          <View className="p-4 rounded-xl mb-6" >
            <Text className="text-lg font-bold mb-2" >Thông tin</Text>
            <View className="flex-row justify-between py-2 border-b" >
              <Text>Thể loại</Text>
              <Text className="font-semibold">{book.genre}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b" >
              <Text>Số trang</Text>
              <Text className="font-semibold">{book.pages}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b" >
              <Text>Nhà xuất bản</Text>
              <Text className="font-semibold">{book.publisher}</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text>Năm xuất bản</Text>
              <Text className="font-semibold">{book.year}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <View className="p-6 bottom-0 w-full left-0 right-0 bg-gray-100 flex-row justify-between items-center py-4">
        <Text className="text-black font-extrabold text-center text-xl ms-6">{book.price}</Text>
        <View className="flex-row">
          <TouchableOpacity 
            className="bg-blue-500 rounded-md p-3 w-32"
            onPress={handleReadBook}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-extrabold text-center text-xl">Đọc Ngay</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}











