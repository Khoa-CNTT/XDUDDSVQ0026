import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  
  // Refs for managing lifecycle and fetch requests
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const storageMonitorRef = useRef(null);
  const isLoadingRef = useRef(false);
  const apiDataLoadedRef = useRef(false);
  
  // Theo dõi ID sách đã lưu và yêu thích để biết khi nào chúng thay đổi
  const savedIdsRef = useRef([]);
  const favoriteIdsRef = useRef([]);

  // Kết hợp tất cả sách có sẵn (API + local)
  const allAvailableBooks = useMemo(() => {
    // Tạo một map từ id đến sách để loại bỏ trùng lặp
    const booksMap = new Map();
    
    // Thêm sách từ API
    apiBooks.forEach(book => {
      const id = book.id || book.book_id;
      booksMap.set(id.toString(), book);
    });
    
    // Thêm sách từ dữ liệu cục bộ nếu không trùng
    const localBooks = [
      ...booksData.featuredBooks,
      ...booksData.bestSellers,
      ...booksData.freeBooks
    ];
    
    localBooks.forEach(book => {
      const id = book.id || book.book_id;
      if (!booksMap.has(id.toString())) {
        booksMap.set(id.toString(), book);
      }
    });
    
    return Array.from(booksMap.values());
  }, [apiBooks]);

  // Tải lại dữ liệu mỗi khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📚 Saved screen focused');
      isMountedRef.current = true;
      
      // Tạo AbortController mới để quản lý fetch requests
      const controller = new AbortController();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = controller;
      
      // Làm mới dữ liệu khi tab được focus
      const refreshDataOnFocus = async () => {
        try {
          // Chỉ hiển thị loading state nếu chưa có dữ liệu
          if (savedBooks.length === 0 && favoriteBooks.length === 0) {
            setIsLoading(true);
          }
          
          // Đánh dấu đang tải để tránh nhiều request đồng thời
          isLoadingRef.current = true;
          
          // Tải dữ liệu API nếu cần
          if (!apiDataLoadedRef.current || apiBooks.length === 0) {
            console.log('📚 Loading API data...');
            await fetchBooksFromAPI(controller.signal);
          }
          
          // Tải danh sách sách đã lưu và yêu thích
          await Promise.all([
            loadSavedBooks(),
            loadFavoriteBooks()
          ]);
          
          // Cập nhật timestamp
          await AsyncStorage.setItem('saved_data_last_fetched', Date.now().toString());
          
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('📚 Data refresh was aborted');
            return;
          }
          
          console.error('📚 Error refreshing data on focus:', error);
          if (isMountedRef.current) {
            setError('Không thể tải dữ liệu, vui lòng thử lại sau');
            setIsLoading(false);
          }
        } finally {
          isLoadingRef.current = false;
        }
      };
      
      refreshDataOnFocus();
      
      // Thiết lập theo dõi thay đổi storage
      setupStorageMonitoring();
      
      return () => {
        console.log('📚 Saved screen blurred - cleaning up');
        isMountedRef.current = false;
        
        if (storageMonitorRef.current) {
          clearInterval(storageMonitorRef.current);
          storageMonitorRef.current = null;
        }
        
        // Hủy bỏ tất cả API fetch đang chạy
        controller.abort();
      };
    }, [])
  );

  // Thiết lập theo dõi thay đổi từ AsyncStorage
  const setupStorageMonitoring = () => {
    // Xóa interval cũ nếu có
    if (storageMonitorRef.current) {
      clearInterval(storageMonitorRef.current);
    }
    
    // Kiểm tra thay đổi sách đã lưu/yêu thích mỗi 3 giây
    storageMonitorRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;
      
      try {
        // Kiểm tra thay đổi sách đã lưu
        const savedIdsStr = await AsyncStorage.getItem('savedBooks');
        const savedIds = savedIdsStr ? JSON.parse(savedIdsStr) : [];
        
        // So sánh IDs mới với IDs đã lưu trước đó
        const savedIdsChanged = !arraysEqual(savedIds, savedIdsRef.current);
        if (savedIdsChanged) {
          console.log('📚 Saved books changed, reloading...');
          savedIdsRef.current = savedIds;
          loadSavedBooks();
        }
        
        // Kiểm tra thay đổi sách yêu thích
        const favoriteIdsStr = await AsyncStorage.getItem('favoriteBooks');
        const favoriteIds = favoriteIdsStr ? JSON.parse(favoriteIdsStr) : [];
        
        // So sánh IDs mới với IDs đã lưu trước đó
        const favoriteIdsChanged = !arraysEqual(favoriteIds, favoriteIdsRef.current);
        if (favoriteIdsChanged) {
          console.log('📚 Favorite books changed, reloading...');
          favoriteIdsRef.current = favoriteIds;
          loadFavoriteBooks();
        }
        
        // Kiểm tra cờ cập nhật (cách cũ, duy trì tương thích ngược)
        const savedUpdate = await AsyncStorage.getItem('saved_books_updated');
        const favoriteUpdate = await AsyncStorage.getItem('favorite_books_updated');
        
        if (savedUpdate) {
          console.log('📚 Found update flag for saved books');
          await AsyncStorage.removeItem('saved_books_updated');
          loadSavedBooks();
        }
        
        if (favoriteUpdate) {
          console.log('📚 Found update flag for favorite books');
          await AsyncStorage.removeItem('favorite_books_updated');
          loadFavoriteBooks();
        }
      } catch (error) {
        console.error('📚 Error checking storage changes:', error);
      }
    }, 3000);
  };
  
  // Hàm so sánh hai mảng
  const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  };

  // Khởi tạo component
  useEffect(() => {
    console.log('📚 Saved screen mounted');
    isMountedRef.current = true;
    isLoadingRef.current = false;
    apiDataLoadedRef.current = false;
    
    // Tải dữ liệu ban đầu
    const initialLoad = async () => {
      try {
        setIsLoading(true);
        isLoadingRef.current = true;
        
        // Tạo AbortController mới
        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        // Tải dữ liệu từ API
        await fetchBooksFromAPI(controller.signal);
        
        if (isMountedRef.current) {
          // Tải sách đã lưu và yêu thích
          await Promise.all([
            loadSavedBooks(),
            loadFavoriteBooks()
          ]);
          
          setIsLoading(false);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('📚 Initial load aborted');
          return;
        }
        
        console.error('📚 Error during initial load:', error);
        if (isMountedRef.current) {
          setError('Không thể tải dữ liệu, vui lòng thử lại sau');
          setIsLoading(false);
        }
      } finally {
        isLoadingRef.current = false;
      }
    };
    
    initialLoad();
    
    // Thiết lập theo dõi thay đổi từ AsyncStorage
    setupStorageMonitoring();
    
    return () => {
      console.log('📚 Saved screen unmounted');
      isMountedRef.current = false;
      
      // Dọn dẹp tất cả các tác vụ đang chạy
      if (storageMonitorRef.current) {
        clearInterval(storageMonitorRef.current);
        storageMonitorRef.current = null;
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Tải dữ liệu sách từ API
  const fetchBooksFromAPI = async (signal) => {
    if (!isMountedRef.current) return [];
    
    try {
      console.log('📚 Fetching books from API');
      const response = await fetch(`${API_URL}/books`, { signal });
      
      if (!isMountedRef.current) return [];
      
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
        
        if (isMountedRef.current) {
          setApiBooks(books);
          apiDataLoadedRef.current = true;
          console.log(`📚 Loaded ${books.length} books from API`);
        }
        
        return books;
      } else {
        console.warn("📚 API returned invalid data structure");
        
        // Sử dụng dữ liệu local nếu API không hoạt động
        const localBooks = [
          ...booksData.featuredBooks,
          ...booksData.bestSellers,
          ...booksData.freeBooks
        ];
        
        if (isMountedRef.current) {
          setApiBooks(localBooks);
          apiDataLoadedRef.current = true;
        }
        
        return localBooks;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('📚 API fetch was aborted');
        return [];
      }
      
      console.error('📚 Error fetching books from API:', error);
      
      // Sử dụng dữ liệu local nếu API có lỗi
      const localBooks = [
        ...booksData.featuredBooks,
        ...booksData.bestSellers,
        ...booksData.freeBooks
      ];
      
      if (isMountedRef.current) {
        setApiBooks(localBooks);
        apiDataLoadedRef.current = true;
      }
      
      return localBooks;
    }
  };

  // Tìm sách dựa trên danh sách ID - được tối ưu hóa để xử lý nhiều loại ID
  const findBooksByIds = (bookIds) => {
    console.log(`📚 Finding books from ${allAvailableBooks.length} available books`);
    
    // Debug: In ra một vài ID sách đầu tiên để kiểm tra
    if (allAvailableBooks.length > 0) {
      const sampleBooks = allAvailableBooks.slice(0, 3);
      console.log('📚 Sample book IDs:', sampleBooks.map(b => {
        return {
          id: b.id,
          book_id: b.book_id,
          title: b.title
        };
      }));
    }
    
    // Debug: In ra danh sách ID cần tìm
    console.log('📚 Looking for these IDs:', bookIds);
    
    const results = bookIds
      .map(savedId => {
        // Chuyển đổi ID thành string để đảm bảo so sánh chính xác
        const savedIdStr = savedId.toString();
        console.log(`📚 Searching for book with ID: ${savedIdStr}`);
        
        // Tìm sách với tất cả các định dạng ID có thể
        const found = allAvailableBooks.find(book => {
          // Lấy cả id và book_id để đảm bảo không bỏ sót
          const bookId = book.id?.toString() || '';
          const bookBookId = book.book_id?.toString() || '';
          
          // Danh sách các định dạng ID khác nhau cần kiểm tra
          const possibleIds = [
            bookId,
            bookBookId,
            bookId.startsWith('BOOK') ? bookId.replace('BOOK', '') : `BOOK${bookId}`,
            bookBookId.startsWith('BOOK') ? bookBookId.replace('BOOK', '') : `BOOK${bookBookId}`
          ].filter(Boolean); // Loại bỏ các giá trị falsy
          
          // Kiểm tra nếu ID đang tìm khớp với bất kỳ định dạng nào
          for (const id of possibleIds) {
            if (id === savedIdStr) return true;
            if (savedIdStr.startsWith('BOOK') && savedIdStr.replace('BOOK', '') === id) return true;
            if (!savedIdStr.startsWith('BOOK') && `BOOK${savedIdStr}` === id) return true;
          }
          
          return false;
        });
        
        if (found) {
          console.log(`📚 Found book: ${found.title} (ID: ${found.id || found.book_id})`);
          return found;
        } else {
          console.log(`📚 No book found for ID: ${savedIdStr}`);
          
          // Tìm kiếm mở rộng trong trường hợp không tìm thấy
          const book = findFallbackBook(savedIdStr);
          return book;
        }
      })
      .filter(Boolean); // Loại bỏ các giá trị undefined
    
    console.log(`📚 Total books found: ${results.length} out of ${bookIds.length} IDs`);
    return results;
  };
  
  // Hàm tìm kiếm sách dự phòng với thuật toán khác nếu cách thông thường không hoạt động
  const findFallbackBook = (searchId) => {
    // Tìm kiếm theo số ID (bỏ qua bất kỳ tiền tố nào)
    const numericId = searchId.replace(/\D/g, '');
    if (!numericId) return null;
    
    console.log(`📚 Fallback search for numeric ID: ${numericId}`);
    
    for (const book of allAvailableBooks) {
      const bookIdStr = (book.id || book.book_id || '').toString();
      const bookNumericId = bookIdStr.replace(/\D/g, '');
      
      if (bookNumericId === numericId) {
        console.log(`📚 Fallback found book: ${book.title}`);
        return book;
      }
    }
    
    // Nếu chưa tìm thấy, thử một chiến lược khác: tìm theo một phần của ID
    if (numericId.length > 3) {
      for (const book of allAvailableBooks) {
        const bookIdStr = (book.id || book.book_id || '').toString();
        if (bookIdStr.includes(numericId) || numericId.includes(bookIdStr)) {
          console.log(`📚 Partial match found book: ${book.title}`);
          return book;
        }
      }
    }
    
    return null;
  };
  
  // Load and process saved books with proper error handling
  const loadSavedBooks = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const savedBookIds = await AsyncStorage.getItem('savedBooks');
      
      if (!isMountedRef.current) return;
      
      if (!savedBookIds) {
        console.log('📚 No saved books found');
        setSavedBooks([]);
        savedIdsRef.current = [];
        return;
      }
      
      let bookIds;
      try {
        bookIds = JSON.parse(savedBookIds);
        // Đảm bảo bookIds là một mảng
        if (!Array.isArray(bookIds)) {
          console.log('📚 Saved books data is not an array, resetting');
          bookIds = [];
        }
      } catch (parseError) {
        console.error('📚 Error parsing saved book IDs:', parseError);
        bookIds = [];
      }
      
      // Kiểm tra nếu API đã tải xong
      if (apiBooks.length === 0 && !apiDataLoadedRef.current) {
        console.log('📚 API data not yet loaded, waiting before loading saved books');
        // Tải lại API data nếu cần
        if (!isLoadingRef.current) {
          const controller = new AbortController();
          try {
            await fetchBooksFromAPI(controller.signal);
          } catch (error) {
            console.error('📚 Error fetching API data for saved books:', error);
          }
        }
      }
      
      console.log(`📚 Loading ${bookIds.length} saved books`);
      savedIdsRef.current = bookIds;
      
      // Tìm sách từ danh sách ID
      const savedBooksData = findBooksByIds(bookIds);
      
      if (isMountedRef.current) {
        setSavedBooks(savedBooksData);
        setLastUpdated(prev => ({...prev, saved: Date.now()}));
        console.log(`📚 Loaded ${savedBooksData.length} saved books`);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('📚 Error loading saved books:', error);
        setSavedBooks([]);
      }
    }
  };

  // Load and process favorite books with proper error handling
  const loadFavoriteBooks = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const favoriteBookIds = await AsyncStorage.getItem('favoriteBooks');
      
      if (!isMountedRef.current) return;
      
      if (!favoriteBookIds) {
        console.log('📚 No favorite books found');
        setFavoriteBooks([]);
        favoriteIdsRef.current = [];
        return;
      }
      
      let bookIds;
      try {
        bookIds = JSON.parse(favoriteBookIds);
        // Đảm bảo bookIds là một mảng
        if (!Array.isArray(bookIds)) {
          console.log('📚 Favorite books data is not an array, resetting');
          bookIds = [];
        }
      } catch (parseError) {
        console.error('📚 Error parsing favorite book IDs:', parseError);
        bookIds = [];
      }
      
      // Kiểm tra nếu API đã tải xong
      if (apiBooks.length === 0 && !apiDataLoadedRef.current) {
        console.log('📚 API data not yet loaded, waiting before loading favorite books');
        // Tải lại API data nếu cần
        if (!isLoadingRef.current) {
          const controller = new AbortController();
          try {
            await fetchBooksFromAPI(controller.signal);
          } catch (error) {
            console.error('📚 Error fetching API data for favorite books:', error);
          }
        }
      }
      
      console.log(`📚 Loading ${bookIds.length} favorite books`);
      favoriteIdsRef.current = bookIds;
      
      // Tìm sách từ danh sách ID
      const favoriteBooksData = findBooksByIds(bookIds);
      
      if (isMountedRef.current) {
        setFavoriteBooks(favoriteBooksData);
        setLastUpdated(prev => ({...prev, favorites: Date.now()}));
        console.log(`📚 Loaded ${favoriteBooksData.length} favorite books`);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('📚 Error loading favorite books:', error);
        setFavoriteBooks([]);
      }
    }
  };

  // Làm mới dữ liệu theo yêu cầu người dùng
  const onRefresh = async () => {
    if (isLoadingRef.current) return;
    
    console.log('📚 Manual refresh triggered');
    setRefreshing(true);
    isLoadingRef.current = true;
    
    try {
      // Tạo AbortController mới
      const controller = new AbortController();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = controller;
      
      // Làm mới toàn bộ dữ liệu
      await fetchBooksFromAPI(controller.signal);
      
      if (isMountedRef.current) {
        await Promise.all([
          loadSavedBooks(),
          loadFavoriteBooks()
        ]);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('📚 Refresh was aborted');
      } else {
        console.error('📚 Error during manual refresh:', error);
        if (isMountedRef.current) {
          setError('Không thể tải dữ liệu, vui lòng thử lại sau');
        }
      }
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  };

  // Component nút tab
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

  // Trạng thái trống
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

  // Chọn sách dựa trên tab đang hoạt động
  const booksToDisplay = useMemo(() => {
    return activeTab === 'saved' ? savedBooks : favoriteBooks;
  }, [activeTab, savedBooks, favoriteBooks]);

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
          data={booksToDisplay.slice(0, 20)}
          renderItem={({ item }) => <RenderBookItem item={item} />}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
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