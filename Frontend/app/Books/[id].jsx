import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, SafeAreaView, Alert, Share, ToastAndroid, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import booksData from '../../assets/booksData';
import { API_URL } from '../config';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch book data from API or use local data
    fetchBookData();
    // Check if book is saved or favorited
    checkSavedStatus();
    checkFavoriteStatus();
  }, [id]);

  const fetchBookData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Trước tiên, thử fetch từ API
      console.log('Fetching book from API:', `${API_URL}/books/${id}`);
      const response = await fetch(`${API_URL}/books/${id}`);
      const data = await response.json();
      
      if (data.status && data.data) {
        // Chuyển đổi dữ liệu từ API sang định dạng phù hợp
        const apiBook = data.data;
        setBook({
          id: apiBook.book_id,
          title: apiBook.name_book || apiBook.title,
          author: apiBook.author ? apiBook.author.name_author : 'Unknown Author',
          image: typeof apiBook.image === 'string' ? { uri: apiBook.image } : require('../../assets/images/bia1.png'),
          file_path: apiBook.file_path,
          price: apiBook.is_free ? 'Miễn phí' : `${apiBook.price} ₫`,
          genre: apiBook.category ? apiBook.category.name_category : 'Chưa phân loại',
          description: apiBook.description || 'Đây là một cuốn sách tuyệt vời với nội dung phong phú và hấp dẫn.',
          pages: apiBook.pages || '256',
          publisher: apiBook.publisher || 'NXB Trẻ',
          year: apiBook.year || '2023'
        });
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

  const checkSavedStatus = async () => {
    try {
      const savedBooks = await AsyncStorage.getItem('savedBooks');
      if (savedBooks) {
        const parsedBooks = JSON.parse(savedBooks);
        // Kiểm tra cả id và book_id để đảm bảo hoạt động với nhiều loại dữ liệu
        setIsSaved(parsedBooks.some(bookId => bookId === id || bookId === `BOOK${id}`));
      }
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const favoriteBooks = await AsyncStorage.getItem('favoriteBooks');
      if (favoriteBooks) {
        const parsedBooks = JSON.parse(favoriteBooks);
        // Kiểm tra cả id và book_id để đảm bảo hoạt động với nhiều loại dữ liệu
        setIsFavorite(parsedBooks.some(bookId => bookId === id || bookId === `BOOK${id}`));
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleSaveBook = async () => {
    try {
      // Cần đảm bảo sử dụng đúng ID cho lưu trữ
      const bookIdToSave = book.id || id;
      
      const savedBooks = await AsyncStorage.getItem('savedBooks');
      let savedBooksArray = savedBooks ? JSON.parse(savedBooks) : [];
      
      if (isSaved) {
        // Remove book from saved list - xóa cả hai dạng ID có thể có
        savedBooksArray = savedBooksArray.filter(bookId => 
          bookId !== bookIdToSave && bookId !== id && bookId !== `BOOK${id.replace('BOOK', '')}`);
        showToast('Đã xóa khỏi danh sách đã lưu');
      } else {
        // Add book to saved list
        savedBooksArray.push(bookIdToSave);
        showToast('Đã lưu sách thành công');
      }
      
      await AsyncStorage.setItem('savedBooks', JSON.stringify(savedBooksArray));
      setIsSaved(!isSaved);
      
      // Cập nhật trạng thái global để refresh danh sách sách đã lưu
      await AsyncStorage.setItem('saved_books_updated', Date.now().toString());
    } catch (error) {
      console.error('Error saving book:', error);
      showToast('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  const handleFavoriteBook = async () => {
    try {
      // Cần đảm bảo sử dụng đúng ID cho lưu trữ
      const bookIdToSave = book.id || id;
      
      const favoriteBooks = await AsyncStorage.getItem('favoriteBooks');
      let favoriteBooksArray = favoriteBooks ? JSON.parse(favoriteBooks) : [];
      
      if (isFavorite) {
        // Remove book from favorites - xóa cả hai dạng ID có thể có
        favoriteBooksArray = favoriteBooksArray.filter(bookId => 
          bookId !== bookIdToSave && bookId !== id && bookId !== `BOOK${id.replace('BOOK', '')}`);
        showToast('Đã xóa khỏi danh sách yêu thích');
      } else {
        // Add book to favorites
        favoriteBooksArray.push(bookIdToSave);
        showToast('Đã thêm vào danh sách yêu thích');
      }
      
      await AsyncStorage.setItem('favoriteBooks', JSON.stringify(favoriteBooksArray));
      setIsFavorite(!isFavorite);
      
      // Cập nhật trạng thái global để refresh danh sách yêu thích
      await AsyncStorage.setItem('favorite_books_updated', Date.now().toString());
    } catch (error) {
      console.error('Error updating favorites:', error);
      showToast('Có lỗi xảy ra, vui lòng thử lại');
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

  const handleReadBook = () => {
    if (!book) return;
    
    // Navigate to PdfViewer with the book details
    if (book.file_path) {
      router.push({
        pathname: '/PdfViewer',
        params: { 
          pdfPath: book.file_path,
          pdfTitle: book.title,
          pdfId: id
        }
      });
    } else {
      // If there's no direct PDF path, just show a message
      Alert.alert('Thông báo', 'Sách này chưa có phiên bản PDF.');
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
          title: 'Chi tiết sách',
          headerBackTitle: 'Quay lại',
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
              >
                <Ionicons 
                  name={isSaved ? "bookmark" : "bookmark-outline"} 
                  size={30} 
                  color={isSaved ? "#3b82f6" : "#000"} 
                />
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
              {book.description || 'Đây là một cuốn sách tuyệt vời với nội dung phong phú và hấp dẫn. Tác giả đã mang đến cho người đọc một góc nhìn độc đáo về cuộc sống và con người.'}
            </Text>
          </View>
         
          <View className="p-4 rounded-xl mb-6" >
            <Text className="text-lg font-bold mb-2" >Thông tin</Text>
            <View className="flex-row justify-between py-2 border-b" >
              <Text >Thể loại</Text>
              <Text className="font-semibold">{book.genre || 'Tiểu thuyết'}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b" >
              <Text >Số trang</Text>
              <Text className="font-semibold">{book.pages || '256'}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b" >
              <Text >Nhà xuất bản</Text>
              <Text className="font-semibold">{book.publisher || 'NXB Trẻ'}</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text >Năm xuất bản</Text>
              <Text className="font-semibold">{book.year || '2023'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <View className="p-6 bottom-0 w-full left-0 right-0 bg-gray-100 flex-row justify-between items-center py-4">
        <Text className="text-black font-extrabold text-center text-xl ms-6">{book.price || "Miễn phí"}</Text>
        <TouchableOpacity 
          className="bg-blue-500 rounded-md p-3 w-32"
          onPress={handleReadBook}
        >
          <Text className="text-white font-extrabold text-center text-xl">Đọc Ngay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}











