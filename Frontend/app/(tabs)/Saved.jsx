import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RenderBookItem from "../components/Home/RenderBookItem";
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import booksData from '../../assets/booksData';
import { useFocusEffect } from 'expo-router';

export default function SavedScreen() {
  const [activeTab, setActiveTab] = useState('saved');
  const [savedBooks, setSavedBooks] = useState([]);
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiBooks, setApiBooks] = useState([]);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState({
    saved: 0,
    favorites: 0
  });

  // Tải lại dữ liệu mỗi khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📚 Saved screen focused - reloading data...');
      // Load ngay lập tức khi màn hình được focus
      loadBooks();
      
      return () => {
        console.log('📚 Saved screen blurred');
      };
    }, [])
  );

  // Lắng nghe thay đổi từ AsyncStorage cho danh sách sách đã lưu và yêu thích
  useEffect(() => {
    // console.log('📚 Setting up storage listeners');
    
    // Thiết lập event listener cho AsyncStorage
    const setupStorageListeners = () => {
      // Kiểm tra thay đổi thường xuyên hơn (1 giây)
      const checkInterval = setInterval(async () => {
        try {
          // Kiểm tra danh sách sách đã lưu
          const savedIdsStr = await AsyncStorage.getItem('savedBooks');
          if (savedIdsStr) {
            const savedIds = JSON.parse(savedIdsStr);
            // Nếu số lượng sách đã lưu khác với trạng thái hiện tại, cập nhật
            if (savedIds.length !== savedBooks.length) {
              // console.log('📚 Detected change in saved books count, reloading...');
              loadSavedBooks();
            }
          }

          // Kiểm tra danh sách sách yêu thích
          const favoriteIdsStr = await AsyncStorage.getItem('favoriteBooks');
          if (favoriteIdsStr) {
            const favoriteIds = JSON.parse(favoriteIdsStr);
            // Nếu số lượng sách yêu thích khác với trạng thái hiện tại, cập nhật
            if (favoriteIds.length !== favoriteBooks.length) {
              // console.log('📚 Detected change in favorite books count, reloading...');
              loadFavoriteBooks();
            }
          }

          // Kiểm tra cờ cập nhật (cách cũ, duy trì tương thích ngược)
          const savedUpdate = await AsyncStorage.getItem('saved_books_updated');
          const favoriteUpdate = await AsyncStorage.getItem('favorite_books_updated');
          
          if (savedUpdate) {
            // console.log('📚 Detected update flag for saved books, refreshing...');
            await AsyncStorage.removeItem('saved_books_updated');
            loadSavedBooks();
          }
          
          if (favoriteUpdate) {
            // console.log('📚 Detected update flag for favorite books, refreshing...');
            await AsyncStorage.removeItem('favorite_books_updated');
            loadFavoriteBooks();
          }
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      }, 1000); // Kiểm tra mỗi 1 giây
      
      return () => {
        clearInterval(checkInterval);
      };
    };

    const removeListener = setupStorageListeners();
    
    // Tải dữ liệu ngay lần đầu
    if (apiBooks.length === 0) {
      loadBooks();
    }
    
    return () => {
      // console.log('📚 Cleaning up storage listeners');
      removeListener && removeListener();
    };
  }, [savedBooks.length, favoriteBooks.length]);

  const loadBooks = async () => {
    // console.log('📚 Loading books data...');
    setIsLoading(true);
    setError(null);
    try {
      // Tải dữ liệu sách từ API Laravel
      await fetchBooksFromAPI();
      
      // Tải danh sách ID sách đã lưu và yêu thích
      await Promise.all([
        loadSavedBooks(),
        loadFavoriteBooks()
      ]);
      
      console.log('📚 All book data loaded successfully');
    } catch (error) {
      console.error('📚 Error loading books:', error);
      setError('Không thể tải dữ liệu sách, vui lòng thử lại sau');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBooksFromAPI = async () => {
    try {
      console.log('📚 Fetching books from API:', `${API_URL}/books`);
      const response = await fetch(`${API_URL}/books`);
      const data = await response.json();
      
      if (data.status && data.data) {
        const books = data.data.map(book => ({
          id: book.book_id,
          title: book.name_book,
          author: book.author ? book.author.name_author : 'Unknown Author',
          image: book.image,
          file_path: book.file_path,
          price: book.is_free ? 'Miễn phí' : `${book.price} ₫`,
          rating: Math.floor(Math.random() * 5) + 1,
          category_id: book.category_id,
          description: book.description || "Mô tả sách sẽ hiển thị ở đây",
        }));
        
        setApiBooks(books);
        console.log(`📚 Đã tải ${books.length} cuốn sách từ API`);
      } else {
        console.warn("📚 API trả về dữ liệu không đúng cấu trúc");
        
        // Nếu API không hoạt động, sử dụng dữ liệu local
        const localBooks = [
          ...booksData.featuredBooks,
          ...booksData.bestSellers,
          ...booksData.freeBooks
        ];
        setApiBooks(localBooks);
      }
    } catch (error) {
      console.error('📚 Error fetching books from API:', error);
      
      // Nếu có lỗi khi gọi API, sử dụng dữ liệu local
      const localBooks = [
        ...booksData.featuredBooks,
        ...booksData.bestSellers,
        ...booksData.freeBooks
      ];
      setApiBooks(localBooks);
    }
  };

  const loadSavedBooks = async () => {
    try {
      // console.log('📚 Loading saved books...');
      const savedBookIds = await AsyncStorage.getItem('savedBooks');
      if (!savedBookIds) {
        console.log('📚 No saved books found');
        setSavedBooks([]);
        return;
      }
      
      const bookIds = JSON.parse(savedBookIds);
      // console.log('📚 Saved book IDs:', bookIds);
      
      // Đảm bảo apiBooks đã được tải
      if (apiBooks.length === 0) {
        console.log('📚 API books not loaded yet, fetching again...');
        await fetchBooksFromAPI();
      }
      
      // Kết hợp sách từ API và local data
      const allBooks = [
        ...apiBooks,
        ...booksData.featuredBooks,
        ...booksData.bestSellers,
        ...booksData.freeBooks
      ];
      
      // Tìm sách dựa trên ID, với xử lý đặc biệt cho ID có tiền tố "BOOK"
      const savedBooksData = bookIds.map(savedId => {
        // Log for debugging
        // console.log(`📚 Looking for book with saved ID: ${savedId}`);
        
        return allBooks.find(book => {
          const bookId = book.id || book.book_id;
          
          // Nhiều cách so sánh ID khác nhau
          if (savedId === bookId) return true;
          if (savedId.startsWith('BOOK') && savedId === bookId) return true;
          if (savedId.startsWith('BOOK') && savedId.replace('BOOK', '') === bookId) return true;
          if (!savedId.startsWith('BOOK') && `BOOK${savedId}` === bookId) return true;
          
          return false;
        });
      }).filter(Boolean); // Remove any undefined entries
      
      // console.log(`📚 Tìm thấy ${savedBooksData.length} sách đã lưu`);
      setSavedBooks(savedBooksData);
      setLastUpdated(prev => ({...prev, saved: Date.now()}));
    } catch (error) {
      console.error('📚 Error loading saved books:', error);
      setSavedBooks([]);
    }
  };

  const loadFavoriteBooks = async () => {
    try {
      console.log('📚 Loading favorite books...');
      const favoriteBookIds = await AsyncStorage.getItem('favoriteBooks');
      if (!favoriteBookIds) {
        console.log('📚 No favorite books found');
        setFavoriteBooks([]);
        return;
      }
      
      const bookIds = JSON.parse(favoriteBookIds);
      console.log('📚 Favorite book IDs:', bookIds);
      
      // Đảm bảo apiBooks đã được tải
      if (apiBooks.length === 0) {
        console.log('📚 API books not loaded yet, fetching again...');
        await fetchBooksFromAPI();
      }
      
      // Kết hợp sách từ API và local data
      const allBooks = [
        ...apiBooks,
        ...booksData.featuredBooks,
        ...booksData.bestSellers,
        ...booksData.freeBooks
      ];
      
      // Tìm sách dựa trên ID, với xử lý đặc biệt cho ID có tiền tố "BOOK"
      const favoriteBooksData = bookIds.map(savedId => {
        // Log for debugging
        console.log(`📚 Looking for book with favorite ID: ${savedId}`);
        
        return allBooks.find(book => {
          const bookId = book.id || book.book_id;
          
          // Nhiều cách so sánh ID khác nhau
          if (savedId === bookId) return true;
          if (savedId.startsWith('BOOK') && savedId === bookId) return true;
          if (savedId.startsWith('BOOK') && savedId.replace('BOOK', '') === bookId) return true;
          if (!savedId.startsWith('BOOK') && `BOOK${savedId}` === bookId) return true;
          
          return false;
        });
      }).filter(Boolean); // Remove any undefined entries
      
      console.log(`📚 Tìm thấy ${favoriteBooksData.length} sách yêu thích`);
      setFavoriteBooks(favoriteBooksData);
      setLastUpdated(prev => ({...prev, favorites: Date.now()}));
    } catch (error) {
      console.error('📚 Error loading favorite books:', error);
      setFavoriteBooks([]);
    }
  };

  const onRefresh = async () => {
    console.log('📚 Manual refresh triggered');
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  };

  const TabButton = ({ title, isActive, onPress, icon }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center py-3 ${
        isActive ? 'border-b-2 border-blue-500' : ''
      }`}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={isActive ? '#3b82f6' : '#64748b'} 
        style={{ marginRight: 6 }}
      />
      <Text
        className={`text-base font-semibold ${
          isActive ? 'text-blue-500' : 'text-gray-500'
        }`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-8">
      <Ionicons 
        name={activeTab === 'saved' ? 'bookmark' : 'heart'} 
        size={60}
        color="#d1d5db"
      />
      <Text className="text-gray-400 text-lg mt-4 mb-2">
        {activeTab === 'saved' 
          ? 'Bạn chưa lưu cuốn sách nào' 
          : 'Bạn chưa thích cuốn sách nào'}
      </Text>
      <Text className="text-gray-400 text-center px-8">
        {activeTab === 'saved'
          ? 'Các sách bạn đã lưu sẽ xuất hiện ở đây'
          : 'Các sách bạn đã thích sẽ xuất hiện ở đây'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-4">
        <Text className="text-3xl font-bold">Sách của tôi</Text>
      </View>
      
      <View className="flex-row border-b border-gray-200">
        <TabButton
          title="Đã lưu"
          isActive={activeTab === 'saved'}
          onPress={() => setActiveTab('saved')}
          icon="bookmark"
        />
        <TabButton
          title="Yêu thích"
          isActive={activeTab === 'favorites'}
          onPress={() => setActiveTab('favorites')}
          icon="heart"
        />
      </View>
      
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-500 mt-4">Đang tải sách...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
          <Text className="text-red-500 text-lg text-center mt-4">{error}</Text>
          <TouchableOpacity 
            className="mt-6 bg-blue-500 px-6 py-3 rounded-lg"
            onPress={onRefresh}
          >
            <Text className="text-white font-semibold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={(activeTab === 'saved' ? savedBooks : favoriteBooks).slice(0, 20)}
          renderItem={({ item }) => <RenderBookItem item={item} />}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={{ 
            paddingHorizontal: 16,
            paddingVertical: 16,
            flexGrow: 1,
          }}
          columnWrapperStyle={{
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
            />
          }
        />
      )}
    </SafeAreaView>
  );
} 