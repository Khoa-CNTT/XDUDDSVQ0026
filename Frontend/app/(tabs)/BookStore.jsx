import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { API_URL } from '../config';
import RenderBookItem from "../components/BookStore/RenderBookItem";
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.9;
const SPACING = 16;

// Carousel Banner Component
const BookBanner = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);
  
  const onScroll = useCallback((event) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(scrollX.value / ITEM_WIDTH);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  }, [activeIndex, ITEM_WIDTH]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % data.length;
        return nextIndex;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [data.length]);

  useEffect(() => {
    scrollX.value = withSpring(activeIndex * ITEM_WIDTH);
  }, [activeIndex]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      className="w-[90vw] h-[200px] rounded-2xl overflow-hidden mx-2"
    >
      <Image
        source={typeof item.image === 'string' ? { uri: item.image } : item.image}
        className="w-full h-full object-cover"
      />
      
      <View className="absolute left-0 right-0 bottom-0 h-[70%] rounded-2xl bg-black/50 opacity-90" />
      
      {item.badge && (
        <View className="absolute top-4 right-4 px-3 py-1.5 rounded-full" style={{ backgroundColor: item.color || '#ff5a5f' }}>
          <Text className="text-white font-bold text-xs">{item.badge}</Text>
        </View>
      )}
      
      <View className="absolute bottom-0 left-0 right-0 p-4">
        <Text className="text-white text-2xl font-bold mb-1 text-shadow">{item.title}</Text>
        <Text className="text-white text-sm mb-3 text-shadow">{item.subtitle}</Text>
        
        <TouchableOpacity 
          className="px-4 py-2 rounded-full self-start"
          style={{ backgroundColor: item.color || '#ff5a5f' }}
        >
          <Text className="text-white font-bold text-xs">{item.buttonText}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="my-4">
      <Animated.FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        onScroll={onScroll}
        contentContainerClassName="px-4"
      />
      
      <View className="flex-row justify-center items-center mt-4">
        {data.map((_, i) => (
          <TouchableOpacity
            key={`dot-${i}`}
            className={`h-2 mx-1 rounded-full ${activeIndex === i ? 'w-5' : 'w-2'}`}
            style={{ backgroundColor: activeIndex === i ? '#ff5a5f' : '#ccc' }}
            onPress={() => setActiveIndex(i)}
          />
        ))}
      </View>
    </View>
  );
};

// Category Button Component
const CategoryButton = ({ category, count, isActive, onPress }) => (
  <TouchableOpacity 
    onPress={onPress} 
    className={`flex-row items-center py-2 px-4 rounded-full mx-1 ${isActive ? 'bg-[#ff5a5f]' : 'bg-gray-100'}`}
  >
    <Text className={`font-medium ${isActive ? 'text-white' : 'text-gray-600'}`}>
      {category.name_category}
    </Text>
    <View className={`ml-2 px-2 py-0.5 rounded-full ${isActive ? 'bg-white/30' : 'bg-gray-200'}`}>
      <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
        {count}
      </Text>
    </View>
  </TouchableOpacity>
);

// Section Header Component
const SectionHeader = ({ title, onSeeAll }) => (
  <View className="flex-row justify-between items-center px-4 mb-3">
    <Text className="text-lg font-bold text-gray-800">{title}</Text>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll}>
        <Text className="text-[#ff5a5f] font-medium">Xem tất cả</Text>
      </TouchableOpacity>
    )}
  </View>
);

// BookList Horizontal Component
const BookListHorizontal = ({ data, title, handleBookPress }) => (
  <View className="my-3">
    <SectionHeader title={title} />
    <View className="px-1">
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <RenderBookItem item={item} onPress={handleBookPress} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 4 }}
        ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
        ListEmptyComponent={
          <View className="p-5 items-center">
            <Text className="text-gray-400 text-sm">Không có sách nào</Text>
          </View>
        }
      />
    </View>
  </View>
);

