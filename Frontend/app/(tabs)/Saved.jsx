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
import RenderBookItem from "../components/Home/RenderBookItem";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../config";
import { useFocusEffect } from "expo-router";

export default function SavedScreen() {
  const [activeTab, setActiveTab] = useState("saved");
  const [savedBooks, setSavedBooks] = useState([]);
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiBooks, setApiBooks] = useState([]);
  const [error, setError] = useState(null);
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

  // Hàm xóa tất cả dữ liệu 
  const clearAllStorageData = async () => {
    try {
      Alert.alert(
        "Xóa tất cả dữ liệu đã lưu",
        "Bạn có chắc chắn muốn xóa tất cả sách đã lưu và yêu thích không?",
        [
          {
            text: "Hủy",
            style: "cancel",
          },
          {
            text: "Xóa",
            onPress: async () => {
              try {
                // Hiển thị trạng thái loading
                setIsLoading(true);
                
                // Cập nhật trạng thái lưu/thích cho tất cả sách đã lưu
                await Promise.all(
                  savedBooks.map(async (book) => {
                    try {
                      await fetch(`${API_URL}/books/${book.id}/save`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ is_saved: false }),
                      });
                    } catch (error) {
                      console.error(`Error unsaving book ${book.id}:`, error);
                    }
                  })
                );
                
                // Cập nhật trạng thái lưu/thích cho tất cả sách đã thích
                await Promise.all(
                  favoriteBooks.map(async (book) => {
                    try {
                      await fetch(`${API_URL}/books/${book.id}/favorite`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ is_favorite: false }),
                      });
                    } catch (error) {
                      console.error(`Error unfavoriting book ${book.id}:`, error);
                    }
                  })
                );
                
                // Cập nhật UI tạm thời để phản hồi nhanh
                setSavedBooks([]);
                setFavoriteBooks([]);
                
                // Làm mới dữ liệu từ API
                const controller = new AbortController();
                await fetchBooksFromAPI(controller.signal);
                
                // Tắt trạng thái loading
                setIsLoading(false);
                
                // Thông báo thành công
                Alert.alert("Thành công", "Đã xóa tất cả sách đã lưu và yêu thích!");
              } catch (error) {
                console.error("Lỗi khi xóa dữ liệu:", error);
                setIsLoading(false);
                Alert.alert("Lỗi", "Không thể xóa dữ liệu. Vui lòng thử lại.");
              }
            },
            style: "destructive",
          },
        ]
      );
    } catch (error) {
      console.error("Lỗi:", error);
      Alert.alert("Lỗi", "Không thể xóa dữ liệu. Vui lòng thử lại.");
    }
  };

  // Thiết lập theo dõi thay đổi - chỉ cần làm mới dữ liệu từ API định kỳ
  const setupStorageMonitoring = () => {
    // Xóa interval cũ nếu có
    if (storageMonitorRef.current) {
      clearInterval(storageMonitorRef.current);
    }

    // Kiểm tra thay đổi sách đã lưu/yêu thích mỗi 10 giây
    storageMonitorRef.current = setInterval(async () => {
      if (!isMountedRef.current || isLoadingRef.current) return;

      try {
        // Làm mới dữ liệu từ API - không cần loadSavedBooks/loadFavoriteBooks
        console.log("📚 Refreshing data from API (periodic check)");
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

    // Tải dữ liệu ban đầu
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
  }, []);

  // Tải dữ liệu sách từ API
  const fetchBooksFromAPI = async (signal) => {
    if (!isMountedRef.current) return [];

    try {
      console.log("📚 Fetching books from API");
      const response = await fetch(`${API_URL}/books`, { signal });

      if (!isMountedRef.current) return [];

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();

      if (data.status && data.data && Array.isArray(data.data)) {
        const books = data.data.map((book) => ({
          id: book.book_id,
          title: book.name_book,
          author: book.author ? book.author.name_author : "Unknown Author",
          image: book.image,
          file_path: book.file_path,
          price: book.is_free ? "Miễn phí" : `${book.price} ₫`,
          rating: Math.floor(Math.random() * 5) + 1,
          category_id: book.category_id,
          description: book.description || "Mô tả sách sẽ hiển thị ở đây",
          is_saved: book.is_saved,
          is_favorite: book.is_favorite,
        }));

        if (isMountedRef.current) {
          // Cập nhật state
          setApiBooks(books);
          apiDataLoadedRef.current = true;
          console.log(`📚 Loaded ${books.length} books from API`);
          
          // Lọc sách đã lưu và yêu thích trực tiếp từ dữ liệu mới
          const savedBooksFromApi = books.filter(book => 
            book.is_saved === true || book.is_saved === 1
          );
          
          const favoriteBooksFromApi = books.filter(book => 
            book.is_favorite === true || book.is_favorite === 1
          );
          
          // Cập nhật state ngay lập tức để tránh vấn đề timing
          setSavedBooks(savedBooksFromApi);
          setFavoriteBooks(favoriteBooksFromApi);
          
          console.log(`📚 Found ${savedBooksFromApi.length} saved books and ${favoriteBooksFromApi.length} favorite books`);
        }

        return books;
      } else {
        console.warn("📚 API returned invalid data structure");

        if (isMountedRef.current) {
          setApiBooks([]);
          apiDataLoadedRef.current = true;
          setError("Không thể tải dữ liệu từ máy chủ");
          setSavedBooks([]);
          setFavoriteBooks([]);
        }

        return [];
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("📚 API fetch was aborted");
        return [];
      }

      console.error("📚 Error fetching books from API:", error);

      if (isMountedRef.current) {
        setApiBooks([]);
        apiDataLoadedRef.current = true;
        setError("Không thể kết nối đến máy chủ: " + error.message);
        setSavedBooks([]);
        setFavoriteBooks([]);
      }

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

  // Load and process saved books with proper error handling
  const loadSavedBooks = async () => {
    console.log("📚 loadSavedBooks nên không còn được gọi trực tiếp nữa");
    
    // Sách đã được tải và lọc trực tiếp trong fetchBooksFromAPI
    // Không cần thực hiện thêm bất kỳ hành động nào ở đây
  };

  // Load and process favorite books with proper error handling
  const loadFavoriteBooks = async () => {
    console.log("📚 loadFavoriteBooks nên không còn được gọi trực tiếp nữa");
    
    // Sách đã được tải và lọc trực tiếp trong fetchBooksFromAPI
    // Không cần thực hiện thêm bất kỳ hành động nào ở đây
  };

  // Làm mới dữ liệu theo yêu cầu người dùng
  const onRefresh = async () => {
    if (isLoadingRef.current) return;

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
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-4 flex-row justify-between items-center">
        <Text className="text-3xl font-bold">Sách của tôi</Text>
        <TouchableOpacity
          onPress={clearAllStorageData}
          className="bg-red-500 px-4 py-2 rounded-full"
        >
          <Text className="text-white font-semibold">Xóa tất cả</Text>
        </TouchableOpacity>
      </View>

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
              className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm"
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
            paddingBottom: 120, // Thêm padding để tránh bị che bởi tabbar
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
