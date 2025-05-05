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
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
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
      style={styles.carouselItem}
    >
      <Image
        source={typeof item.image === 'string' ? { uri: item.image } : item.image}
        style={styles.bannerImage}
      />
      
      <View style={styles.bannerGradient} />
      
      {item.badge && (
        <View style={[styles.badgeContainer, { backgroundColor: item.color || '#ff5a5f' }]}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
      
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>{item.title}</Text>
        <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
        
        <TouchableOpacity style={[styles.bannerButton, { backgroundColor: item.color || '#ff5a5f' }]}>
          <Text style={styles.bannerButtonText}>{item.buttonText}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.carouselContainer}>
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
        contentContainerStyle={styles.carouselContent}
      />
      
      <View style={styles.paginationContainer}>
        {data.map((_, i) => (
          <TouchableOpacity
            key={`dot-${i}`}
            style={[
              styles.paginationDot,
              activeIndex === i && styles.paginationDotActive,
              { backgroundColor: activeIndex === i ? '#ff5a5f' : '#ccc' }
            ]}
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
    style={[
      styles.categoryButton,
      isActive && styles.categoryButtonActive
    ]}
  >
    <Text style={[
      styles.categoryButtonText,
      isActive && styles.categoryButtonTextActive
    ]}>
      {category.name_category}
    </Text>
    <View style={[
      styles.categoryCountContainer,
      isActive && styles.categoryCountContainerActive
    ]}>
      <Text style={[
        styles.categoryCountText,
        isActive && styles.categoryCountTextActive
      ]}>
        {count}
      </Text>
    </View>
  </TouchableOpacity>
);

// Section Header Component
const SectionHeader = ({ title, onSeeAll }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.seeAllText}>Xem tất cả</Text>
      </TouchableOpacity>
    )}
  </View>
);

// BookList Horizontal Component
const BookListHorizontal = ({ data, title, onSeeAll, handleBookPress }) => (
  <View style={styles.bookListContainer}>
    <SectionHeader title={title} onSeeAll={onSeeAll} />
    <FlatList
      data={data}
      horizontal
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => <RenderBookItem item={item} onPress={handleBookPress} />}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.bookListContent}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không có sách nào</Text>
        </View>
      }
    />
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
    if (book.file_path) {
      // Chuyển đến PDF viewer
      router.push({
        pathname: '/PdfViewer',
        params: { 
          pdfPath: book.file_path, 
          pdfTitle: book.title || book.name_book,
          pdfId: book.id || book.book_id
        }
      });
    } else {
      // Chuyển đến trang chi tiết sách
      router.push(`/Books/${book.id || book.book_id}`);
    }
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

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#ff5a5f" />
        <Text style={styles.loadingText}>Đang tải thư viện sách...</Text>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="alert-circle-outline" size={64} color="#ff5a5f" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Thư viện sách</Text>
          <Text style={styles.headerSubtitle}>Khám phá hàng nghìn cuốn sách hay</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
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
          onSeeAll={() => router.push('/AllBooks?type=featured')}
          handleBookPress={handleBookPress}
        />
        
        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <SectionHeader title="Danh mục" />
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
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
        <View style={styles.categoryBooksContainer}>
          <SectionHeader 
            title={categories.find(c => c.category_id === activeCategory)?.name_category || 'Danh mục'} 
            onSeeAll={() => {
              const category = categories.find(c => c.category_id === activeCategory);
              if (category) {
                handleSeeAllCategory(category.category_id, category.name_category);
              }
            }}
          />
          
          {categorizedBooks[activeCategory]?.length > 0 ? (
            <FlatList
              data={categorizedBooks[activeCategory].slice(0, 6)}
              numColumns={2}
              scrollEnabled={false}
              renderItem={({ item }) => <RenderBookItem item={item} onPress={handleBookPress} />}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.categoryBooksContent}
              columnWrapperStyle={styles.categoryBooksColumns}
            />
          ) : (
            <View style={styles.noBooksContainer}>
              <Ionicons name="book-outline" size={48} color="#ddd" />
              <Text style={styles.noBooksText}>Chưa có sách trong danh mục này</Text>
            </View>
          )}
        </View>
        
        {/* Recommended Books */}
        <BookListHorizontal
          data={recommended}
          title="Có thể bạn thích"
          onSeeAll={() => router.push('/AllBooks?type=recommended')}
          handleBookPress={handleBookPress}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ff5a5f',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  carouselContainer: {
    marginVertical: 16,
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
  carouselItem: {
    width: ITEM_WIDTH,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    opacity: 0.9,
  },
  badgeContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  bannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  bannerSubtitle: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  bannerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#ff5a5f',
    fontWeight: '500',
  },
  bookListContainer: {
    marginVertical: 16,
  },
  bookListContent: {
    paddingHorizontal: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  categoriesContainer: {
    marginVertical: 16,
  },
  categoriesContent: {
    paddingHorizontal: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  categoryButtonActive: {
    backgroundColor: '#ff5a5f',
  },
  categoryButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  categoryCountContainer: {
    backgroundColor: '#eee',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryCountContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  categoryCountTextActive: {
    color: '#fff',
  },
  categoryBooksContainer: {
    marginVertical: 16,
  },
  categoryBooksContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  categoryBooksColumns: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  noBooksContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
  },
  noBooksText: {
    marginTop: 12,
    color: '#999',
    textAlign: 'center',
  },
  scrollViewContent: {
    paddingBottom: 120,
  },
});