// Main BookStore Component
export default function BookStore() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [books, setBooks] = useState([]);
  const [categorizedBooks, setCategorizedBooks] = useState({});
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Xử lý khi sách được nhấn
  const handleBookPress = (book) => {
    // Luôn chuyển đến trang chi tiết sách bất kể có file_path hay không
    router.push(`/Books/${book.id || book.book_id}`);
  };

  // Banner data
  const bannerData = [
    {
      id: 1,
      title: 'Sách phổ biến năm 2023',
      subtitle: 'Những cuốn sách đáng đọc nhất năm',
      description: 'Khám phá bộ sưu tập sách bán chạy nhất với nhiều chủ đề hấp dẫn từ văn học đến kinh doanh',
      image: require('../../assets/images/bia1.png'),
      badge: 'HOT',
      color: '#ff5a5f',
      buttonText: 'Khám phá ngay'
    },
    {
      id: 2,
      title: 'Tuần Lễ Sách Giảm Giá',
      subtitle: 'Giảm đến 70% toàn bộ sách',
      description: 'Cơ hội vàng sưu tầm những tác phẩm nổi tiếng với mức giá không thể tốt hơn',
      image: require('../../assets/images/bia2.png'),
      badge: 'SALE',
      color: '#2e86de',
      buttonText: 'Mua ngay'
    },
    {
      id: 3,
      title: 'Văn Học Việt Nam',
      subtitle: 'Tác phẩm kinh điển Việt Nam',
      description: 'Bộ sưu tập đặc biệt từ các tác giả Việt Nam nổi tiếng, phản ánh giá trị văn hóa dân tộc',
      image: require('../../assets/images/bia3.png'),
      badge: 'ĐẶC BIỆT',
      color: '#20bf6b',
      buttonText: 'Xem bộ sưu tập'
    }
  ];

  // Effect to load data on component mount
  useEffect(() => {
    const abortController = new AbortController();
    console.log('📚 BookStore mounted, loading data...');
    
    const loadDataOnMount = async () => {
      try {
        await loadData(abortController.signal);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error loading data:', error);
        }
      }
    };

    loadDataOnMount();

    return () => {
      console.log('📚 BookStore unmounting, aborting requests...');
      abortController.abort();
    };
  }, []);

  // Effect to focus on category when changed
  useFocusEffect(
    React.useCallback(() => {
      console.log('📚 BookStore tab focused');
      let isFocused = true;
      
      const checkAndSetCategory = () => {
        if (isFocused && categories.length > 0 && !activeCategory) {
          console.log('📚 Setting active category:', categories[0]?.name_category);
          setActiveCategory(categories[0]?.category_id);
        }
      };
      
      checkAndSetCategory();
      
      return () => {
        console.log('📚 BookStore tab unfocused');
        isFocused = false;
      };
    }, [categories, activeCategory])
  );

  // Load data from API with signal
  const loadData = async (signal) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchBooks(signal),
        fetchCategories(signal)
      ]);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error loading data:', error);
        setError('Không thể tải dữ liệu, vui lòng thử lại sau');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    const refreshController = new AbortController();
    try {
      await loadData(refreshController.signal);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error refreshing data:', error);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch books from API with proper signal handling
  const fetchBooks = async (signal) => {
    try {
      console.log('📚 Fetching books...');
      const booksResponse = await fetch(`${API_URL}/books`, { signal });
      const booksData = await booksResponse.json();
      
      if (booksData.status && booksData.data) {
        console.log(`📚 Received ${booksData.data.length} books`);
        const processedBooks = booksData.data.map(book => ({
          id: book.book_id,
          title: book.name_book,
          author: book.author ? book.author.name_author : 'Không rõ tác giả',
          image: book.image,
          file_path: book.file_path,
          price: book.is_free ? 'Miễn phí' : `${book.price}₫`,
          rating: Math.floor(Math.random() * 5) + 1,
          category_id: book.category_id,
          description: book.description || "Mô tả sách sẽ hiển thị ở đây",
        }));
        
        setBooks(processedBooks);
        
        // Create featured and recommended books
        const randomizedBooks = [...processedBooks].sort(() => 0.5 - Math.random());
        setFeatured(randomizedBooks.slice(0, 8));
        setRecommended(randomizedBooks.slice(8, 16));
        
        // Organize books by category
        organizeBooksIntoCategories(processedBooks);
      } else {
        throw new Error('Dữ liệu không hợp lệ');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('📚 Books fetch aborted');
        throw error;
      }
      console.error('Error fetching books:', error);
      // Use default data if API fails
      useDefaultData();
    }
  };

  // Fetch categories from API with proper signal handling
  const fetchCategories = async (signal) => {
    try {
      console.log('📚 Fetching categories...');
      const categoriesResponse = await fetch(`${API_URL}/categories`, { signal });
      const categoriesData = await categoriesResponse.json();
      
      if (categoriesData.status && categoriesData.data) {
        console.log(`📚 Received ${categoriesData.data.length} categories`);
        setCategories(categoriesData.data);
        
        if (categoriesData.data.length > 0 && !activeCategory) {
          setActiveCategory(categoriesData.data[0].category_id);
        }
      } else {
        throw new Error('Dữ liệu danh mục không hợp lệ');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('📚 Categories fetch aborted');
        throw error;
      }
      console.error('Error fetching categories:', error);
      // Use default categories
      const defaultCategories = [
        { category_id: 'CAT000001', name_category: 'Văn học' },
        { category_id: 'CAT000002', name_category: 'Kinh tế' },
        { category_id: 'CAT000003', name_category: 'Thiếu nhi' }
      ];
      setCategories(defaultCategories);
      setActiveCategory(defaultCategories[0].category_id);
    }
  };

  // Organize books by category
  const organizeBooksIntoCategories = (booksData) => {
    const organizedBooks = {};
    
    booksData.forEach(book => {
      if (!organizedBooks[book.category_id]) {
        organizedBooks[book.category_id] = [];
      }
      organizedBooks[book.category_id].push(book);
    });
    
    setCategorizedBooks(organizedBooks);
  };

  // Use default data if API fails
  const useDefaultData = () => {
    const defaultBooks = [
      {
        id: 'BOOK001',
        title: 'Dế Mèn Phiêu Lưu Ký',
        author: 'Tô Hoài',
        price: 'Miễn phí',
        rating: 5,
        image: require('../../assets/images/bia1.png'),
        category_id: 'CAT000001'
      },
      {
        id: 'BOOK002',
        title: 'Đắc Nhân Tâm',
        author: 'Dale Carnegie',
        price: 'Miễn phí',
        rating: 4,
        image: require('../../assets/images/bia2.png'),
        category_id: 'CAT000002'
      },
      {
        id: 'BOOK003',
        title: 'Nhà Giả Kim',
        author: 'Paulo Coelho',
        price: 'Miễn phí',
        rating: 5,
        image: require('../../assets/images/bia3.png'),
        category_id: 'CAT000003'
      },
    ];
    
    setBooks(defaultBooks);
    setFeatured(defaultBooks);
    setRecommended(defaultBooks);
    
    const defaultCategories = [
      { category_id: 'CAT000001', name_category: 'Văn học' },
      { category_id: 'CAT000002', name_category: 'Kinh tế' },
      { category_id: 'CAT000003', name_category: 'Thiếu nhi' }
    ];
    
    setCategories(defaultCategories);
    setActiveCategory(defaultCategories[0].category_id);
    
    const organizedBooks = {};
    defaultBooks.forEach(book => {
      if (!organizedBooks[book.category_id]) {
        organizedBooks[book.category_id] = [];
      }
      organizedBooks[book.category_id].push(book);
    });
    
    setCategorizedBooks(organizedBooks);
  };

  // Get count of books in a category
  const getCategoryBooksCount = (categoryId) => {
    return categorizedBooks[categoryId]?.length || 0;
  };

  // Handle See All button for categories
  const handleSeeAllCategory = (categoryId, categoryName) => {
    router.push({
      pathname: '/CategoryBooks',
      params: { 
        categoryId, 
        categoryName,
      }
    });
  };

  // Lấy tối đa 4 quyển sách ngẫu nhiên từ danh mục
  const getRandomBooks = (books, count = 4) => {
    if (!books || books.length <= count) return books;
    
    // Tạo bản sao của mảng sách để không ảnh hưởng đến dữ liệu gốc
    const shuffled = [...books].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#ff5a5f" />
        <Text className="mt-4 text-base text-gray-500">Đang tải thư viện sách...</Text>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white p-5">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="alert-circle-outline" size={64} color="#ff5a5f" />
        <Text className="mt-4 text-base text-gray-500 text-center">{error}</Text>
        <TouchableOpacity 
          className="mt-6 px-6 py-3 bg-[#ff5a5f] rounded-lg"
          onPress={loadData}
        >
          <Text className="text-white font-bold text-base">Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-4">
        <View>
          <Text className="text-2xl font-bold text-gray-800">Thư viện sách</Text>
          <Text className="text-sm text-gray-500 mt-1">Khám phá hàng nghìn cuốn sách hay</Text>
        </View>
      </View>
      
      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="pb-32"
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#ff5a5f']}
          />
        }
      >
        {/* Banner */}
        <BookBanner data={bannerData} />
        
        {/* Featured Books */}
        <BookListHorizontal
          data={featured}
          title="Sách nổi bật"
          handleBookPress={handleBookPress}
        />
        
        {/* Categories */}
        <View className="my-3">
          <SectionHeader 
            title="Danh mục" 
            onSeeAll={() => router.push('/Categories')}
          />
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-3"
          >
            {categories.map((category) => (
              <CategoryButton
                key={category.category_id}
                category={category}
                count={getCategoryBooksCount(category.category_id)}
                isActive={activeCategory === category.category_id}
                onPress={() => setActiveCategory(category.category_id)}
              />
            ))}
          </ScrollView>
        </View>
        
        {/* Books by Category */}
        <View className="my-3 pb-2">
          <SectionHeader 
            title={categories.find(c => c.category_id === activeCategory)?.name_category || 'Danh mục'} 
            onSeeAll={() => handleSeeAllCategory(
              activeCategory, 
              categories.find(c => c.category_id === activeCategory)?.name_category
            )}
          />
          
          {categorizedBooks[activeCategory]?.length > 0 ? (
            <View className="px-3">
              <FlatList
                data={getRandomBooks(categorizedBooks[activeCategory])}
                numColumns={2}
                scrollEnabled={false}
                renderItem={({ item }) => <RenderBookItem item={item} onPress={handleBookPress} />}
                keyExtractor={(item) => item.id.toString()}
                columnWrapperStyle={{ 
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              />
            </View>
          ) : (
            <View className="py-10 px-4 items-center justify-center bg-gray-50 mx-4 mb-5 rounded-xl">
              <Ionicons name="book-outline" size={48} color="#ddd" />
              <Text className="mt-3 text-gray-400 text-center">Chưa có sách trong danh mục này</Text>
            </View>
          )}
        </View>
        
        {/* Recommended Books */}
        <BookListHorizontal
          data={recommended}
          title="Có thể bạn thích"
          handleBookPress={handleBookPress}
        />
        
        {/* Extra padding to avoid tab bar overlap */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}



