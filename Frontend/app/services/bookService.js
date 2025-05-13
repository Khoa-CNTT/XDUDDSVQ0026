import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

// Lấy danh sách sách
export const getAllBooks = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/books`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || "Failed to fetch books");
    }
  } catch (error) {
    console.error("Get books error:", error);
    return { success: false, message: error.message };
  }
};

// Lấy sách miễn phí
export const getFreeBooks = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/books/free`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || "Failed to fetch free books");
    }
  } catch (error) {
    console.error("Get free books error:", error);
    return { success: false, message: error.message };
  }
};

// Lấy sách có phí
export const getPaidBooks = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/books/paid`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || "Failed to fetch paid books");
    }
  } catch (error) {
    console.error("Get paid books error:", error);
    return { success: false, message: error.message };
  }
};

// Tìm kiếm sách
export const searchBooks = async (query) => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(
      `${API_URL}/books/search?q=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || "Failed to search books");
    }
  } catch (error) {
    console.error("Search books error:", error);
    return { success: false, message: error.message };
  }
};

// Lấy chi tiết sách
export const getBookDetails = async (bookId) => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/books/${bookId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || "Failed to fetch book details");
    }
  } catch (error) {
    console.error("Get book details error:", error);
    return { success: false, message: error.message };
  }
};

// Lấy URL để xem PDF của sách
export const getBookPdfViewUrl = async (bookId) => {
  try {
    const token = await AsyncStorage.getItem("token");

    // Construct the PDF view URL
    const pdfViewUrl = `${API_URL}/books/${bookId}/pdf`;

    // Return the URL with token if needed
    return {
      success: true,
      pdfUrl: token ? `${pdfViewUrl}?token=${token}` : pdfViewUrl,
    };
  } catch (error) {
    console.error("Get book PDF URL error:", error);
    return { success: false, message: error.message };
  }
};

