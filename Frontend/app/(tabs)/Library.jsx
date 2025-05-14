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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";
import * as FileSystem from "expo-file-system";
import {
  getRecentlyViewedPdfs,
  savePdfReadingProgress,
} from "../services/pdfService";

// Tính toán kích thước phù hợp
const { width } = Dimensions.get("window");
const THUMBNAIL_SIZE = 60; // Kích thước cố định cho hình thu nhỏ

// Các loại định dạng file được hỗ trợ - dựa theo OpenReadEra
const FILE_FORMATS = [
  { id: "pdf", name: "PDF", icon: "document-text", color: "#e53935" },
  { id: "epub", name: "EPUB/FB2", icon: "book", color: "#43a047" },
  { id: "doc", name: "DOC/DOCX", icon: "document", color: "#1e88e5" },
  { id: "txt", name: "TXT", icon: "text", color: "#757575" },
];

const SPACING = 16;

export default function Library() {
  const router = useRouter();
  const [pdfs, setPdfs] = useState([]);
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const [pdfReadingProgress, setPdfReadingProgress] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showFormatFilter, setShowFormatFilter] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [sortBy, setSortBy] = useState("recent"); // 'recent', 'name', 'size'
  const [sortDirection, setSortDirection] = useState("desc"); // 'asc' or 'desc'
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [bookshelves, setBookshelves] = useState([]);
  const [apiBooks, setApiBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfHistory, setPdfHistory] = useState([]);

  // Sử dụng useEffect để tải dữ liệu
  useEffect(() => {
    loadReadingProgress();
    loadBookshelves();
    fetchBooksFromAPI();
    loadPdfHistoryFromServer(); // Thêm hàm mới để lấy lịch sử từ server
  }, []);

  // Sử dụng useFocusEffect để tải lại dữ liệu mỗi khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("📚 Library screen focused");

      // Tải lại dữ liệu khi tab được focus, nhưng chỉ khi cần thiết
      const refreshDataOnFocus = async () => {
        try {
          await loadReadingProgress();
          await loadPdfHistoryFromServer();
          await fetchPDFs();
        } catch (error) {
          console.error("📚 Error refreshing library data:", error);
        }
      };

      refreshDataOnFocus();

      // Set up listener for reading progress updates
      const checkForProgressUpdates = async () => {
        try {
          const lastUpdate = await AsyncStorage.getItem(
            "reading_progress_updated"
          );
          if (lastUpdate && lastUpdate !== lastCheckedUpdate.current) {
            console.log(
              "Reading progress was updated, refreshing library data..."
            );
            lastCheckedUpdate.current = lastUpdate;
            loadReadingProgress();
            loadPdfHistoryFromServer();
            fetchPDFs();
          }
        } catch (error) {
          console.error("Error checking for reading progress updates:", error);
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
  const lastCheckedUpdate = React.useRef("");

  // Function để tính toán tiến độ đọc một cách nhất quán
  const getReadingProgressForPdf = (pdfId) => {
    // Ưu tiên dữ liệu từ server trước
    const serverProgress = pdfHistory.find(
      (history) => history.pdf_id == pdfId
    );
    if (serverProgress) {
      return parseInt(serverProgress.percentage, 10);
    }

    // Nếu không có từ server, dùng dữ liệu local
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

  // Tải lịch sử đọc PDF từ server
  const loadPdfHistoryFromServer = async () => {
    try {
      console.log("📚 Loading PDF history from server...");
      const response = await getRecentlyViewedPdfs();

      if (response.success && response.data) {
        console.log(
          `📚 Loaded ${response.data.length} PDF history items from server`
        );
        setPdfHistory(response.data);

        // Đồng bộ dữ liệu server xuống local storage
        const progressData = {};
        response.data.forEach((history) => {
          progressData[history.pdf_id] = {
            page: history.current_page,
            total: history.total_pages,
            percentage: history.percentage,
            timestamp: history.last_read_at || new Date().toISOString(),
          };
        });

        // Cập nhật state pdfReadingProgress với dữ liệu từ server
        setPdfReadingProgress((prevProgress) => ({
          ...prevProgress,
          ...progressData,
        }));

        // Lưu vào local storage cho mỗi PDF
        for (const [pdfId, progress] of Object.entries(progressData)) {
          const key = `pdf_progress_${pdfId}`;
          await AsyncStorage.setItem(key, JSON.stringify(progress));
        }
      } else {
        console.log("📚 No PDF history found on server or error occurred");
      }
    } catch (error) {
      console.error("📚 Error loading PDF history from server:", error);
    }
  };

  // Tải dữ liệu giá sách từ AsyncStorage
  const loadBookshelves = async () => {
    try {
      const shelvesData = await AsyncStorage.getItem("bookshelves");
      if (shelvesData) {
        setBookshelves(JSON.parse(shelvesData));
      } else {
        // Khởi tạo các kệ sách mặc định (như OpenReadEra)
        const defaultShelves = [
          {
            id: "favorites",
            name: "Yêu thích",
            icon: "heart",
            color: "#e91e63",
            books: [],
          },
          {
            id: "reading",
            name: "Đang đọc",
            icon: "book-open",
            color: "#2196f3",
            books: [],
          },
          {
            id: "completed",
            name: "Đã hoàn thành",
            icon: "checkmark-circle",
            color: "#4caf50",
            books: [],
          },
        ];
        setBookshelves(defaultShelves);
        await AsyncStorage.setItem(
          "bookshelves",
          JSON.stringify(defaultShelves)
        );
      }
    } catch (error) {
      console.error("Error loading bookshelves:", error);
    }
  };

  // Thay đổi cách sắp xếp
  const toggleSortOption = (option) => {
    if (sortBy === option) {
      // Nếu đang chọn cùng loại sắp xếp, đảo ngược hướng sắp xếp
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Nếu chọn loại sắp xếp mới, mặc định là giảm dần (desc)
      setSortBy(option);
      setSortDirection("desc");
    }
    setShowSortOptions(false);
  };

  // Tải thông tin tiến độ đọc các PDF - cập nhật để sử dụng cả dữ liệu từ server và local
  const loadReadingProgress = async () => {
    try {
      console.log("📚 Loading local PDF reading progress...");

      // Lấy từ AsyncStorage để đảm bảo có dữ liệu khi offline
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter((key) =>
        key.startsWith("pdf_progress_")
      );

      if (progressKeys.length > 0) {
        const progressItems = await AsyncStorage.multiGet(progressKeys);
        const progressData = {};

        progressItems.forEach(([key, value]) => {
          if (value) {
            try {
              const pdfId = key.replace("pdf_progress_", "");
              const progress = JSON.parse(value);
              progressData[pdfId] = progress;
            } catch (parseError) {
              console.error("Error parsing progress data:", parseError);
            }
          }
        });

        setPdfReadingProgress(progressData);
        console.log(
          "📚 Loaded reading progress from local storage for",
          Object.keys(progressData).length,
          "PDFs"
        );
      }
    } catch (error) {
      console.error("Error loading reading progress:", error);
    }
  };

  // Lấy danh sách PDF từ API
  const fetchPDFs = async () => {
    try {
      setLoadingPdfs(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        console.log("No token found, redirecting to login");
        setPdfs([]);
        setLoadingPdfs(false);
        return;
      }

      const response = await fetch(`${API_URL}/pdfs`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
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
        if (
          textResponse.trim().startsWith("<!DOCTYPE") ||
          textResponse.trim().startsWith("<html") ||
          textResponse.includes("<body")
        ) {
          console.error("Received HTML instead of JSON");
          throw new Error("Received HTML instead of JSON");
        }

        // Check if response is empty
        if (!textResponse || textResponse.trim() === "") {
          console.error("Empty response from server");
          throw new Error("Empty response from server");
        }

        // Try to parse the JSON
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("JSON Parse error:", parseError.message);
        console.log(
          "Response begins with:",
          response.status,
          response.statusText
        );
        setPdfs([]);
        setLoadingPdfs(false);
        throw new Error(
          "Failed to parse server response. Please try again later."
        );
      }

      if (data.success) {
        let filteredDocs = data.data;

        // Process PDFs and enhance with reading progress
        filteredDocs = filteredDocs.map((doc) => {
          // Always recalculate progress using the common function
          const progress = getReadingProgressForPdf(doc.id);

          // Tìm thông tin từ lịch sử server
          const serverHistory = pdfHistory.find((h) => h.pdf_id == doc.id);

          return {
            ...doc,
            progress,
            currentPage:
              serverHistory?.current_page ||
              pdfReadingProgress[doc.id]?.page ||
              1,
            totalPages:
              serverHistory?.total_pages ||
              pdfReadingProgress[doc.id]?.total ||
              1,
            lastReadAt:
              serverHistory?.last_read_at ||
              pdfReadingProgress[doc.id]?.timestamp,
          };
        });

        // Lọc theo định dạng (nếu có)
        if (selectedFormat) {
          // Cải thiện logic lọc định dạng file
          filteredDocs = filteredDocs.filter((doc) => {
            // Kiểm tra từ nhiều thuộc tính có thể chứa thông tin về tên file
            const fileName = (
              doc.file_name ||
              doc.original_name ||
              doc.file_path ||
              doc.filename ||
              ""
            ).toLowerCase();

            // Kiểm tra kiểu MIME type nếu có
            const mimeType = (doc.mime_type || "").toLowerCase();

            switch (selectedFormat) {
              case "pdf":
                return (
                  fileName.endsWith(".pdf") ||
                  fileName.includes(".pdf") ||
                  mimeType.includes("pdf")
                );
              case "epub":
                return (
                  fileName.endsWith(".epub") ||
                  fileName.endsWith(".fb2") ||
                  fileName.includes(".epub") ||
                  fileName.includes(".fb2") ||
                  mimeType.includes("epub")
                );
              case "doc":
                return (
                  fileName.endsWith(".doc") ||
                  fileName.endsWith(".docx") ||
                  fileName.includes(".doc") ||
                  mimeType.includes("word") ||
                  mimeType.includes("doc")
                );
              case "txt":
                return (
                  fileName.endsWith(".txt") ||
                  fileName.includes(".txt") ||
                  mimeType.includes("text/plain")
                );
              default:
                return true;
            }
          });
        }

        // Lọc theo từ khóa tìm kiếm
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredDocs = filteredDocs.filter(
            (doc) =>
              doc.title?.toLowerCase().includes(query) ||
              doc.description?.toLowerCase().includes(query)
          );
        }

        // Sắp xếp theo lựa chọn
        const isAsc = sortDirection === "asc";

        switch (sortBy) {
          case "name":
            filteredDocs.sort((a, b) => {
              const titleA = (a.title || "").toLowerCase();
              const titleB = (b.title || "").toLowerCase();
              const compareResult = titleA.localeCompare(titleB, "vi");
              return isAsc ? compareResult : -compareResult;
            });
            break;

          case "size":
            filteredDocs.sort((a, b) => {
              const sizeA = a.file_size || 0;
              const sizeB = b.file_size || 0;
              return isAsc ? sizeA - sizeB : sizeB - sizeA;
            });
            break;

          case "recent":
          default:
            filteredDocs.sort((a, b) => {
              // Ưu tiên sử dụng lastReadAt từ server trước
              const dateA = new Date(
                a.lastReadAt || a.updated_at || a.created_at || 0
              );
              const dateB = new Date(
                b.lastReadAt || b.updated_at || b.created_at || 0
              );
              return isAsc ? dateA - dateB : dateB - dateA;
            });
            break;
        }

        setPdfs(filteredDocs);
      } else {
        throw new Error(data.message || "Failed to fetch PDFs");
      }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      setPdfs([]);
    } finally {
      setLoadingPdfs(false);
    }
  };

  // Xử lý thêm sách từ thiết bị - Đã cập nhật để mở trang tải lên PDF
  const handleAddBooks = () => {
    router.push("/UploadPdf");
  };

  // Xử lý khi chọn xem PDF - cập nhật để sử dụng API
  const handleViewPdf = async (pdfId) => {
    try {
      // Ưu tiên lấy tiến độ từ server
      let currentPage = 1;

      // Tìm trong lịch sử từ server
      const serverHistory = pdfHistory.find((h) => h.pdf_id == pdfId);
      if (serverHistory) {
        currentPage = parseInt(serverHistory.current_page, 10);
        console.log(
          `📚 Opening PDF at saved page ${currentPage} from server history`
        );
      } else {
        // Nếu không có từ server, sử dụng local
        const localProgress = pdfReadingProgress[pdfId];
        if (localProgress && localProgress.page) {
          currentPage = parseInt(localProgress.page, 10);
          console.log(
            `📚 Opening PDF at saved page ${currentPage} from local storage`
          );
        }
      }

      // Check if the PDF exists locally
      const fileName = `pdf_${pdfId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      // Navigate to the PDF reader with local path if available
      router.push({
        pathname: "/PdfViewer",
        params: {
          pdfId: pdfId,
          localPath: fileInfo.exists ? encodeURIComponent(fileUri) : "",
          initialPage: currentPage,
        },
      });
    } catch (error) {
      console.error("Error checking local file:", error);

      // Navigate without local path if there was an error
      router.push({
        pathname: "/PdfViewer",
        params: { pdfId: pdfId },
      });
    }
  };

  // Render từng PDF item
  const renderPdfItem = ({ item }) => {
    // Always recalculate reading progress at render time
    const progressPercent = getReadingProgressForPdf(item.id);

    // Lấy danh sách các kệ sách chứa cuốn sách này
    const containingShelves = bookshelves.filter((shelf) =>
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

          {/* Hiển thị thời gian đọc gần đây nhất */}
          {item.lastReadAt && (
            <Text className="text-xs text-gray-500 mt-1">
              Đọc gần đây:{" "}
              {new Date(item.lastReadAt).toLocaleDateString("vi-VN")}
            </Text>
          )}

          {/* Hiển thị các kệ sách chứa quyển này */}
          {containingShelves.length > 0 && (
            <View className="flex-row mt-2">
              {containingShelves.slice(0, 3).map((shelf) => (
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
                <Text className="text-xs text-gray-500 ml-1">
                  +{containingShelves.length - 3}
                </Text>
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
    let name = "";
    let iconName = "";

    switch (sortBy) {
      case "name":
        name = "A-Z";
        iconName = sortDirection === "asc" ? "arrow-up" : "arrow-down";
        break;
      case "size":
        name = "Kích thước";
        iconName = sortDirection === "asc" ? "arrow-up" : "arrow-down";
        break;
      case "recent":
      default:
        name = "Gần đây";
        iconName = sortDirection === "asc" ? "arrow-up" : "arrow-down";
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
        const books = data.data.map((book) => ({
          id: book.book_id,
          title: book.name_book,
          author: book.author ? book.author.name_author : "Không rõ tác giả",
          image: book.image,
          file_path: book.file_path,
          price: book.is_free ? "Miễn phí" : `${book.price} ₫`,
          rating: Math.floor(Math.random() * 5) + 1,
          category_id: book.category_id,
        }));

        setApiBooks(books);
      } else {
        console.warn("API trả về dữ liệu không đúng cấu trúc");
        setApiBooks([]);
        setError("Không thể tải dữ liệu từ máy chủ");
      }
    } catch (error) {
      console.error("Error fetching books:", error);
      setError("Lỗi khi tải dữ liệu sách");
      setApiBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsLoading(true);
    await fetchBooksFromAPI();
    await loadPdfHistoryFromServer();
    setIsLoading(false);
  };

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
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
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
                setSearchQuery("");
                fetchPDFs();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Bộ lọc và sắp xếp */}
        <View className="flex-row justify-between items-center mb-4">
          {/* Lọc theo định dạng */}
          <View className="flex-row items-center">
            <TouchableOpacity
              className="flex-row items-center bg-white px-3 py-2 rounded-full border border-gray-200 mr-2"
              onPress={() => setShowFormatFilter(!showFormatFilter)}
            >
              <Ionicons name="funnel-outline" size={16} color="#666" />
              <Text className="ml-1 text-sm">
                {selectedFormat
                  ? FILE_FORMATS.find((f) => f.id === selectedFormat)?.name
                  : "Tất cả"}
              </Text>
            </TouchableOpacity>

            {/* Sắp xếp */}
            <TouchableOpacity
              className="flex-row items-center bg-white px-3 py-2 rounded-full border border-gray-200"
              onPress={() => setShowSortOptions(!showSortOptions)}
            >
              <Ionicons name="swap-vertical-outline" size={16} color="#666" />
              <Text className="ml-1 text-sm">{sortInfo.name}</Text>
              <Ionicons
                name={sortInfo.iconName}
                size={12}
                color="#666"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>

          {/* Nút xem tất cả */}
          {pdfs.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/AllDocuments")}
              className="flex-row items-center"
            >
              <Text className="text-blue-500 mr-1">Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
            </TouchableOpacity>
          )}
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

            {FILE_FORMATS.map((format) => (
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
                  name={
                    selectedFormat === format.id
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color={format.color}
                />
                <Ionicons
                  name={format.icon}
                  size={16}
                  color={format.color}
                  style={{ marginLeft: 8 }}
                />
                <Text className="ml-2">{format.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tùy chọn sắp xếp */}
        {showSortOptions && (
          <View className="bg-white rounded-lg p-2 mb-4 border border-gray-200">
            {[
              { id: "recent", name: "Gần đây nhất", icon: "time-outline" },
              { id: "name", name: "A-Z", icon: "text-outline" },
              { id: "size", name: "Kích thước", icon: "expand-outline" },
            ].map((option) => (
              <TouchableOpacity
                key={option.id}
                className="flex-row items-center py-2 px-2"
                onPress={() => toggleSortOption(option.id)}
              >
                <Ionicons
                  name={
                    sortBy === option.id
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color="#0064e1"
                />
                <Ionicons
                  name={option.icon}
                  size={16}
                  color="#666"
                  style={{ marginLeft: 8 }}
                />
                <Text className="ml-2">{option.name}</Text>

                {sortBy === option.id && (
                  <Ionicons
                    name={sortDirection === "asc" ? "arrow-up" : "arrow-down"}
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
            <Text className="text-xl ml-4">Thêm từ thiết bị (PDF/DOCX)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Sách & Tài Liệu có thể đọc */}
        <View className="mt-6">
          <SectionTitle title="Sách & Tài Liệu" />

          {loadingPdfs ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#0064e1" />
              <Text className="mt-4 text-gray-600">
                Đang tải danh sách PDF...
              </Text>
            </View>
          ) : pdfs.length > 0 ? (
            <View>
              <FlatList
                data={pdfs.slice(0, 5)}
                renderItem={renderPdfItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
              {pdfs.length > 5 && (
                <TouchableOpacity
                  className="mt-4 items-center py-3 bg-gray-50 rounded-lg border border-gray-200"
                  onPress={() => {
                    router.push("/AllDocuments");
                  }}
                >
                  <Text className="text-blue-500 font-medium">
                    Xem tất cả ({pdfs.length} tài liệu)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View className="py-6 items-center">
              <Ionicons name="book-outline" size={50} color="#cccccc" />
              <Text className="mt-4 text-gray-500 text-center">
                {searchQuery
                  ? "Không tìm thấy tài liệu nào phù hợp"
                  : selectedFormat
                  ? `Không tìm thấy tài liệu ${
                      FILE_FORMATS.find((f) => f.id === selectedFormat)?.name
                    }`
                  : "Bạn chưa có tài liệu nào. Hãy tải lên để bắt đầu đọc!"}
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
