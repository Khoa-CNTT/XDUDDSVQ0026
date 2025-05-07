import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../config";
import { useFocusEffect } from "expo-router";
import { authService } from "../services/authService";
import RenderBookItem from "../components/BookStore/RenderBookItem";
export default function SavedScreen() {
  const [activeTab, setActiveTab] = useState("saved");
  const [savedBooks, setSavedBooks] = useState([]);
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiBooks, setApiBooks] = useState([]);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState({
    saved: 0,
    favorites: 0,
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

  // Lấy user ID khi component khởi tạo
  useEffect(() => {
    const getUserId = async () => {
      try {
        const userEmail = await AsyncStorage.getItem('user_email');
        const userIdValue = await AsyncStorage.getItem('user_id');
        
        if (userIdValue) {
          console.log("📚 Using user ID:", userIdValue);
          setUserId(userIdValue);
        } else if (userEmail) {
          // Fallback to email if necessary
          console.log("📚 No user ID, using email as identifier:", userEmail);
          setUserId(userEmail);
        } else {
          console.warn("📚 No user ID or email found");
          setUserId("guest");
        }
      } catch (error) {
        console.error("📚 Error getting user ID:", error);
        setUserId("guest");
      }
    };
    
    getUserId();
  }, []);

  

  // Thiết lập theo dõi thay đổi - chỉ cần làm mới dữ liệu từ API định kỳ
  const setupStorageMonitoring = () => {
    // Xóa interval cũ nếu có
    if (storageMonitorRef.current) {
      clearInterval(storageMonitorRef.current);
    }

    // Kiểm tra thay đổi sách đã lưu/yêu thích mỗi 10 giây
    storageMonitorRef.current = setInterval(async () => {
      if (!isMountedRef.current || isLoadingRef.current || !userId) return;

      try {
        // Làm mới dữ liệu từ API - không cần loadSavedBooks/loadFavoriteBooks
        // console.log("📚 Refreshing data from API (periodic check)");
        const controller = new AbortController();
        await fetchBooksFromAPI(controller.signal);
      } catch (error) {
        console.error("📚 Error during periodic refresh:", error);
      }
    }, 10000); // Kiểm tra mỗi 10 giây
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
    console.log("📚 Saved screen mounted");
    isMountedRef.current = true;
    isLoadingRef.current = false;
    apiDataLoadedRef.current = false;

    // Tải dữ liệu ban đầu khi đã có userId
    if (userId) {
      const initialLoad = async () => {
        try {
          setIsLoading(true);
          isLoadingRef.current = true;

          // Tạo AbortController mới
          const controller = new AbortController();
          abortControllerRef.current = controller;

          // Tải dữ liệu từ API - tất cả state được cập nhật trong hàm này
          console.log("📚 Initial API data load");
          await fetchBooksFromAPI(controller.signal);

          // Cập nhật trạng thái loading
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        } catch (error) {
          if (error.name === "AbortError") {
            console.log("📚 Initial load aborted");
            return;
          }

          console.error("📚 Error during initial load:", error);
          if (isMountedRef.current) {
            setError("Không thể tải dữ liệu, vui lòng thử lại sau");
            setIsLoading(false);
          }
        } finally {
          isLoadingRef.current = false;
        }
      };

      initialLoad();

      // Thiết lập theo dõi thay đổi
      setupStorageMonitoring();
    }

    return () => {
      console.log("📚 Saved screen unmounted");
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
  }, [userId]);

  // Tải dữ liệu sách từ API
  const fetchBooksFromAPI = async (signal) => {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            setError('Vui lòng đăng nhập để xem sách đã lưu');
            return [];
        }
        const response = await fetch(
            `${API_URL}/user-books`,
            { 
                signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        if (!response.ok) {
            if (response.status === 401) {
                await AsyncStorage.multiRemove([
                    'token',
                    'authToken',
                    'user',
                    'email',
                    'user_id'
                ]);
                setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                return [];
            }
            throw new Error(`API responded with status ${response.status}`);
        }
        const data = await response.json();
        if (data.status && data.data) {
            const transformBook = (book) => ({
                id: book.book_id,
                title: book.name_book,
                description: book.title,
                image: typeof book.image === 'string' ? { uri: book.image } : require('../../assets/images/bia1.png'),
                author: book.author ? book.author.name_author : 'Không rõ tác giả',
                price: book.is_free ? 'Miễn phí' : `${book.price} ₫`,
                genre: book.category ? book.category.name_category : 'Chưa phân loại',
                pages: book.pages || '0',
                publisher: book.publisher || 'NXB Trẻ',
                year: book.year || '2023',
                file_path: book.file_path,
                is_saved: book.is_saved,
                is_favorite: book.is_favorite
            });
            const savedBooks = (data.data.saved_books || []).map(transformBook);
            const favoriteBooks = (data.data.favorite_books || []).map(transformBook);
            setSavedBooks(savedBooks);
            setFavoriteBooks(favoriteBooks);
            savedIdsRef.current = savedBooks.map(book => book.id);
            favoriteIdsRef.current = favoriteBooks.map(book => book.id);
            console.log(`📚 Loaded ${savedBooks.length} saved books and ${favoriteBooks.length} favorite books`);
        }
        return [...(data.data.saved_books || []), ...(data.data.favorite_books || [])];
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('📚 Fetch was aborted');
            return [];
        }
        console.error('📚 Error fetching books:', error);
        setError('Không thể tải dữ liệu, vui lòng thử lại sau');
        return [];
    }
  };

  // Tìm sách dựa trên danh sách ID - được tối ưu hóa để xử lý nhiều loại ID
  const findBooksByIds = (bookIds) => {
    console.log(
      `📚 Finding books from ${apiBooks.length} available books`
    );

    // Debug: In ra một vài ID sách đầu tiên để kiểm tra
    if (apiBooks.length > 0) {
      const sampleBooks = apiBooks.slice(0, 3);
      console.log(
        "📚 Sample book IDs:",
        sampleBooks.map((b) => {
          return {
            id: b.id,
            book_id: b.book_id,
            title: b.title,
          };
        })
      );
    }

    // Debug: In ra danh sách ID cần tìm
    console.log("📚 Looking for these IDs:", bookIds);

    const results = bookIds
      .map((savedId) => {
        // Chuyển đổi ID thành string để đảm bảo so sánh chính xác
        const savedIdStr = savedId.toString();
        console.log(`📚 Searching for book with ID: ${savedIdStr}`);

        // Tìm sách với tất cả các định dạng ID có thể
        const found = apiBooks.find((book) => {
          // Lấy cả id và book_id để đảm bảo không bỏ sót
          const bookId = book.id?.toString() || "";
          const bookBookId = book.book_id?.toString() || "";

          // Danh sách các định dạng ID khác nhau cần kiểm tra
          const possibleIds = [
            bookId,
            bookBookId,
            bookId.startsWith("BOOK")
              ? bookId.replace("BOOK", "")
              : `BOOK${bookId}`,
            bookBookId.startsWith("BOOK")
              ? bookBookId.replace("BOOK", "")
              : `BOOK${bookBookId}`,
          ].filter(Boolean); // Loại bỏ các giá trị falsy

          // Kiểm tra nếu ID đang tìm khớp với bất kỳ định dạng nào
          for (const id of possibleIds) {
            if (id === savedIdStr) return true;
            if (
              savedIdStr.startsWith("BOOK") &&
              savedIdStr.replace("BOOK", "") === id
            )
              return true;
            if (!savedIdStr.startsWith("BOOK") && `BOOK${savedIdStr}` === id)
              return true;
          }

          return false;
        });

        if (found) {
          console.log(
            `📚 Found book: ${found.title} (ID: ${found.id || found.book_id})`
          );
          return found;
        } else {
          console.log(`📚 No book found for ID: ${savedIdStr}`);

          // Tìm kiếm mở rộng trong trường hợp không tìm thấy
          const book = findFallbackBook(savedIdStr);
          return book;
        }
      })
      .filter(Boolean); // Loại bỏ các giá trị undefined

    console.log(
      `📚 Total books found: ${results.length} out of ${bookIds.length} IDs`
    );
    return results;
  };

  // Hàm tìm kiếm sách dự phòng với thuật toán khác nếu cách thông thường không hoạt động
  const findFallbackBook = (searchId) => {
    // Tìm kiếm theo số ID (bỏ qua bất kỳ tiền tố nào)
    const numericId = searchId.replace(/\D/g, "");
    if (!numericId) return null;

    console.log(`📚 Fallback search for numeric ID: ${numericId}`);

    for (const book of apiBooks) {
      const bookIdStr = (book.id || book.book_id || "").toString();
      const bookNumericId = bookIdStr.replace(/\D/g, "");

      if (bookNumericId === numericId) {
        console.log(`📚 Fallback found book: ${book.title}`);
        return book;
      }
    }

    // Nếu chưa tìm thấy, thử một chiến lược khác: tìm theo một phần của ID
    if (numericId.length > 3) {
      for (const book of apiBooks) {
        const bookIdStr = (book.id || book.book_id || "").toString();
        if (bookIdStr.includes(numericId) || numericId.includes(bookIdStr)) {
          console.log(`📚 Partial match found book: ${book.title}`);
          return book;
        }
      }
    }

    return null;
  };

  // Làm mới dữ liệu theo yêu cầu người dùng
  const onRefresh = async () => {
    if (isLoadingRef.current || !userId) return;

    console.log("📚 Manual refresh triggered");
    setRefreshing(true);
    isLoadingRef.current = true;

    try {
      // Tạo AbortController mới
      const controller = new AbortController();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = controller;

      // Làm mới dữ liệu trực tiếp từ API - không cần tải lại saved/favorite
      await fetchBooksFromAPI(controller.signal);
      
      // Dữ liệu đã được cập nhật trong fetchBooksFromAPI
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("📚 Refresh was aborted");
      } else {
        console.error("📚 Error during manual refresh:", error);
        if (isMountedRef.current) {
          setError("Không thể tải dữ liệu, vui lòng thử lại sau");
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
      className={`flex-1 flex-row items-center justify-center py-4 ${
        isActive ? "border-b-2 border-blue-500" : ""
      }`}
    >
      <Ionicons
        name={icon}
        size={20}
        color={isActive ? "#3b82f6" : "#94a3b8"}
        style={{ marginRight: 8 }}
      />
      <Text
        className={`text-base font-semibold ${
          isActive ? "text-blue-500" : "text-slate-500"
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
        name={activeTab === "saved" ? "bookmark" : "heart"}
        size={60}
        color="#d1d5db"
      />
      <Text className="text-gray-400 text-lg mt-4 mb-2">
        {activeTab === "saved"
          ? "Bạn chưa lưu cuốn sách nào"
          : "Bạn chưa thích cuốn sách nào"}
      </Text>
      <Text className="text-gray-400 text-center px-8">
        {activeTab === "saved"
          ? "Các sách bạn đã lưu sẽ xuất hiện ở đây"
          : "Các sách bạn đã thích sẽ xuất hiện ở đây"}
      </Text>
    </View>
  );

  // Chọn sách dựa trên tab đang hoạt động
  const booksToDisplay = activeTab === "saved" ? savedBooks : favoriteBooks;

  // Tải lại dữ liệu mỗi khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      if (!userId) return;
      
      console.log("📚 Saved screen focused");
      isMountedRef.current = true;

      // Tạo AbortController mới để quản lý fetch requests
      const controller = new AbortController();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = controller;

      // Làm mới dữ liệu khi tab được focus - chỉ cần gọi fetchBooksFromAPI
      const refreshDataOnFocus = async () => {
        try {
          // Đánh dấu đang tải để tránh nhiều request đồng thời
          isLoadingRef.current = true;

          // Hiển thị loading chỉ khi chưa có dữ liệu
          if (savedBooks.length === 0 && favoriteBooks.length === 0) {
            setIsLoading(true);
          }

          // Tải dữ liệu API - các state sách đã lưu/thích được cập nhật trong hàm này
          console.log("📚 Loading API data on focus...");
          await fetchBooksFromAPI(controller.signal);

          // Cập nhật trạng thái tải xong
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        } catch (error) {
          if (error.name === "AbortError") {
            console.log("📚 Data refresh was aborted");
            return;
          }

          console.error("📚 Error refreshing data on focus:", error);
          if (isMountedRef.current) {
            setError("Không thể tải dữ liệu, vui lòng thử lại sau");
            setIsLoading(false);
          }
        } finally {
          isLoadingRef.current = false;
        }
      };

      refreshDataOnFocus();

      // Thiết lập theo dõi thay đổi định kỳ
      setupStorageMonitoring();

      return () => {
        console.log("📚 Saved screen blurred - cleaning up");
        isMountedRef.current = false;

        if (storageMonitorRef.current) {
          clearInterval(storageMonitorRef.current);
          storageMonitorRef.current = null;
        }

        // Hủy bỏ tất cả API fetch đang chạy
        controller.abort();
      };
    }, [userId])
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
        <Text className="text-4xl font-bold mt-2 px-4">Sách của tôi</Text>

      <View className="flex-row border-b border-gray-200 mb-2">
        <TabButton
          title="Đã lưu"
          isActive={activeTab === "saved"}
          onPress={() => setActiveTab("saved")}
          icon="bookmark"
        />
        <TabButton
          title="Yêu thích"
          isActive={activeTab === "favorites"}
          onPress={() => setActiveTab("favorites")}
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
          renderItem={({ item, index }) => (
            <View
              className=""
              style={{
                width: "47%",
                marginLeft: index % 2 === 0 ? 8 : "3%",
                marginRight: index % 2 === 0 ? "3%" : 8,
                marginBottom: 16,
              }}
            >
              <RenderBookItem item={item} />
            </View>
          )}
          keyExtractor={(item) =>
            item.id?.toString() || Math.random().toString()
          }
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: 8,
            paddingVertical: 12,
            paddingBottom: 120,
            flexGrow: 1,
          }}
          columnWrapperStyle={{
            flex: 1,
            justifyContent: "flex-start",
          }}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3b82f6"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
