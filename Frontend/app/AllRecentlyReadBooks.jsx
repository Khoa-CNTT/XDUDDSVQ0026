import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TextInput,
  Keyboard
} from "react-native";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';
import { getRecentlyViewedBooks, getBookReadingHistory } from './services/bookService';

const screenWidth = Dimensions.get('window').width;
const SPACING = 16;
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (screenWidth - (SPACING * (COLUMN_COUNT + 1))) / COLUMN_COUNT;

// Hàm chuẩn hóa tiếng Việt (bỏ dấu)
const removeVietnameseAccents = (str) => {
  if (!str) return '';
  
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export default function AllRecentlyReadBooks() {
  const router = useRouter();
  const [recentlyReadBooks, setRecentlyReadBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    loadRecentlyReadBooks();
  }, []);

  // Load recently read books from API or storage
  const loadRecentlyReadBooks = async () => {
    try {
      setLoading(true);
      console.log('📚 Loading all recently read books...');
      
      // Check for user token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('📚 No auth token found - user needs to log in');
        setLoading(false);
        return;
      }
      
      // First try to get reading history from server
      const historyResponse = await getBookReadingHistory();
      
      if (historyResponse.success && historyResponse.data && historyResponse.data.length > 0) {
        console.log(`📚 Fetched ${historyResponse.data.length} book reading histories from server`);
        
        // Extract book IDs from history
        const bookIds = historyResponse.data.map(history => history.book_id);
        
        // Load book details for each history item
        await loadBookDetails(bookIds, token);
      } else {
        console.log('📚 No reading history found, falling back to recently viewed books');
        
        // Fallback to recently viewed books
        const recentResponse = await getRecentlyViewedBooks();
        
        if (recentResponse.success && recentResponse.data && recentResponse.data.length > 0) {
          const bookIds = recentResponse.data;
          console.log(`📚 Found ${bookIds.length} recently viewed books`);
          await loadBookDetails(bookIds, token);
        } else {
          // Final fallback to local storage
          await loadBooksFromStorage(token);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('📚 Error in loadRecentlyReadBooks:', error);
      setLoading(false);
    }
  };
  
  // Helper function to load books directly from storage
  const loadBooksFromStorage = async (token) => {
    try {
      console.log('📚 Loading books directly from storage');
      
      // Get user ID for secure storage keys
      const userId = await AsyncStorage.getItem('user_id');
      
      if (!userId) {
        console.log('📚 Missing user ID, cannot load personalized book history');
        return;
      }
      
      // Use only the user-specific key format
      const userBookKey = `recently_viewed_books_${userId}`;
      console.log(`📚 Using user-specific key: ${userBookKey}`);
      
      const recentlyViewedJson = await AsyncStorage.getItem(userBookKey);
      
      if (recentlyViewedJson) {
        const bookIds = JSON.parse(recentlyViewedJson);
        console.log('📚 Found book IDs in user storage:', bookIds);
        
        if (bookIds.length > 0) {
          await loadBookDetails(bookIds, token);
        }
      } else {
        console.log('📚 No book history found for this user');
      }
    } catch (error) {
      console.error('📚 Error in loadBooksFromStorage:', error);
    }
  };
  
  // Helper function to load book details
  const loadBookDetails = async (bookIds, token) => {
    try {
      // Fetch book details for each ID
      const books = [];
      
      // Get reading history first to combine with book details
      const historyResponse = await getBookReadingHistory();
      const readingHistory = historyResponse.success ? historyResponse.data : [];
      
      for (const bookId of bookIds) {
        try {
          const bookResponse = await fetch(`${API_URL}/books/${bookId}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          const bookData = await bookResponse.json();
          
          if ((bookData.success || bookData.status) && bookData.data) {
            // Find reading progress for this book
            const history = readingHistory.find(h => h.book_id === bookId);
            
            // Combine book data with reading progress
            const bookWithProgress = {
              ...bookData.data,
              reading_progress: history ? {
                current_page: history.current_page,
                total_pages: history.total_pages,
                percentage: history.percentage,
                last_read_at: history.last_read_at
              } : null
            };
            
            books.push(bookWithProgress);
          }
        } catch (error) {
          console.error(`📚 Error fetching book ${bookId}:`, error);
        }
      }
      
      if (books.length > 0) {
        console.log(`📚 Loaded ${books.length} recently read books`);
        // Sort books by last read time if available
        books.sort((a, b) => {
          const timeA = a.reading_progress?.last_read_at ? new Date(a.reading_progress.last_read_at).getTime() : 0;
          const timeB = b.reading_progress?.last_read_at ? new Date(b.reading_progress.last_read_at).getTime() : 0;
          return timeB - timeA; // Most recent first
        });
        setRecentlyReadBooks(books);
      } else {
        console.log('📚 No book details could be loaded');
      }
    } catch (error) {
      console.error('📚 Error loading book details:', error);
    }
  };

  // Process the books before display to ensure valid items
  const processedBooks = useMemo(() => {
    if (!recentlyReadBooks || !Array.isArray(recentlyReadBooks) || recentlyReadBooks.length === 0) {
      console.log('📚 No books to process or invalid data');
      return [];
    }
    
    const processed = recentlyReadBooks
      .filter(book => book && (book.id || book._id || book.book_id)) // Filter out invalid books
      .map((book, index) => {
        // Get cover image from any available field
        let coverImage = null;
        if (book.cover_image) {
          coverImage = book.cover_image;
        } else if (book.image) {
          coverImage = book.image;
        } else if (book.image_book) {
          coverImage = book.image_book;
        }
        
        // Add domain to image path if it's a relative URL
        if (coverImage && !coverImage.startsWith('http')) {
          coverImage = `${API_URL}/${coverImage.replace(/^\//, '')}`;
        }
        
        // Normalize the book structure
        const normalizedBook = {
          ...book,
          id: book.id || book._id || book.book_id, // Use any available ID
          name_book: book.name_book || book.title || 'Không có tiêu đề',
          cover_image: coverImage,
          key: `book-${book.id || book._id || book.book_id || index}`
        };
        
        return normalizedBook;
      });
    
    console.log(`📚 Processed ${processed.length} books`);
    return processed;
  }, [recentlyReadBooks]);

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return processedBooks;
    }

    const normalizedQuery = searchQuery.toLowerCase().trim();
    const normalizedQueryNoAccents = removeVietnameseAccents(normalizedQuery);
    
    return processedBooks.filter(book => {
      // Chuẩn hóa tiêu đề sách (cả có dấu và không dấu)
      const title = (book.name_book || book.title || '').toLowerCase();
      const titleNoAccents = removeVietnameseAccents(title);
      
      // Chuẩn hóa tên tác giả (cả có dấu và không dấu)
      const authorName = typeof book.author === 'string' 
        ? book.author.toLowerCase() 
        : (book.author && book.author.name_author 
          ? book.author.name_author.toLowerCase() 
          : '');
      const authorNameNoAccents = removeVietnameseAccents(authorName);
      
      // Tìm kiếm theo cả chuỗi có dấu và không dấu
      return title.includes(normalizedQuery) || 
             titleNoAccents.includes(normalizedQueryNoAccents) ||
             authorName.includes(normalizedQuery) ||
             authorNameNoAccents.includes(normalizedQueryNoAccents);
    });
  }, [processedBooks, searchQuery]);

  // Handle viewing a book
  const handleViewBook = (bookId, bookTitle) => {
    if (!bookId) {
      console.log('📚 Cannot view book: Missing book ID');
      return;
    }
    
    console.log(`📚 Opening book: ID=${bookId}, Title=${bookTitle}`);
    
    router.push({
      pathname: '/BookViewer',
      params: { 
        bookId: bookId.toString(), // Ensure ID is a string
        bookTitle: bookTitle || 'Không có tiêu đề'
      }
    });
  };

  // Handle dismissing keyboard when tapping outside search
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setIsSearchFocused(false);
  };

  // Clear search and reset focus
  const clearSearch = () => {
    setSearchQuery('');
    dismissKeyboard();
  };

  const renderItem = ({ item }) => {
    // Make sure we have a valid ID to use
    const bookId = item.id || item._id || item.book_id;
    const bookTitle = item.name_book || item.title || "Không có tiêu đề";
    
    // Log cover image for debugging
    const coverImage = item.cover_image || 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png';
    
    return (
      <TouchableOpacity
        className="mb-4 mx-2"
        style={{ width: ITEM_WIDTH }}
        onPress={() => handleViewBook(bookId, bookTitle)}
      >
        <View
          className="rounded-lg mb-2 shadow-md bg-blue-50 justify-center items-center overflow-hidden"
          style={{ width: ITEM_WIDTH, height: ITEM_WIDTH * 1.4 }}
        >
          {coverImage ? (
            <Image
              source={{ uri: coverImage }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onError={(e) => console.log(`📚 Image error for ${bookTitle}:`, e.nativeEvent.error)}
            />
          ) : (
            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e6f0ff' }}>
              <Icon name="book" size={40} color="#0064e1" />
            </View>
          )}
        </View>
        
        <Text
          className="font-semibold text-sm mb-0.5"
          numberOfLines={2}
        >
          {bookTitle}
        </Text>
        
        <Text className="text-gray-500 text-xs mb-1" numberOfLines={1}>
          {typeof item.author === 'string' ? item.author : 
          (item.author && item.author.name_author) ? item.author.name_author : 
          'Không rõ tác giả'}
        </Text>

        {item.reading_progress && (
          <View className="flex-row items-center mt-1">
            <View className="h-1 bg-gray-200 rounded-full flex-1 mr-2">
              <View
                className="h-1 bg-blue-500 rounded-full"
                style={{ width: `${item.reading_progress.percentage || 0}%` }}
              />
            </View>
            <Text className="text-gray-400 text-xs">
              {item.reading_progress.percentage || 0}%
            </Text>
          </View>
        )}

        {item.reading_progress?.last_read_at && (
          <Text className="text-gray-400 text-xs mt-1">
            {new Date(item.reading_progress.last_read_at).toLocaleDateString("vi-VN")}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <ActivityIndicator size="large" color="#0064e1" />
        <Text className="mt-4 text-gray-600">Đang tải sách...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <View className="flex-row items-center bg-gray-50 px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">Sách Đã Đọc Gần Đây</Text>
      </View>
      
      {/* Search bar */}
      <View className="px-4 py-2 bg-gray-100">
        <View className="flex-row items-center bg-white rounded-lg px-3 py-1 border border-gray-200">
          <Icon name="search" size={20} color="#0064e1" />
          <TextInput
            className="flex-1 ml-2 text-base py-2"
            placeholder="Tìm kiếm sách theo tên, tác giả..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch}>
              <Icon name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        {searchQuery && (
          <View className="flex-row justify-end mt-2">
            <TouchableOpacity onPress={clearSearch} className="flex-row items-center">
              <Text className="text-blue-500 font-medium mr-1">Xóa tìm kiếm</Text>
              <Icon name="clear-all" size={18} color="#0064e1" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Touch handler to dismiss keyboard */}
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={dismissKeyboard}
        style={{ flex: 1 }}
      >
        {processedBooks.length > 0 ? (
          <>
            {filteredBooks.length > 0 ? (
              <FlatList
                data={filteredBooks}
                renderItem={renderItem}
                keyExtractor={(item) => item.key}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: SPACING }}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={dismissKeyboard}
              />
            ) : (
              <View className="flex-1 justify-center items-center p-4">
                <Icon name="search-off" size={60} color="#cbd5e1" />
                <Text className="text-gray-400 text-lg mt-4 text-center">
                  Không tìm thấy sách nào khớp với "{searchQuery}"
                </Text>
                <TouchableOpacity 
                  onPress={clearSearch}
                  className="mt-4 px-4 py-2 bg-blue-500 rounded-lg"
                >
                  <Text className="text-white font-medium">Xóa tìm kiếm</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View className="flex-1 justify-center items-center p-4">
            <Icon name="library-books" size={60} color="#cbd5e1" />
            <Text className="text-gray-400 text-lg mt-4">Bạn chưa đọc sách nào gần đây</Text>
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
} 