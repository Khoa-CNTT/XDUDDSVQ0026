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
  TextInput,
  Modal,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import * as FileSystem from 'expo-file-system';
import RenderBookItem from "../components/Home/RenderBookItem"
import SectionHeader from '../components/SectionHeader';
import booksData from '../../assets/booksData';

// Tính toán kích thước phù hợp
const { width } = Dimensions.get("window");
const THUMBNAIL_SIZE = 60; // Kích thước cố định cho hình thu nhỏ

// Các loại định dạng file được hỗ trợ - dựa theo OpenReadEra
const FILE_FORMATS = [
  { id: 'pdf', name: 'PDF', icon: 'document-text', color: '#e53935' },
  { id: 'epub', name: 'EPUB/FB2', icon: 'book', color: '#43a047' },
  { id: 'doc', name: 'DOC/DOCX', icon: 'document', color: '#1e88e5' },
  { id: 'txt', name: 'TXT', icon: 'text', color: '#757575' },
];

const SPACING = 16;

export default function Library() {
  const router = useRouter();
  const [pdfs, setPdfs] = useState([]);
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const [pdfReadingProgress, setPdfReadingProgress] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormatFilter, setShowFormatFilter] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'size'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showCreateShelf, setShowCreateShelf] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [bookshelves, setBookshelves] = useState([]);
  const [savedBooks, setSavedBooks] = useState([]);
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [apiBooks, setApiBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Sử dụng useEffect để tải dữ liệu
  useEffect(() => {
    loadReadingProgress();
    loadBookshelves();
    fetchBooksFromAPI();
    loadSavedBooks();
    loadFavoriteBooks();
  }, []);
  
  // Sử dụng useFocusEffect để tải lại dữ liệu mỗi khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      loadReadingProgress();
      fetchPDFs();
      
      // Set up listener for reading progress updates
      const checkForProgressUpdates = async () => {
        try {
          const lastUpdate = await AsyncStorage.getItem('reading_progress_updated');
          if (lastUpdate && lastUpdate !== lastCheckedUpdate.current) {
            console.log('Reading progress was updated, refreshing library data...');
            lastCheckedUpdate.current = lastUpdate;
            loadReadingProgress();
            fetchPDFs();
          }
        } catch (error) {
          console.error('Error checking for reading progress updates:', error);
        }
      };
      
      // Check immediately and set up interval
      checkForProgressUpdates();
      const updateInterval = setInterval(checkForProgressUpdates, 3000); // Check every 3 seconds
      
      return () => {
        clearInterval(updateInterval);
      };
    }, [selectedFormat, sortBy, sortDirection, searchQuery])
  );
  
  // Reference to track last checked update time
  const lastCheckedUpdate = React.useRef('');
  
  // Function để tính toán tiến độ đọc một cách nhất quán
  const getReadingProgressForPdf = (pdfId) => {
    const progress = pdfReadingProgress[pdfId];
    if (!progress) return 0;
    
    // First use saved percentage if available
    if (progress.percentage) {
      return parseInt(progress.percentage, 10);
    }
    
    // Otherwise calculate from page and total
    if (progress.page && progress.total) {
      return Math.floor((progress.page / progress.total) * 100) || 0;
    }
    
    return 0;
  };
  
  // Tải dữ liệu giá sách từ AsyncStorage
  const loadBookshelves = async () => {
    try {
      const shelvesData = await AsyncStorage.getItem('bookshelves');
      if (shelvesData) {
        setBookshelves(JSON.parse(shelvesData));
      } else {
        // Khởi tạo các kệ sách mặc định (như OpenReadEra)
        const defaultShelves = [
          {
            id: 'favorites',
            name: 'Yêu thích',
            icon: 'heart',
            color: '#e91e63',
            books: []
          },
          {
            id: 'reading',
            name: 'Đang đọc',
            icon: 'book-open',
            color: '#2196f3',
            books: []
          },
          {
            id: 'completed',
            name: 'Đã hoàn thành',
            icon: 'checkmark-circle',
            color: '#4caf50',
            books: []
          }
        ];
        setBookshelves(defaultShelves);
        await AsyncStorage.setItem('bookshelves', JSON.stringify(defaultShelves));
      }
    } catch (error) {
      console.error('Error loading bookshelves:', error);
    }
  };
  
  // Lưu giá sách vào AsyncStorage
  const saveBookshelves = async (shelves) => {
    try {
      await AsyncStorage.setItem('bookshelves', JSON.stringify(shelves));
    } catch (error) {
      console.error('Error saving bookshelves:', error);
    }
  };
  
  // Thêm sách vào giá sách
  const addToBookshelf = async (pdfId, shelfId) => {
    const updatedShelves = bookshelves.map(shelf => {
      if (shelf.id === shelfId) {
        // Kiểm tra nếu sách đã tồn tại trong kệ
        if (!shelf.books.includes(pdfId)) {
          return {
            ...shelf,
            books: [...shelf.books, pdfId]
          };
        }
      }
      return shelf;
    });
    
    setBookshelves(updatedShelves);
    await saveBookshelves(updatedShelves);
  };
  
  // Xóa sách khỏi giá sách
  const removeFromBookshelf = async (pdfId, shelfId) => {
    const updatedShelves = bookshelves.map(shelf => {
      if (shelf.id === shelfId) {
        return {
          ...shelf,
          books: shelf.books.filter(id => id !== pdfId)
        };
      }
      return shelf;
    });
    
    setBookshelves(updatedShelves);
    await saveBookshelves(updatedShelves);
  };
  
  // Tạo giá sách mới
  const createNewShelf = async () => {
    if (!newShelfName.trim()) return;
    
    const newShelf = {
      id: 'shelf_' + Date.now(),
      name: newShelfName.trim(),
      icon: 'bookmarks',
      color: '#ff9800', // Màu mặc định
      books: []
    };
    
    const updatedShelves = [...bookshelves, newShelf];
    setBookshelves(updatedShelves);
    await saveBookshelves(updatedShelves);
    setNewShelfName('');
    setShowCreateShelf(false);
  };

  // Thay đổi cách sắp xếp
  const toggleSortOption = (option) => {
    if (sortBy === option) {
      // Nếu đang chọn cùng loại sắp xếp, đảo ngược hướng sắp xếp
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nếu chọn loại sắp xếp mới, mặc định là giảm dần (desc)
      setSortBy(option);
      setSortDirection('desc');
    }
    setShowSortOptions(false);
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
            try {
              const pdfId = key.replace('pdf_progress_', '');
              const progress = JSON.parse(value);
              progressData[pdfId] = progress;
            } catch (parseError) {
              console.error('Error parsing progress data:', parseError);
            }
          }
        });
        
        setPdfReadingProgress(progressData);
        console.log('Loaded reading progress from local storage for', Object.keys(progressData).length, 'PDFs');
      }
    } catch (error) {
      console.error('Error loading reading progress:', error);
    }
  };

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
      
      // Check if response is OK
      if (!response.ok) {
        console.log(`Server responded with status: ${response.status}`);
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      // Safer way to parse JSON response
      let data;
      try {
        const textResponse = await response.text();
        // Check if response starts with <!DOCTYPE html> or other HTML indicators
        if (textResponse.trim().startsWith('<!DOCTYPE') || 
            textResponse.trim().startsWith('<html') || 
            textResponse.includes('<body')) {
          console.error('Received HTML instead of JSON');
          throw new Error('Received HTML instead of JSON');
        }
        
        // Check if response is empty
        if (!textResponse || textResponse.trim() === '') {
          console.error('Empty response from server');
          throw new Error('Empty response from server');
        }
        
        // Try to parse the JSON
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('JSON Parse error:', parseError.message);
        console.log('Response begins with:', response.status, response.statusText);
        setPdfs([]);
        setLoadingPdfs(false);
        throw new Error('Failed to parse server response. Please try again later.');
      }
      
      if (data.success) {
        let filteredDocs = data.data;
        
        // Process PDFs and enhance with reading progress
        filteredDocs = filteredDocs.map(doc => {
          // Always recalculate progress using the common function
          const progress = getReadingProgressForPdf(doc.id);
          return {
            ...doc,
            progress
          };
        });
        
        // Lọc theo định dạng (nếu có)
        if (selectedFormat) {
          // Giả định: theo các file đuôi để lọc
          filteredDocs = filteredDocs.filter(doc => {
            const fileName = doc.file_name?.toLowerCase() || '';
            
            switch(selectedFormat) {
              case 'pdf':
                return fileName.endsWith('.pdf');
              case 'epub':
                return fileName.endsWith('.epub') || fileName.endsWith('.fb2');
              case 'doc':
                return fileName.endsWith('.doc') || fileName.endsWith('.docx');
              case 'txt':
                return fileName.endsWith('.txt');
              default:
                return true;
            }
          });
        }
        
        // Lọc theo từ khóa tìm kiếm
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredDocs = filteredDocs.filter(doc => 
            doc.title?.toLowerCase().includes(query) || 
            doc.description?.toLowerCase().includes(query)
          );
        }
        
        // Sắp xếp theo lựa chọn
        const isAsc = sortDirection === 'asc';
        
        switch(sortBy) {
          case 'name':
            filteredDocs.sort((a, b) => {
              const titleA = (a.title || '').toLowerCase();
              const titleB = (b.title || '').toLowerCase();
              const compareResult = titleA.localeCompare(titleB, 'vi');
              return isAsc ? compareResult : -compareResult;
            });
            break;
            
          case 'size':
            filteredDocs.sort((a, b) => {
              const sizeA = a.file_size || 0;
              const sizeB = b.file_size || 0;
              return isAsc ? sizeA - sizeB : sizeB - sizeA;
            });
            break;
            
          case 'recent':
          default:
            filteredDocs.sort((a, b) => {
              const dateA = new Date(a.updated_at || a.created_at || 0);
              const dateB = new Date(b.updated_at || b.created_at || 0);
              return isAsc ? dateA - dateB : dateB - dateA;
            });
            break;
        }
        
        setPdfs(filteredDocs);
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
  
  // Render từng PDF item
  const renderPdfItem = ({ item }) => {
    // Always recalculate reading progress at render time
    const progressPercent = getReadingProgressForPdf(item.id);
    
    // Lấy danh sách các kệ sách chứa cuốn sách này
    const containingShelves = bookshelves.filter(shelf => 
      shelf.books.includes(item.id.toString())
    );
    
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
          
          {/* Hiển thị các kệ sách chứa quyển này */}
          {containingShelves.length > 0 && (
            <View className="flex-row mt-2">
              {containingShelves.slice(0, 3).map(shelf => (
                <View 
                  key={shelf.id}
                  className="px-2 py-1 rounded-full mr-1"
                  style={{ backgroundColor: `${shelf.color}20` }}
                >
                  <Text className="text-xs" style={{ color: shelf.color }}>
                    {shelf.name}
                  </Text>
                </View>
              ))}
              {containingShelves.length > 3 && (
                <Text className="text-xs text-gray-500 ml-1">+{containingShelves.length - 3}</Text>
              )}
            </View>
          )}
        </View>
        
        {/* Menu dropdown */}
        <TouchableOpacity 
          className="p-2" 
          onPress={() => {
            // Tạo menu context cho sách
            // (tính năng này sẽ được triển khai đầy đủ sau)
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#0064e1" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  
  // Render kệ sách item
  const renderBookshelfItem = ({ item }) => {
    const booksInShelf = bookshelves.find(s => s.id === item.id)?.books || [];
    
    return (
      <TouchableOpacity
        className="flex-row items-center py-3 border-b border-gray-100"
        onPress={() => {
          // Navigation to bookshelf detail view would go here
        }}
      >
        {/* Icon */}
        <View 
          className="w-12 h-12 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: `${item.color}20` }}
        >
          <Ionicons name={item.icon} size={24} color={item.color} />
        </View>
        
        {/* Title and info */}
        <View className="flex-1">
          <Text className="text-base font-medium">{item.name}</Text>
          <Text className="text-sm text-gray-500 mt-1">
            {booksInShelf.length} sách
          </Text>
        </View>
        
        {/* More options */}
        <TouchableOpacity className="p-2">
          <Ionicons name="chevron-forward" size={18} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  
  // Tiêu đề phần
  const SectionTitle = ({ title, onAction, actionText }) => (
    <View className="flex-row justify-between items-center mb-4">
      <Text className="text-2xl font-bold">{title}</Text>
      {actionText && (
        <TouchableOpacity onPress={onAction}>
          <Text className="text-blue-500">{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Lấy tên và biểu tượng sắp xếp hiện tại
  const getSortInfo = () => {
    let name = '';
    let iconName = '';
    
    switch(sortBy) {
      case 'name':
        name = 'A-Z';
        iconName = sortDirection === 'asc' ? 'arrow-up' : 'arrow-down';
        break;
      case 'size':
        name = 'Kích thước';
        iconName = sortDirection === 'asc' ? 'arrow-up' : 'arrow-down';
        break;
      case 'recent':
      default:
        name = 'Gần đây';
        iconName = sortDirection === 'asc' ? 'arrow-up' : 'arrow-down';
        break;
    }
    
    return { name, iconName };
  };

  const sortInfo = getSortInfo();

  const fetchBooksFromAPI = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
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
        }));
        
        setApiBooks(books);
      } else {
        console.warn("API trả về dữ liệu không đúng cấu trúc");
        
        // Sử dụng dữ liệu local nếu API không hoạt động
        const localBooks = [
          ...booksData.featuredBooks,
          ...booksData.bestSellers,
          ...booksData.freeBooks
        ];
        setApiBooks(localBooks);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setError("Lỗi khi tải dữ liệu sách");
      
      // Sử dụng dữ liệu local nếu API không hoạt động
      const localBooks = [
        ...booksData.featuredBooks,
        ...booksData.bestSellers,
        ...booksData.freeBooks
      ];
      setApiBooks(localBooks);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedBooks = async () => {
    try {
      const savedBookIds = await AsyncStorage.getItem('savedBooks');
      if (savedBookIds) {
        const bookIds = JSON.parse(savedBookIds);
        
        // Kết hợp sách từ API và sách local
        const allBooks = [
          ...apiBooks,
          ...booksData.featuredBooks,
          ...booksData.bestSellers,
          ...booksData.freeBooks
        ];
        
        // Tìm sách dựa trên ID hoặc book_id
        const savedBooksData = allBooks.filter(book => {
          const bookId = book.id || book.book_id;
          return bookIds.some(id => id === bookId || 
            // Kiểm tra thêm trường hợp ID với tiền tố BOOK
            (bookId && bookId.startsWith('BOOK') && id === bookId) || 
            (id && id.startsWith('BOOK') && id === bookId));
        });
        
        setSavedBooks(savedBooksData);
      } else {
        setSavedBooks([]);
      }
    } catch (error) {
      console.error('Error loading saved books:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách sách đã lưu');
    }
  };

  const loadFavoriteBooks = async () => {
    try {
      const favoriteBookIds = await AsyncStorage.getItem('favoriteBooks');
      if (favoriteBookIds) {
        const bookIds = JSON.parse(favoriteBookIds);
        
        // Kết hợp sách từ API và sách local
        const allBooks = [
          ...apiBooks,
          ...booksData.featuredBooks,
          ...booksData.bestSellers,
          ...booksData.freeBooks
        ];
        
        // Tìm sách dựa trên ID hoặc book_id
        const favoriteBooksData = allBooks.filter(book => {
          const bookId = book.id || book.book_id;
          return bookIds.some(id => id === bookId || 
            // Kiểm tra thêm trường hợp ID với tiền tố BOOK
            (bookId && bookId.startsWith('BOOK') && id === bookId) || 
            (id && id.startsWith('BOOK') && id === bookId));
        });
        
        setFavoriteBooks(favoriteBooksData);
      } else {
        setFavoriteBooks([]);
      }
    } catch (error) {
      console.error('Error loading favorite books:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách sách yêu thích');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBooksFromAPI();
    await loadSavedBooks();
    await loadFavoriteBooks();
    setRefreshing(false);
  };

  const renderSection = ({ section }) => {
    return (
      <View key={section.id}>
        <SectionHeader title={section.title} />
        {section.data.length > 0 ? (
          <FlatList
            data={section.data}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <RenderBookItem item={item} />}
            keyExtractor={(item) => item.id || item.book_id}
            contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING * 2 }}
          />
        ) : (
          <View className="px-4 py-8 items-center">
            <Text className="text-gray-500">Chưa có sách nào trong danh mục này</Text>
          </View>
        )}
      </View>
    );
  };

  const sections = [
    { id: 'saved', title: 'Đã Lưu', data: savedBooks },
    { id: 'favorites', title: 'Yêu Thích', data: favoriteBooks },
  ];

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-500">Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-4xl font-bold mt-2">Thư Viện</Text>
        
        {/* Thanh tìm kiếm - dựa theo OpenReadEra */}
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 my-4">
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            className="flex-1 py-2 px-2"
            placeholder="Tìm kiếm sách..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchPDFs}
          />
          {searchQuery ? (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                fetchPDFs();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        {/* Bộ lọc và sắp xếp */}
        <View className="flex-row justify-between mb-4">
          {/* Lọc theo định dạng */}
          <TouchableOpacity 
            className="flex-row items-center bg-white px-3 py-2 rounded-full border border-gray-200"
            onPress={() => setShowFormatFilter(!showFormatFilter)}
          >
            <Ionicons name="funnel-outline" size={16} color="#666" />
            <Text className="ml-1 text-sm">
              {selectedFormat ? FILE_FORMATS.find(f => f.id === selectedFormat)?.name : 'Tất cả'}
            </Text>
          </TouchableOpacity>
          
          {/* Sắp xếp */}
          <TouchableOpacity 
            className="flex-row items-center bg-white px-3 py-2 rounded-full border border-gray-200"
            onPress={() => setShowSortOptions(!showSortOptions)}
          >
            <Ionicons name="swap-vertical-outline" size={16} color="#666" />
            <Text className="ml-1 text-sm">{sortInfo.name}</Text>
            <Ionicons name={sortInfo.iconName} size={12} color="#666" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
        
        {/* Tùy chọn lọc định dạng */}
        {showFormatFilter && (
          <View className="bg-white rounded-lg p-2 mb-4 border border-gray-200">
            <TouchableOpacity 
              className="flex-row items-center py-2 px-2"
              onPress={() => {
                setSelectedFormat(null);
                setShowFormatFilter(false);
                fetchPDFs();
              }}
            >
              <Ionicons 
                name={!selectedFormat ? "radio-button-on" : "radio-button-off"} 
                size={20} 
                color="#0064e1"
              />
              <Text className="ml-2">Tất cả định dạng</Text>
            </TouchableOpacity>
            
            {FILE_FORMATS.map(format => (
              <TouchableOpacity 
                key={format.id}
                className="flex-row items-center py-2 px-2"
                onPress={() => {
                  setSelectedFormat(format.id);
                  setShowFormatFilter(false);
                  fetchPDFs();
                }}
              >
                <Ionicons 
                  name={selectedFormat === format.id ? "radio-button-on" : "radio-button-off"} 
                  size={20} 
                  color={format.color}
                />
                <Ionicons name={format.icon} size={16} color={format.color} style={{ marginLeft: 8 }} />
                <Text className="ml-2">{format.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Tùy chọn sắp xếp */}
        {showSortOptions && (
          <View className="bg-white rounded-lg p-2 mb-4 border border-gray-200">
            {[
              { id: 'recent', name: 'Gần đây nhất', icon: 'time-outline' },
              { id: 'name', name: 'A-Z', icon: 'text-outline' },
              { id: 'size', name: 'Kích thước', icon: 'expand-outline' }
            ].map(option => (
              <TouchableOpacity 
                key={option.id}
                className="flex-row items-center py-2 px-2"
                onPress={() => toggleSortOption(option.id)}
              >
                <Ionicons 
                  name={sortBy === option.id ? "radio-button-on" : "radio-button-off"} 
                  size={20} 
                  color="#0064e1"
                />
                <Ionicons name={option.icon} size={16} color="#666" style={{ marginLeft: 8 }} />
                <Text className="ml-2">{option.name}</Text>
                
                {sortBy === option.id && (
                  <Ionicons 
                    name={sortDirection === 'asc' ? "arrow-up" : "arrow-down"} 
                    size={16} 
                    color="#0064e1" 
                    style={{ marginLeft: 8 }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        
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
        
        {/* Sách & Tài Liệu có thể đọc */}
        <View className="mt-6">
          <SectionTitle title="Sách & Tài Liệu" />
          
          {loadingPdfs ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#0064e1" />
              <Text className="mt-4 text-gray-600">Đang tải danh sách PDF...</Text>
            </View>
          ) : pdfs.length > 0 ? (
            <FlatList
              data={pdfs}
              renderItem={renderPdfItem}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              ListFooterComponent={() => (
                <Text className="text-center text-gray-500 my-4 text-xs">
                  {pdfs.length} tài liệu
                </Text>
              )}
            />
          ) : (
            <View className="py-6 items-center">
              <Ionicons name="book-outline" size={50} color="#cccccc" />
              <Text className="mt-4 text-gray-500 text-center">
                {searchQuery 
                  ? 'Không tìm thấy tài liệu nào phù hợp' 
                  : selectedFormat 
                    ? `Không tìm thấy tài liệu ${FILE_FORMATS.find(f => f.id === selectedFormat)?.name}`
                    : 'Bạn chưa có tài liệu nào. Hãy tải lên để bắt đầu đọc!'}
              </Text>
              <TouchableOpacity 
                className="mt-4 bg-blue-500 px-6 py-2 rounded-full"
                onPress={handleAddBooks}
              >
                <Text className="text-white font-semibold">Tải tài liệu</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      
      <View className="h-24" />
    </SafeAreaView>
  );
}