// Lưu tiến độ đọc sách lên server
export const saveBookReadingProgress = async (
  bookId,
  currentPage,
  totalPages
) => {
  try {
    const userId = await getUserId();
    const token = await AsyncStorage.getItem("token");

    if (!userId || !token) {
      return { success: false, error: "USER_NOT_AUTHENTICATED" };
    }

    // Kiểm tra bookId
    if (!bookId || typeof bookId !== "string" || !bookId.startsWith("BOOK")) {
      console.error("❌ bookId không hợp lệ:", bookId);
      return {
        success: false,
        error: "INVALID_BOOK_ID",
        message: "ID sách không hợp lệ",
      };
    }

    const currentPageInt = parseInt(currentPage, 10) || 1;
    const totalPagesInt = parseInt(totalPages, 10) || 1;
    const percentage = Math.floor((currentPageInt / totalPagesInt) * 100) || 0;

    // Lưu thông tin tiến độ vào local storage
    const progress = {
      page: currentPageInt,
      total: totalPagesInt,
      percentage,
      timestamp: new Date().toISOString(),
    };

    const key = `book_progress_${bookId}`;
    await AsyncStorage.setItem(key, JSON.stringify(progress));

    console.log("📚 Gửi dữ liệu đọc sách lên server:", {
      book_id: bookId, // Giữ nguyên dạng string BOOK000xxx
      current_page: currentPageInt,
      total_pages: totalPagesInt,
      percentage: percentage,
    });

    // Gửi lên server với book_id dạng string
    const response = await fetch(`${API_URL}/book-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        book_id: bookId, // Giữ nguyên dạng string BOOK000xxx
        current_page: currentPageInt,
        total_pages: totalPagesInt,
        percentage: percentage,
      }),
    });

    const data = await response.json();

    if (data.status) {
      console.log("📚 Đã đồng bộ tiến độ đọc sách lên server");
      console.log(
        `📚 Đã lưu tiến độ đọc sách lên server thành công: ${percentage}%`
      );
      console.log(`📚 Đã cập nhật tiến độ đọc cho sách ${bookId}`);
      return { success: true, data: data.data };
    }

    throw new Error(data.message || "Lỗi khi đồng bộ tiến độ đọc sách");
  } catch (error) {
    console.error("Error saving book reading progress:", error);
    return {
      success: false,
      error: error.name === "TypeError" ? "NETWORK_ERROR" : "SAVE_ERROR",
      message: error.message,
    };
  }
};

// Lấy tiến độ đọc sách từ server
export const getBookReadingProgress = async (bookId) => {
  try {
    const userId = await getUserId();
    const token = await AsyncStorage.getItem("token");

    if (!userId || !token) {
      return { success: false, error: "USER_NOT_AUTHENTICATED" };
    }

    // Kiểm tra bookId
    if (!bookId || typeof bookId !== "string" || !bookId.startsWith("BOOK")) {
      console.error("❌ bookId không hợp lệ:", bookId);
      return {
        success: false,
        error: "INVALID_BOOK_ID",
        message: "ID sách không hợp lệ",
      };
    }

    console.log(`📚 Đang lấy tiến độ đọc cho sách ${bookId}`);

    // Thử lấy từ API trước
    try {
      const response = await fetch(`${API_URL}/book-history`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Lỗi khi lấy tiến độ đọc sách:", errorData.message);
        return {
          success: false,
          error: "API_ERROR",
          message:
            errorData.message || `HTTP error! status: ${response.status}`,
        };
      }

      const data = await response.json();

      if (data.status && Array.isArray(data.data)) {
        // So sánh trực tiếp với book_id dạng string
        const bookHistory = data.data.find((item) => item.book_id === bookId);

        if (bookHistory) {
          console.log("📚 Đã lấy tiến độ đọc sách từ server");

          // Đồng bộ xuống local storage
          const progress = {
            page: bookHistory.current_page,
            total: bookHistory.total_pages,
            percentage: bookHistory.percentage,
            timestamp: bookHistory.last_read_at,
          };

          const key = `book_progress_${bookId}`;
          await AsyncStorage.setItem(key, JSON.stringify(progress));

          return { success: true, data: progress };
        }
      }
    } catch (error) {
      console.error("Error fetching book progress from API:", error);
    }

    // Fallback to local storage
    const key = `book_progress_${bookId}`;
    const progressJson = await AsyncStorage.getItem(key);

    if (progressJson) {
      const progress = JSON.parse(progressJson);
      console.log(
        `📚 Đã lấy tiến độ đọc sách từ local storage: ${progress.percentage}%`
      );
      return { success: true, data: progress };
    }

    return {
      success: false,
      error: "NOT_FOUND",
      message: "Không tìm thấy thông tin tiến độ đọc",
    };
  } catch (error) {
    console.error("Error getting book reading progress:", error);
    return { success: false, error: "FETCH_ERROR", message: error.message };
  }
};

// Lấy user_id từ token
const getUserId = async () => {
  try {
    // Lấy trực tiếp user_id (cách chính thức)
    const userId = await AsyncStorage.getItem("user_id");
    if (userId) {
      return userId;
    }

    console.error("❌ ERROR: Không tìm thấy user_id trong bộ nhớ!");
    console.error(
      "❌ Người dùng cần đăng xuất và đăng nhập lại để nhận user_id từ server"
    );

    // Thử kiểm tra token
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.error("❌ Token cũng không tồn tại, người dùng chưa đăng nhập");
    } else {
      console.error(
        "❌ Token tồn tại nhưng user_id không được lưu, API có thể không trả về user_id"
      );
    }

    // Trả về null để báo hiệu lỗi
    return null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
};

// Cập nhật danh sách sách đã xem gần đây
const updateRecentlyViewedBooks = async (bookId) => {
  try {
    // Lấy user_id của người dùng hiện tại
    const userId = await getUserId();
    if (!userId) {
      console.log("Không thể cập nhật sách đã xem: Người dùng chưa đăng nhập");
      return;
    }

    // Tạo key dựa vào user_id (đảm bảo riêng biệt cho từng người dùng)
    const key = `recently_viewed_books_${userId}`;
    console.log(`Cập nhật sách đã xem với key: ${key}`);

    // Lấy danh sách sách đã xem của người dùng hiện tại
    let recentlyViewed = [];
    const recentlyViewedJson = await AsyncStorage.getItem(key);

    if (recentlyViewedJson) {
      recentlyViewed = JSON.parse(recentlyViewedJson);
    }

    // Thêm sách hiện tại lên đầu hoặc di chuyển lên đầu nếu đã tồn tại
    const bookIdStr = bookId.toString();
    recentlyViewed = recentlyViewed.filter((id) => id !== bookIdStr);
    recentlyViewed.unshift(bookIdStr);

    // Giữ lại tối đa 10 mục gần đây nhất
    if (recentlyViewed.length > 10) {
      recentlyViewed = recentlyViewed.slice(0, 10);
    }

    await AsyncStorage.setItem(key, JSON.stringify(recentlyViewed));
    console.log(
      `Đã cập nhật danh sách sách đã xem cho người dùng ${userId}: ${recentlyViewed.length} sách`
    );

    // Cập nhật timestamp để các component khác biết có sự thay đổi
    await AsyncStorage.setItem(
      `reading_progress_updated_${userId}`,
      new Date().toISOString()
    );
    await AsyncStorage.setItem(
      "reading_progress_updated",
      new Date().toISOString()
    ); // Giữ lại cho tương thích ngược
  } catch (error) {
    console.error("Error updating recently viewed list:", error);
  }
};

// Lấy danh sách sách đã xem gần đây
export const getRecentlyViewedBooks = async () => {
  try {
    const userId = await getUserId();

    if (!userId) {
      console.log("🚫 Không thể lấy sách đã xem gần đây: Không có user_id");
      return {
        success: false,
        error: "USER_NOT_AUTHENTICATED",
        message: "Người dùng chưa đăng nhập hoặc không tìm thấy ID người dùng",
      };
    }

    const storageKey = `recently_viewed_books_${userId}`;
    console.log(`📚 Đang tìm sách đã xem với key: ${storageKey}`);

    const recentlyViewedJson = await AsyncStorage.getItem(storageKey);
    let bookIds = [];

    if (recentlyViewedJson) {
      bookIds = JSON.parse(recentlyViewedJson);
      console.log(`📚 Đã tìm thấy ${bookIds.length} sách đã xem gần đây`);
    } else {
      console.log("📚 Không tìm thấy sách đã xem gần đây");
    }

    return {
      success: true,
      data: bookIds,
    };
  } catch (error) {
    console.error("Error fetching recently viewed books:", error);
    return {
      success: false,
      error: "FETCH_ERROR",
      message: error.message,
    };
  }
};

// Thêm sách vào danh sách đã xem gần đây
export const addToRecentlyViewedBooks = async (bookId) => {
  try {
    if (!bookId) {
      console.log("🚫 Không thể thêm sách: ID sách không hợp lệ");
      return {
        success: false,
        error: "INVALID_BOOK_ID",
        message: "ID sách không hợp lệ",
      };
    }

    // Lấy user_id
    const userId = await getUserId();

    if (!userId) {
      console.log("🚫 Không thể thêm sách đã xem: Không có user_id");
      return {
        success: false,
        error: "USER_NOT_AUTHENTICATED",
        message: "Người dùng chưa đăng nhập hoặc không tìm thấy ID người dùng",
      };
    }

    const storageKey = `recently_viewed_books_${userId}`;
    console.log(`📚 Thêm sách ${bookId} vào key: ${storageKey}`);

    // Lấy danh sách hiện tại
    const recentlyViewedJson = await AsyncStorage.getItem(storageKey);
    let recentlyViewed = recentlyViewedJson
      ? JSON.parse(recentlyViewedJson)
      : [];

    // Kiểm tra xem sách đã có trong danh sách chưa
    const existingIndex = recentlyViewed.indexOf(bookId.toString());

    // Nếu đã có, xóa vị trí cũ
    if (existingIndex !== -1) {
      recentlyViewed.splice(existingIndex, 1);
    }

    // Thêm vào đầu danh sách
    recentlyViewed.unshift(bookId.toString());

    // Giới hạn số lượng
    const MAX_RECENT_BOOKS = 10;
    if (recentlyViewed.length > MAX_RECENT_BOOKS) {
      recentlyViewed = recentlyViewed.slice(0, MAX_RECENT_BOOKS);
    }

    // Lưu lại
    await AsyncStorage.setItem(storageKey, JSON.stringify(recentlyViewed));
    console.log(
      `📚 Đã lưu ${recentlyViewed.length} sách đã xem gần đây cho user ${userId}`
    );

    return {
      success: true,
      data: recentlyViewed,
    };
  } catch (error) {
    console.error("Error adding book to recently viewed:", error);
    return {
      success: false,
      error: "SAVE_ERROR",
      message: error.message,
    };
  }
};

// Lấy lịch sử đọc sách của người dùng
export const getBookReadingHistory = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const userId = await AsyncStorage.getItem("user_id");

    if (!token || !userId) {
      throw new Error("Unauthorized. Please login.");
    }

    const response = await fetch(`${API_URL}/book-history`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success || data.status) {
      return { success: true, data: data.data };
    } else {
      throw new Error(data.message || "Failed to fetch reading history");
    }
  } catch (error) {
    console.error("Get reading history error:", error);
    return { success: false, message: error.message };
  }
};

// Tạo đối tượng chứa tất cả các hàm
const bookService = {
  getAllBooks,
  getFreeBooks,
  getPaidBooks,
  searchBooks,
  getBookDetails,
  getBookPdfViewUrl,
  saveBookReadingProgress,
  getBookReadingProgress,
  getRecentlyViewedBooks,
  addToRecentlyViewedBooks,
  getBookReadingHistory,
};

// Export default để sửa lỗi "missing required default export"
export default bookService;
