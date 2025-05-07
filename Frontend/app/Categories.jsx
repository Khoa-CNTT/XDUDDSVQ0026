import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { API_URL } from './config';

// Category component
const CategoryItem = ({ category, onPress, booksCount }) => (
  <TouchableOpacity 
    onPress={onPress} 
    className="flex-row items-center p-4 bg-white rounded-xl mb-3 shadow-sm"
    style={{ elevation: 2 }}
  >
    <View className="w-12 h-12 bg-gray-100 rounded-full justify-center items-center mr-4">
      <Ionicons name="book-outline" size={24} color="#ff5a5f" />
    </View>
    <View className="flex-1">
      <Text className="text-lg font-bold text-gray-800">{category.name_category}</Text>
      <Text className="text-sm text-gray-500">{booksCount} cuốn sách</Text>
    </View>
    <Ionicons name="chevron-forward" size={24} color="#ccc" />
  </TouchableOpacity>
);

export default function Categories() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [bookCounts, setBookCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/categories`);
      const data = await response.json();
      
      if (data.status && data.data) {
        setCategories(data.data);
        await fetchBookCounts(data.data);
      } else {
        throw new Error('Không thể tải dữ liệu danh mục');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Không thể tải dữ liệu, vui lòng thử lại sau');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch book counts for each category
  const fetchBookCounts = async (categoriesList) => {
    try {
      const counts = {};
      
      // For this example, we'll fetch all books and count them by category
      const response = await fetch(`${API_URL}/books`);
      const data = await response.json();
      
      if (data.status && data.data) {
        // Group books by category
        data.data.forEach(book => {
          if (!counts[book.category_id]) {
            counts[book.category_id] = 0;
          }
          counts[book.category_id]++;
        });
        
        setBookCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching book counts:', error);
      // If we can't get counts, just set empty counts
      const emptyCounts = {};
      categoriesList.forEach(cat => {
        emptyCounts[cat.category_id] = 0;
      });
      setBookCounts(emptyCounts);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCategories();
    setIsRefreshing(false);
  };

  // Handle category press
  const handleCategoryPress = (category) => {
    router.push({
      pathname: '/CategoryBooks',
      params: { 
        categoryId: category.category_id, 
        categoryName: category.name_category,
      }
    });
  };

  // Effect to load data on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#ff5a5f" />
        <Text className="mt-4 text-base text-gray-500">Đang tải danh mục...</Text>
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
          onPress={fetchCategories}
        >
          <Text className="text-white font-bold text-base">Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Stack.Screen 
        options={{
          title: 'Danh mục sách',
          headerBackTitleVisible: false,
        }}
      />

      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header banner */}
      <View className="bg-[#ff5a5f] p-5">
        <Text className="text-2xl font-bold text-white">Tất cả danh mục</Text>
        <Text className="text-white opacity-80 mt-1">
          Khám phá sách theo từng chủ đề yêu thích
        </Text>
      </View>
      
      {/* Categories list */}
      <View className="flex-1 px-4 pt-4">
        {categories.length > 0 ? (
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <CategoryItem 
                category={item} 
                booksCount={bookCounts[item.category_id] || 0}
                onPress={() => handleCategoryPress(item)} 
              />
            )}
            keyExtractor={(item) => item.category_id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#ff5a5f']}
              />
            }
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Ionicons name="folder-outline" size={64} color="#ddd" />
            <Text className="mt-4 text-gray-400 text-center">
              Không có danh mục nào
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
} 