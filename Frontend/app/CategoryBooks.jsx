import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { API_URL } from "./config";
import RenderBookItem from "./components/BookStore/RenderBookItem";

export default function CategoryBooks() {
  const { categoryId, categoryName } = useLocalSearchParams();
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch books by category
  const fetchBooks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/books/category/${categoryId}`);
      const data = await response.json();

      if (data.status && data.data) {
        const processedBooks = data.data.map((book) => ({
          id: book.book_id,
          title: book.name_book,
          author: book.author ? book.author.name_author : "Không rõ tác giả",
          image: book.image,
          file_path: book.file_path,
          price: book.is_free ? "Miễn phí" : `${book.price}₫`,
          rating: Math.floor(Math.random() * 5) + 1,
          category_id: book.category_id,
          description: book.description || "Mô tả sách sẽ hiển thị ở đây",
        }));
        setBooks(processedBooks);
        setFilteredBooks(processedBooks);
      } else {
        throw new Error("Không thể tải dữ liệu sách");
      }
    } catch (error) {
      console.error("Error fetching books by category:", error);
      setError("Không thể tải dữ liệu, vui lòng thử lại sau");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = (text) => {
    setSearchQuery(text);

    if (text.trim() === "") {
      setFilteredBooks(books);
      return;
    }

    const query = text.toLowerCase().trim();
    const results = books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    );

    setFilteredBooks(results);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setFilteredBooks(books);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSearchQuery("");
    await fetchBooks();
    setIsRefreshing(false);
  };

  // Handle book press
  const handleBookPress = (book) => {
    if (book.file_path) {
      // Navigate to PDF viewer
      router.push({
        pathname: "/PdfViewer",
        params: {
          pdfPath: book.file_path,
          pdfTitle: book.title || book.name_book,
          pdfId: book.id || book.book_id,
        },
      });
    } else {
      // Navigate to book details
      router.push(`/Books/${book.id || book.book_id}`);
    }
  };

  // Effect to load data on component mount
  useEffect(() => {
    fetchBooks();
  }, [categoryId]);

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#ff5a5f" />
        <Text className="mt-4 text-base text-gray-500">
          Đang tải danh sách sách...
        </Text>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white p-5">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="alert-circle-outline" size={64} color="#ff5a5f" />
        <Text className="mt-4 text-base text-gray-500 text-center">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 px-6 py-3 bg-[#ff5a5f] rounded-lg"
          onPress={fetchBooks}
        >
          <Text className="text-white font-bold text-base">Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: categoryName || "Danh mục sách",
          headerBackTitleVisible: false,
        }}
      />

      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Main Content */}
      <View className="flex-1 px-4 pb-4">
        {/* Search Bar */}
        <View className="my-3">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
            <Ionicons name="search-outline" size={20} color="#666" />
            <TextInput
              className="flex-1 ml-2 text-base"
              placeholder="Tìm kiếm sách theo tên, tác giả..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Header info */}
        <View className="py-2">
          {searchQuery ? (
            <Text className="text-gray-500">
              Tìm thấy {filteredBooks.length} sách với từ khóa "{searchQuery}"
            </Text>
          ) : (
            <Text className="text-gray-500">
              {books.length} cuốn sách trong danh mục {categoryName}
            </Text>
          )}
        </View>

        {/* Book grid */}
        {filteredBooks.length > 0 ? (
          <FlatList
            data={filteredBooks}
            numColumns={2}
            renderItem={({ item }) => (
              <RenderBookItem item={item} onPress={handleBookPress} />
            )}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            columnWrapperStyle={{
              justifyContent: "space-between",
              marginBottom: 12,
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={["#ff5a5f"]}
              />
            }
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Ionicons name="book-outline" size={64} color="#ddd" />
            <Text className="mt-4 text-gray-400 text-center">
              {searchQuery
                ? "Không tìm thấy sách phù hợp"
                : "Không có sách nào trong danh mục này"}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
