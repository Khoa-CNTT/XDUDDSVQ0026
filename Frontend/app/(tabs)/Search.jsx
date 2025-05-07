import { View, Text, TextInput, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useRouter } from 'expo-router';

export default function Search() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Lấy sách xu hướng khi component mount
  useEffect(() => {
    fetchTrendingBooks();
  }, []);

  // Tìm kiếm sách khi searchQuery thay đổi và có ít nhất 2 ký tự
  useEffect(() => {
    if (searchQuery.length > 1) {
      const delaySearch = setTimeout(() => {
        searchBooks();
      }, 500); // Trì hoãn tìm kiếm 500ms
      
      return () => clearTimeout(delaySearch);
    } else if (searchQuery.length === 0) {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchTrendingBooks = async () => {
    setInitialLoading(true);
    try {
      const response = await fetch(`${API_URL}/books/trending`);
      const data = await response.json();
      
      if (data.status) {
        setTrendingBooks(data.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy sách xu hướng:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const searchBooks = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/books/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.status) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm sách:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookPress = (book) => {
    router.push(`../Books/${book.book_id}`);
  };

  const renderBookItem = ({ item }) => (
    <TouchableOpacity 
      className="flex-row items-center p-4" 
      onPress={() => handleBookPress(item)}
    >
      {item.image ? (
        <Image 
          source={{ uri: item.image }} 
          className="w-12 h-16 rounded mr-3" 
          resizeMode="cover"
        />
      ) : (
        <View className="w-12 h-16 bg-gray-300 rounded mr-3 items-center justify-center">
          <Feather name="book" size={24} color="#666" />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-lg font-medium">{item.name_book || item.title}</Text>
        <Text className="text-gray-600">{item.author?.name_author || 'Không rõ tác giả'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTrendingItem = ({ item }) => (
    <TouchableOpacity 
      className="flex-row items-center p-4" 
      onPress={() => handleBookPress(item)}
    >
      <Feather name="trending-up" size={24} color="#0891b2" className="mr-3" />
      <View className="flex-1">
        <Text className="text-lg font-medium">{item.name_book || item.title}</Text>
        <Text className="text-gray-600">{item.author?.name_author || 'Không rõ tác giả'}</Text>
      </View>
    </TouchableOpacity>
  );

  const ItemSeparatorView = () => (
    <View className="h-[1px] w-full bg-gray-200" />
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 px-4">
        <Text className="text-4xl font-bold mb-5">Tìm Kiếm</Text>
        
        <View className="flex-row h-12 bg-gray-300 rounded-2xl items-center mb-6">
          <Feather name="search" size={24} color="#666" style={{ marginLeft: 12 }} />
          <TextInput
            className="flex-1 p-3 text-gray-700"
            placeholder="Tìm kiếm sách, tác giả..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={{ marginRight: 8 }}
            >
              <Feather name="x" size={20} color="#666" />
            </TouchableOpacity>
          )}
          {loading && <ActivityIndicator size="small" color="#0891b2" style={{ marginRight: 12 }} />}
        </View>

        {initialLoading ? (
          <ActivityIndicator size="large" color="#0891b2" className="mt-12" />
        ) : searchQuery.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={renderBookItem}
            keyExtractor={(item) => item.book_id.toString()}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={ItemSeparatorView}
            ListEmptyComponent={
              <Text className="text-center text-gray-500 mt-10">
                {loading ? 'Đang tìm kiếm...' : 'Không tìm thấy kết quả phù hợp'}
              </Text>
            }
          />
        ) : (
          <>
            <Text className="text-3xl font-bold mb-2">Xu Hướng</Text>
            <FlatList
              data={trendingBooks}
              renderItem={renderTrendingItem}
              keyExtractor={(item) => item.book_id.toString()}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={ItemSeparatorView}
              ListEmptyComponent={
                <Text className="text-center text-gray-500 mt-10">
                  Không có sách xu hướng nào
                </Text>
              }
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}