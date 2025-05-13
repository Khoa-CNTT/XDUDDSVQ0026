import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { API_URL } from "./config";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  saveBookReadingProgress,
  getBookReadingProgress,
  getBookPdfViewUrl,
  addToRecentlyViewedBooks,
} from "./services/bookService";

export default function BookViewer() {
  const {
    bookId,
    bookTitle,
    initialPage,
    pdfUrl: directPdfUrl,
  } = useLocalSearchParams();
  const router = useRouter();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(
    initialPage ? parseInt(initialPage, 10) : 1
  );
  const [totalPages, setTotalPages] = useState(1);
  const [readingProgress, setReadingProgress] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [bottomMenuVisible, setBottomMenuVisible] = useState(true);
  const [bookInfo, setBookInfo] = useState(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [pdfViewUrl, setPdfViewUrl] = useState("");
  const [fileUri, setFileUri] = useState(null);

  // Thêm states cho menu
  const [showMenu, setShowMenu] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [activeTab, setActiveTab] = useState("chapters");

  // Reference để theo dõi đã load PDF chưa và đã extract chapters chưa
  const pdfLoadedRef = useRef(false);
  const loadedChapters = useRef(false);

  // Get screen dimensions for better PDF scaling
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  useEffect(() => {
    console.log(
      `BookViewer initialized with bookId: ${bookId}, initialPage: ${
        initialPage || 1
      }`
    );
    // Ghi log directPdfUrl nhưng không sử dụng nó trực tiếp
    if (directPdfUrl) {
      console.log(
        `Direct PDF URL provided but will be ignored for security: ${directPdfUrl}`
      );
    }
    loadBook();
  }, [bookId, initialPage]);

  // Save reading progress whenever current page changes
  useEffect(() => {
    if (bookId && totalPages > 1) {
      saveReadingProgress();

      // Calculate reading progress percentage - ensure we don't get 0 for small values
      const progress = Math.floor((currentPage / totalPages) * 100 || 0);

      // Update progress if value is valid
      if (!isNaN(progress)) {
        setReadingProgress(progress);
      }

      console.log(
        `Progress updated: ${progress}% (Page ${currentPage}/${totalPages})`
      );
    }
  }, [currentPage, totalPages, bookId]);

  // Xác định chapter hiện tại dựa trên trang hiện tại
  const currentChapter = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;

    // Sắp xếp chapters theo số trang
    const sortedChapters = [...chapters].sort((a, b) => a.page - b.page);

    // Tìm chapter hiện tại dựa trên trang
    let foundChapter = sortedChapters[0]; // Mặc định là chapter đầu tiên

    for (let i = 0; i < sortedChapters.length; i++) {
      if (currentPage >= sortedChapters[i].page) {
        foundChapter = sortedChapters[i];
      } else {
        break; // Dừng khi tìm thấy chapter có số trang lớn hơn trang hiện tại
      }
    }

    return foundChapter;
  }, [chapters, currentPage]);

  // Cập nhật useEffect để tạo chapters khi biết số trang
  useEffect(() => {
    if (totalPages > 0 && !loadedChapters.current) {
      console.log(`Creating chapters for ${totalPages} pages`);
      extractChapters();
    }
  }, [totalPages]);

  // Tạo chapters tự động dựa trên số trang
  const extractChapters = () => {
    if (totalPages <= 0) return;

    console.log("Tạo chapters tự động dựa trên số trang");

    const autoChapters = [];
    // Khoảng cách giữa các chapter, tối đa 10 chapter hoặc khoảng 10 trang/chapter
    const chapterInterval = Math.max(1, Math.ceil(totalPages / 10));

    for (let i = 1; i <= totalPages; i += chapterInterval) {
      autoChapters.push({
        id: autoChapters.length + 1,
        title: `Trang ${i}`,
        page: i,
      });
    }

    console.log(
      `Created ${autoChapters.length} chapters with interval ${chapterInterval}`
    );
    setChapters(autoChapters);
    loadedChapters.current = true;
  };

  // Log khi chapter hiện tại thay đổi (để debug)
  useEffect(() => {
    if (currentChapter) {
      console.log(
        `Current chapter: ${currentChapter.title} (Page ${currentChapter.page})`
      );
    }
  }, [currentChapter]);

  const loadReadingProgress = async () => {
    if (!bookId) return;

    try {
      // Sử dụng hàm mới từ bookService
      const response = await getBookReadingProgress(bookId);

      if (response.success && response.data) {
        const progress = response.data;
        const page = parseInt(progress.page, 10) || 1;
        const total = parseInt(progress.total, 10) || 1;

        console.log(
          `Loaded reading progress: page ${page}/${total}, percentage: ${progress.percentage}%`
        );

        setCurrentPage(page);
        setTotalPages(total);

        // Set progress percentage
        const progressPercent =
          progress.percentage || Math.floor((page / total) * 100 || 0);
        setReadingProgress(progressPercent);

        // Log the calculated progress percentage for debugging
        console.log(`Set reading progress percentage to: ${progressPercent}%`);
      }
    } catch (error) {
      console.error("Error loading reading progress:", error);
    }
  };

  const saveReadingProgress = async () => {
    if (!bookId || totalPages <= 1) return;

    try {
      // Sử dụng hàm mới từ bookService
      await saveBookReadingProgress(bookId, currentPage, totalPages);
    } catch (error) {
      console.error("Error saving reading progress:", error);
    }
  };

  const updateRecentlyViewed = async () => {
    try {
      console.log(`📚 Thêm sách ID ${bookId} vào danh sách đã xem gần đây`);

      // Sử dụng hàm từ bookService
      const response = await addToRecentlyViewedBooks(bookId);

      if (response.success) {
        console.log(`📚 Đã cập nhật thành công danh sách sách đã xem`);
      } else {
        console.log(`📚 Lỗi cập nhật sách đã xem: ${response.message}`);

        // Xử lý các trường hợp lỗi đặc biệt
        if (response.error === "USER_NOT_AUTHENTICATED") {
          console.log(
            "📚 Lỗi xác thực người dùng, sẽ không lưu lịch sử đọc sách"
          );
        }
      }
    } catch (error) {
      console.error("Error updating recently viewed books:", error);
    }
  };

  const loadBook = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Starting to load book...");

      // First, load reading progress
      await loadReadingProgress();

      // Get user token for authentication
      const userToken = await AsyncStorage.getItem("token");
      if (!userToken) {
        throw new Error("Bạn cần đăng nhập để xem sách");
      }

      // Set book title if provided
      if (bookTitle) {
        setBookInfo({ name_book: bookTitle });
      }

      // Tải thông tin sách nếu chưa có title
      if (!bookTitle) {
        try {
          console.log(`Đang tải thông tin sách...`);
          const response = await fetch(`${API_URL}/books/${bookId}`, {
            headers: { Authorization: `Bearer ${userToken}` },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.status && data.data) {
              setBookInfo(data.data);
            }
          } else {
            console.log(`Không thể tải thông tin sách: ${response.status}`);
          }
        } catch (e) {
          console.error("Lỗi khi tải thông tin sách:", e);
        }
      }

      // Make sure we log the current page before proceeding
      console.log(
        `Reading progress before loading PDF: page ${currentPage}/${totalPages}, progress ${readingProgress}%`
      );

      // Sử dụng service để lấy URL đúng
      const pdfUrlResult = await getBookPdfViewUrl(bookId);
      if (!pdfUrlResult.success) {
        throw new Error(`Không thể lấy URL của PDF: ${pdfUrlResult.message}`);
      }

      const pdfUrl = pdfUrlResult.pdfUrl;
      console.log(`Sử dụng URL PDF: ${pdfUrl}`);
      setPdfViewUrl(pdfUrl);

      // Tải PDF về thiết bị trước khi hiển thị
      await downloadAndDisplayPdf(pdfUrl, userToken);
    } catch (err) {
      console.error("Error loading book:", err);
      setError(err.message || "Không thể tải sách");
      setLoading(false);
    }
  };

  const downloadAndDisplayPdf = async (pdfUrl, userToken) => {
    try {
      console.log("Tải sách về bộ nhớ cục bộ...");

      // Tạo tên file dựa vào bookId
      const fileName = `book_${bookId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      setFileUri(fileUri);

      // Kiểm tra xem file đã tồn tại chưa
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (fileInfo.exists && fileInfo.size > 5000) {
        console.log("Sử dụng file đã tải từ trước:", fileUri);
        createPdfViewerHTML(fileUri);
        setLoading(false);
      } else {
        // Tải file mới
        console.log("Đang tải PDF mới về:", fileUri);
        console.log("URL tải PDF:", pdfUrl);

        // Trước tiên kiểm tra response bằng fetch
        console.log("Kiểm tra response từ server...");
        const checkResponse = await fetch(pdfUrl, {
          headers: { Authorization: `Bearer ${userToken}` },
        });

        if (!checkResponse.ok) {
          throw new Error(
            `Server trả về lỗi: ${checkResponse.status} ${checkResponse.statusText}`
          );
        }

        const contentType = checkResponse.headers.get("content-type");
        console.log("Content type:", contentType);

        // Kiểm tra nếu response là HTML thay vì PDF
        if (contentType && contentType.includes("text/html")) {
          const htmlText = await checkResponse.text();
          console.log("Server trả về HTML thay vì PDF");

          if (
            htmlText.includes("login") ||
            htmlText.includes("unauthorized") ||
            htmlText.includes("đăng nhập") ||
            htmlText.includes("không có quyền")
          ) {
            throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại");
          } else {
            throw new Error(
              "Server trả về HTML thay vì PDF. Vui lòng liên hệ admin"
            );
          }
        }

        if (!contentType || !contentType.includes("application/pdf")) {
          throw new Error(`Server không trả về PDF: ${contentType}`);
        }

        // Lấy kích thước file từ header nếu có
        const contentLength = checkResponse.headers.get("content-length");
        console.log(
          `Kích thước file theo server: ${
            contentLength || "Không xác định"
          } bytes`
        );

        // Sử dụng gạch nối trong tên tham số để tránh lỗi
        const downloadOptions = {
          headers: { Authorization: `Bearer ${userToken}` },
          cache: false,
        };

        console.log("Bắt đầu tải PDF...");
        const downloadResumable = FileSystem.createDownloadResumable(
          pdfUrl,
          fileUri,
          downloadOptions,
          (downloadProgress) => {
            if (downloadProgress.totalBytesExpectedToWrite > 0) {
              const progress =
                (downloadProgress.totalBytesWritten /
                  downloadProgress.totalBytesExpectedToWrite) *
                100;
              console.log(`Tiến độ tải: ${progress.toFixed(2)}%`);
            } else {
              // Nếu không có thông tin kích thước, chỉ hiển thị số byte đã tải
              console.log(
                `Đã tải: ${downloadProgress.totalBytesWritten} bytes`
              );
            }
          }
        );

        const downloadResult = await downloadResumable.downloadAsync();

        if (!downloadResult) {
          throw new Error("Không thể tải file PDF");
        }

        const downloadedFileInfo = await FileSystem.getInfoAsync(fileUri);
        console.log(
          `Đã tải xong PDF, kích thước: ${downloadedFileInfo.size} bytes`
        );

        if (downloadedFileInfo.size < 1000) {
          // Kiểm tra nội dung file nếu kích thước quá nhỏ
          const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: "utf8",
          });
          console.log(
            "Nội dung file tải về (100 ký tự đầu):",
            fileContent.substring(0, 100)
          );

          if (
            fileContent.includes("<!DOCTYPE html>") ||
            fileContent.includes("<html>")
          ) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
            throw new Error(
              "Server trả về HTML thay vì PDF. Vui lòng kiểm tra token hoặc quyền truy cập."
            );
          }

          throw new Error(
            "File PDF tải về quá nhỏ, có thể không phải file PDF hợp lệ"
          );
        }

        // Kiểm tra xem file tải về có phải là PDF không bằng cách đọc header
        const pdfHeader = await FileSystem.readAsStringAsync(fileUri, {
          encoding: "utf8",
          position: 0,
          length: 8,
        });

        if (!pdfHeader.startsWith("%PDF-")) {
          console.log("Header file không phải PDF:", pdfHeader);
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
          throw new Error("File tải về không phải là PDF hợp lệ");
        }

        createPdfViewerHTML(fileUri);
        setLoading(false);
      }
    } catch (error) {
      console.error("Lỗi khi tải PDF:", error);
      setError(`Không thể tải sách: ${error.message}`);
      setLoading(false);
    }
  };

  const createPdfViewerHTML = (filePath) => {
    console.log("Tạo PDF viewer với file local:", filePath);
    console.log(
      `Current reading state: page ${currentPage}/${totalPages}, progress: ${readingProgress}%`
    );

    // Create HTML with PDF.js viewer that loads the local file
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
          <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js"></script>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              font-family: Arial, sans-serif;
              background-color: #f0f0f0;
              overflow: hidden;
              touch-action: pan-y pinch-zoom;
            }
            #loading {
              display: flex;
              justify-content: center;
              align-items: center;
              flex-direction: column;
              height: 100%;
              width: 100%;
              position: absolute;
              top: 0;
              left: 0;
              background-color: rgba(240, 240, 240, 0.9);
              z-index: 999;
            }
            .spinner {
              border: 6px solid rgba(0, 0, 0, 0.1);
              width: 50px;
              height: 50px;
              border-radius: 50%;
              border-left-color: #3b82f6;
              animation: spin 1s ease infinite;
              margin-bottom: 15px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            #pdf-container {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              overflow: auto;
              padding-top: ${Platform.OS === "android" ? 56 : 60}px;
              box-sizing: border-box;
              -webkit-overflow-scrolling: touch;
            }
            .page-canvas {
              display: block;
              border: none;
              background: white;
              width: 100% !important;
              height: auto !important;
              margin: 0 auto !important;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            #page-info {
              position: fixed;
              bottom: 10px;
              left: 50%;
              transform: translateX(-50%);
              background-color: rgba(0,0,0,0.5);
              color: white;
              padding: 8px 15px;
              border-radius: 20px;
              font-size: 14px;
              z-index: 100;
              opacity: 0.7;
              transition: opacity 0.3s;
            }
            #page-info.fade {
              opacity: 0;
            }
            #progress-bar-container {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 5px;
              background: rgba(0,0,0,0.1);
              z-index: 102;
            }
            #progress-bar {
              height: 100%;
              background: #3b82f6;
              width: ${readingProgress}%;
              transition: width 0.3s ease;
            }
            #loading p {
              margin-top: 15px;
              color: #333;
              font-size: 22px;
              font-weight: 500;
              text-align: center;
            }
            .loading-progress {
              font-size: 20px;
              margin-top: 10px;
              color: #3b82f6;
              font-weight: bold;
            }
            #debug {
              position: fixed;
              bottom: 40px;
              left: 10px;
              color: red;
              background: white;
              padding: 5px;
              border-radius: 5px;
              font-size: 12px;
              max-width: 80%;
              z-index: 1000;
              opacity: 0.8;
            }
            #error-container {
              display: none;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background-color: rgba(255, 0, 0, 0.1);
              padding: 20px;
              border-radius: 10px;
              text-align: center;
              z-index: 1001;
            }
            #error-container h3 {
              color: #d32f2f;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div id="loading">
            <div class="spinner"></div>
            <p>Đang tải sách...</p>
            <div class="loading-progress" id="loading-progress">Đang chuẩn bị tài liệu...</div>
          </div>
         
          <div id="progress-bar-container">
            <div id="progress-bar" style="width: ${readingProgress}%"></div>
          </div>
         
          <div id="pdf-container"></div>
         
          <div id="page-info" class="fade">Trang ${currentPage} / ${totalPages}</div>
          
          <div id="debug"></div>
          
          <div id="error-container">
            <h3>Lỗi khi tải sách</h3>
            <p id="error-message"></p>
          </div>
         
          <script>
            // Configure PDF.js worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
           
            // Variables for PDF rendering
            let pdfDoc = null;
            let currentPage = ${currentPage};
            let scale = 1.5;
            let pageRendering = false;
            let pageNumPending = null;
            let totalPagesCount = ${totalPages};
            let currentProgressPercentage = ${readingProgress};
            const container = document.getElementById('pdf-container');
            const loading = document.getElementById('loading');
            const loadingProgress = document.getElementById('loading-progress');
            const pageInfo = document.getElementById('page-info');
            const progressBar = document.getElementById('progress-bar');
            const debug = document.getElementById('debug');
            const errorContainer = document.getElementById('error-container');
            const errorMessage = document.getElementById('error-message');
            
            // Function to log debug messages
            function logDebug(message) {
              console.log(message);
              if (debug) {
                debug.textContent += message + '\\n';
              }
              window.ReactNativeWebView.postMessage('DEBUG:' + message);
            }
            
            // Calculate screen size
            const screenWidth = ${screenWidth};
            const isAndroid = ${Platform.OS === "android" ? "true" : "false"};
           
            // Variables for touch handling
            let touchStartX = 0;
            let touchEndX = 0;
            let touchStartY = 0;
            let touchEndY = 0;
            let lastTap = 0;
            let tappedTwice = false;
            
            // Threshold for swipe detection
            const SWIPE_THRESHOLD = 50;
            
            // Auto-hide page info after delay
            let pageInfoTimeout;
            function showPageInfo() {
              pageInfo.classList.remove('fade');
              clearTimeout(pageInfoTimeout);
              pageInfoTimeout = setTimeout(() => {
                pageInfo.classList.add('fade');
              }, 2000);
            }

            // Update page info and progress immediately with saved values
            pageInfo.textContent = 'Trang ' + currentPage + ' / ' + totalPagesCount;
            showPageInfo();
            progressBar.style.width = currentProgressPercentage + '%';
            // logDebug('Initial progress set to: ' + currentProgressPercentage + '%');

            // Function for PDF rendering
            function renderPage(num) {
              if (!pdfDoc) return;
             
              if (num < 1) num = 1;
              if (num > pdfDoc.numPages) num = pdfDoc.numPages;
             
              pageRendering = true;
              pageInfo.textContent = 'Trang ' + num + ' / ' + pdfDoc.numPages;
              showPageInfo();
             
              currentPage = num;
             
              const progress = Math.floor((currentPage / pdfDoc.numPages * 100) || 0);
              progressBar.style.width = progress + '%';
            //   logDebug('Progress updated to: ' + progress + '%');
             
              // Notify React Native when page changes
              window.ReactNativeWebView.postMessage('PAGE_CHANGE:' + currentPage + ':' + pdfDoc.numPages);
             
              const oldCanvas = container.querySelector('.page-canvas');
              if (oldCanvas) {
                oldCanvas.style.opacity = '0.3';
              } else {
                while (container.firstChild) {
                  container.removeChild(container.firstChild);
                }
              }
             
              requestAnimationFrame(() => {
                pdfDoc.getPage(num).then(function(page) {
                  // Calculate viewport to fit width
                  const pageWidth = page.getViewport({ scale: 1.0 }).width;
                  const containerWidth = container.clientWidth;
                  
                  // Get optimal scale
                  const optimalScale = containerWidth / pageWidth;
                  const finalScale = isAndroid ? Math.max(scale, optimalScale) : scale;
                  
                  const viewport = page.getViewport({ scale: finalScale });
                  
                  const canvas = document.createElement('canvas');
                  canvas.className = 'page-canvas';
                  canvas.style.opacity = '0';
                 
                  canvas.width = Math.floor(viewport.width);
                  canvas.height = Math.floor(viewport.height);
                 
                  canvas.style.width = '100%';
                  
                  container.appendChild(canvas);
                 
                  const ctx = canvas.getContext('2d');
                  
                  const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                  };
                 
                  const renderTask = page.render(renderContext);
                 
                  renderTask.promise.then(function() {
                    pageRendering = false;
                   
                    if (oldCanvas) {
                      container.removeChild(oldCanvas);
                    }
                   
                    requestAnimationFrame(() => {
                      canvas.style.transition = 'opacity 0.2s';
                      canvas.style.opacity = '1';
                    });
                   
                    if (pageNumPending !== null) {
                      renderPage(pageNumPending);
                      pageNumPending = null;
                    }
                  });
                });
               
                container.scrollTop = 0;
              });
            }
           
            // Queue functions
            function queueRenderPage(num) {
              if (pageRendering) {
                pageNumPending = num;
              } else {
                renderPage(num);
              }
            }
           
            // Navigation functions
            function goToPrevPage() {
              if (currentPage <= 1) return;
              queueRenderPage(currentPage - 1);
              return true;
            }
           
            function goToNextPage() {
              if (currentPage >= pdfDoc.numPages) return;
              queueRenderPage(currentPage + 1);
              return true;
            }
           
            // Touch handling
            function handleTouchStart(evt) {
              touchStartX = evt.changedTouches[0].screenX;
              touchStartY = evt.changedTouches[0].screenY;
             
              const currentTime = new Date().getTime();
              const tapLength = currentTime - lastTap;
              
              if (tapLength < 300 && tapLength > 0) {
                tappedTwice = true;
                evt.preventDefault();
                
                if (scale > 1.5) {
                  scale = 1.5;
                } else {
                  scale = isAndroid ? 2.5 : 2.0;
                }
                
                queueRenderPage(currentPage);
              } else {
                tappedTwice = false;
                setTimeout(() => {
                  if (!tappedTwice) {
                    // Single tap will be handled in touchend
                  }
                }, 300);
              }
              lastTap = currentTime;
            }
           
            function handleTouchEnd(evt) {
              touchEndX = evt.changedTouches[0].screenX;
              touchEndY = evt.changedTouches[0].screenY;
             
              // Calculate distance moved
              const deltaX = Math.abs(touchEndX - touchStartX);
              const deltaY = Math.abs(touchEndY - touchStartY);
             
              // If it's a swipe (significant horizontal movement)
              if (deltaX > SWIPE_THRESHOLD && deltaY < 75) {
                handleSwipe();
              }
              
              // If it's a tap (very little movement)
              if (deltaX < 10 && deltaY < 10 && !tappedTwice) {
                // Toggle menu on tap
                window.ReactNativeWebView.postMessage('TOGGLE_MENU');
              }
            }
           
            function handleSwipe() {
              if (touchEndX < touchStartX - SWIPE_THRESHOLD) {
                // Swipe left - go to next page
                if (goToNextPage()) {
                  tappedTwice = true;
                  setTimeout(() => { tappedTwice = false; }, 100);
                }
              }
              if (touchEndX > touchStartX + SWIPE_THRESHOLD) {
                // Swipe right - go to previous page
                if (goToPrevPage()) {
                  tappedTwice = true;
                  setTimeout(() => { tappedTwice = false; }, 100);
                }
              }
            }
           
            // Add touch event listeners
            document.addEventListener('touchstart', handleTouchStart, false);
            document.addEventListener('touchend', handleTouchEnd, false);

            // Helper function to show errors
            function showError(text) {
              errorMessage.textContent = text;
              errorContainer.style.display = 'block';
              loading.style.display = 'none';
              window.ReactNativeWebView.postMessage('PDF_ERROR: ' + text);
            }

            // Request PDF data from React Native
            async function loadPdf() {
              try {
                // logDebug('Đang yêu cầu dữ liệu PDF từ app');
                window.ReactNativeWebView.postMessage('REQUEST_PDF_DATA');
              } catch (error) {
                // logDebug('Lỗi khi yêu cầu dữ liệu PDF: ' + error.message);
                showError(error.message);
              }
            }
            
            // Function to handle PDF data sent from React Native
            window.handlePdfData = async function(base64Data) {
              try {
                loadingProgress.textContent = 'Đang chuẩn bị tài liệu...';
               
                setTimeout(async () => {
                  try {
                    const binaryString = window.atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                   
                    // Process in chunks to avoid UI freezing
                    const chunkSize = 10000;
                    for (let i = 0; i < binaryString.length; i += chunkSize) {
                      const chunk = Math.min(chunkSize, binaryString.length - i);
                      for (let j = 0; j < chunk; j++) {
                        bytes[i + j] = binaryString.charCodeAt(i + j);
                      }
                     
                      if (i + chunk < binaryString.length) {
                        const progress = Math.floor((i / binaryString.length) * 100);
                        loadingProgress.textContent = 'Đang xử lý PDF... ' + progress + '%';
                        await new Promise(resolve => setTimeout(resolve, 0));
                      }
                    }
                   
                    loadingProgress.textContent = 'Đang tải tài liệu...';
                   
                    const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
                    pdfDoc = await loadingTask.promise;
                    totalPagesCount = pdfDoc.numPages;
                    
                    // Store the intended page to navigate to
                    const targetPage = currentPage;
                   
                    // logDebug('PDF đã tải thành công. Số trang: ' + pdfDoc.numPages);
                    window.ReactNativeWebView.postMessage('TOTAL_PAGES:' + pdfDoc.numPages);
                   
                    // Make sure currentPage is valid
                    if (targetPage > pdfDoc.numPages) {
                      currentPage = 1;
                    } else {
                      currentPage = targetPage; // Ensure we keep the desired page
                    }
                   
                    loading.style.display = 'none';
                   
                    // Use the stored target page instead of currentPage
                    logDebug('Chuyển đến trang đã lưu: ' + currentPage);
                    renderPage(currentPage);
                   
                    window.ReactNativeWebView.postMessage('PDF_LOADED');
                  } catch (error) {
                    logDebug('Lỗi khi hiển thị PDF: ' + error.message);
                    showError(error.message);
                  }
                }, 0);
              } catch (error) {
                logDebug('Lỗi khi xử lý dữ liệu PDF: ' + error.message);
                showError(error.message);
              }
            };
            
            // Start loading
            loadPdf();
          </script>
        </body>
      </html>
    `;

    setHtmlContent(html);
  };

  const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;

    // Handle debug messages
    if (message.startsWith("DEBUG:")) {
      console.log("WebView Debug:", message.substring(6));
      return;
    }

    if (message === "TOGGLE_MENU") {
      toggleBottomMenu();
    }

    if (message.includes("PDF_LOAD_ERROR") || message.includes("PDF_ERROR")) {
      console.warn(`Book loading error: ${message}`);
      setError("Không thể tải sách. " + message);
    }

    if (message === "PDF_LOADED") {
      console.log("Book fully loaded");
      pdfLoadedRef.current = true;

      // Tạo chapters tự động nếu chưa tạo và nếu đã biết tổng số trang
      if (!loadedChapters.current && totalPages > 0) {
        console.log("Creating chapters after PDF loaded");
        extractChapters();
      }
    }

    // Handle request for PDF data
    if (message === "REQUEST_PDF_DATA" && fileUri) {
      (async () => {
        try {
          console.log("WebView requested PDF data, loading from:", fileUri);
          const base64Data = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Inject our saved page number before handling the PDF data
          if (webViewRef.current) {
            console.log(`Ensuring initial page is set to: ${currentPage}`);
            webViewRef.current.injectJavaScript(`
              currentPage = ${currentPage};
              handlePdfData("${base64Data}"); 
              true;
            `);
          }
        } catch (error) {
          console.error("Error reading PDF file for WebView:", error);
          setError(`Lỗi khi đọc file PDF: ${error.message}`);
        }
      })();
    }

    // Handle page change messages
    if (message.startsWith("PAGE_CHANGE:")) {
      const parts = message.split(":");
      if (parts.length === 3) {
        const page = parseInt(parts[1], 10);
        const total = parseInt(parts[2], 10);

        if (!isNaN(page) && page > 0 && !isNaN(total) && total > 0) {
          console.log(`Received page change: ${page}/${total}`);

          let shouldUpdate = false;

          if (page !== currentPage) {
            shouldUpdate = true;
            setCurrentPage(page);
          }

          if (total !== totalPages && total > 0) {
            shouldUpdate = true;
            setTotalPages(total);
          }

          if (shouldUpdate) {
            console.log("Saving reading progress after page change");
            setTimeout(() => saveReadingProgress(), 100);
          }
        }
      }
    }

    // Handle total pages message
    if (message.startsWith("TOTAL_PAGES:")) {
      const total = parseInt(message.split(":")[1], 10);
      if (!isNaN(total) && total > 0) {
        console.log(`Setting total pages to ${total}`);
        setTotalPages(total);

        // Tạo chapters khi biết số trang
        if (!loadedChapters.current) {
          console.log("Creating chapters after receiving total pages");
          setTimeout(() => extractChapters(), 300);
        }
      }
    }
  };

  // Function to toggle bottom menu
  const toggleBottomMenu = () => {
    setBottomMenuVisible((prev) => !prev);
    setControlsVisible((prev) => !prev);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          queueRenderPage(${currentPage + 1});
          true;
        `);
      }
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          queueRenderPage(${currentPage - 1});
          true;
        `);
      }
    }
  };

  // For debugging
  const showDebugInfo = () => {
    Alert.alert(
      "Thông tin sách",
      `Book ID: ${bookId}\nTrang: ${currentPage}/${totalPages}\nTiến độ: ${readingProgress}%\nPDF URL: ${
        pdfViewUrl || directPdfUrl || "Không có"
      }\nFile URI: ${fileUri || "Không có"}`,
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Add Stack navigator with headerShown false */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={[styles.header, controlsVisible ? null : styles.headerHidden]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bookInfo?.name_book || bookTitle || "Đang đọc"}
        </Text>

        <TouchableOpacity style={styles.debugButton} onPress={showDebugInfo}>
          <Icon name="info" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(true)}
        >
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Đang tải sách...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#ff0000" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBook}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.webView}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            mixedContentMode="always"
            startInLoadingState={true}
            onMessage={handleWebViewMessage}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error("WebView error:", nativeEvent);
              setError(
                `Lỗi WebView: ${
                  nativeEvent.description || "Lỗi không xác định"
                }`
              );
            }}
            scalesPageToFit={Platform.OS === "android"}
          />

          {/* Bottom menu */}
          <View
            style={[
              styles.bottomMenu,
              bottomMenuVisible ? null : styles.bottomMenuHidden,
            ]}
          >
            <View style={styles.pageNavigationContainer}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={goToPrevPage}
                disabled={currentPage <= 1}
              >
                <Icon
                  name="navigate-before"
                  size={28}
                  color={currentPage <= 1 ? "#ccc" : "#3b82f6"}
                />
              </TouchableOpacity>

              <View style={styles.pageInfo}>
                <Text style={styles.pageText}>
                  {currentPage} / {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.navButton}
                onPress={goToNextPage}
                disabled={currentPage >= totalPages}
              >
                <Icon
                  name="navigate-next"
                  size={28}
                  color={currentPage >= totalPages ? "#ccc" : "#3b82f6"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Menu Modal giống PdfViewer */}
      {showMenu && (
        <View style={styles.menuModal}>
          <View style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Always show pages view */}
            <ScrollView style={styles.pagesScrollView}>
              <View style={styles.pagesGrid}>
                {Array.from({ length: Math.ceil(totalPages / 30) }, (_, i) => (
                  <View key={i} style={styles.pageSection}>
                    <Text style={styles.pageSectionTitle}>
                      {i * 30 + 1} - {Math.min((i + 1) * 30, totalPages)}
                    </Text>
                    <View style={styles.pageButtonsGrid}>
                      {Array.from(
                        { length: Math.min(30, totalPages - i * 30) },
                        (_, j) => i * 30 + j + 1
                      ).map((page) => (
                        <TouchableOpacity
                          key={page}
                          style={[
                            styles.pageButton,
                            currentPage === page && styles.currentPageButton,
                          ]}
                          onPress={() => {
                            setCurrentPage(page);
                            setShowMenu(false);
                            webViewRef.current?.injectJavaScript(`
                              queueRenderPage(${page});
                              true;
                            `);
                          }}
                        >
                          <Text
                            style={[
                              styles.pageButtonText,
                              currentPage === page &&
                                styles.currentPageButtonText,
                            ]}
                          >
                            {page}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: Platform.OS === "ios" ? 40 : 8,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 3,
    height: Platform.OS === "ios" ? 88 : 56,
  },
  headerHidden: {
    transform: [{ translateY: -100 }],
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  debugButton: {
    padding: 8,
  },
  menuButton: {
    marginLeft: 16,
  },
  webViewContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#f0f0f0",
    marginTop: Platform.OS === "ios" ? 88 : 56,
    marginBottom: 0,
  },
  webView: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#6b7280",
    fontSize: 18,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    marginTop: 16,
    color: "#ef4444",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  bottomMenu: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 3,
  },
  bottomMenuHidden: {
    transform: [{ translateY: 100 }],
  },
  pageNavigationContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  navButton: {
    padding: 8,
    borderRadius: 30,
    backgroundColor: "rgba(235, 235, 235, 0.5)",
  },
  pageInfo: {
    marginHorizontal: 15,
    alignItems: "center",
    minWidth: 80,
  },
  pageText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },

  // Menu Modal styles
  menuModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  menuContent: {
    position: "absolute",
    top: Platform.OS === "ios" ? 88 : 56,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  pagesScrollView: {
    flex: 1,
  },
  pagesGrid: {
    padding: 8,
  },
  pageSection: {
    marginBottom: 16,
  },
  pageSectionTitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  pageButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  pageButton: {
    width: "16.666%",
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
    margin: 4,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  currentPageButton: {
    backgroundColor: "#3b82f6",
  },
  pageButtonText: {
    fontSize: 14,
    color: "#374151",
  },
  currentPageButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
