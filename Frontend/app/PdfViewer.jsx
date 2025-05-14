import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  Share,
  Dimensions,
  PixelRatio,
  FlatList,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./config";
import Icon from "react-native-vector-icons/MaterialIcons";
import { savePdfReadingProgress } from "./services/pdfService";

export default function PdfViewer() {
  const { pdfId, localPath, initialPage } = useLocalSearchParams();
  const router = useRouter();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState(null);
  const [fileUri, setFileUri] = useState(null);
  const [error, setError] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [viewMethod, setViewMethod] = useState("pdfjs"); // Changed default to 'pdfjs' since it's working
  const [currentPage, setCurrentPage] = useState(
    initialPage ? parseInt(initialPage, 10) : 1
  );
  const [totalPages, setTotalPages] = useState(1);
  const [readingProgress, setReadingProgress] = useState(0);
  const [savedProgressPercentage, setSavedProgressPercentage] = useState(null); // Store the saved progress percentage
  const [controlsVisible, setControlsVisible] = useState(true); // Track if controls are visible
  const [bottomMenuVisible, setBottomMenuVisible] = useState(true); // Track if bottom menu is visible
  const [showMenu, setShowMenu] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [activeTab, setActiveTab] = useState("chapters");

  // Get screen dimensions for better PDF scaling
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const pixelRatio = PixelRatio.get(); // Get device pixel ratio for better resolution

  // Reference to track if the PDF has loaded
  const pdfLoadedRef = useRef(false);
  const loadedChapters = useRef(false);

  useEffect(() => {
    console.log(
      `PdfViewer initialized with pdfId: ${pdfId}, initialPage: ${
        initialPage || 1
      }`
    );
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        if (localPath) {
          await handleLocalFile(decodeURIComponent(localPath));
        } else if (pdfId) {
          // If initial page was provided, set it before loading progress
          if (initialPage) {
            setCurrentPage(parseInt(initialPage, 10));
          }
          await loadReadingProgress();
          await downloadPdf();
        } else {
          throw new Error("No PDF specified");
        }
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError(err.message || "Failed to load PDF");
        setLoading(false);
      }
    };

    loadPdf();
  }, [pdfId, localPath, viewMethod, initialPage]);

  // Save reading progress whenever current page changes
  useEffect(() => {
    if (pdfId && totalPages > 1) {
      saveReadingProgress();

      // Calculate reading progress percentage
      const progress = Math.floor((currentPage / totalPages) * 100);

      // Only update if it's valid (greater than 0) and the PDF has properly loaded
      if (progress > 0 || totalPages > 1) {
        setReadingProgress(progress);
      } else if (savedProgressPercentage !== null) {
        // Use saved percentage until PDF fully loads
        setReadingProgress(savedProgressPercentage);
      }

      console.log(
        `Progress updated: ${progress}% (Page ${currentPage}/${totalPages})`
      );
    }
  }, [currentPage, totalPages, pdfId, savedProgressPercentage]);

  const loadReadingProgress = async () => {
    if (!pdfId) return;

    try {
      // Load from local storage only (database sync removed)
      const key = `pdf_progress_${pdfId}`;
      const savedProgress = await AsyncStorage.getItem(key);

      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);
          const page = parseInt(progress.page, 10) || 1;
          const total = parseInt(progress.total, 10) || 1;

          console.log(
            `Loaded reading progress from local storage: page ${page}/${total}`
          );

          // Set page and total in state
          setCurrentPage(page);
          setTotalPages(total);

          // If percentage is saved, use it directly
          if (progress.percentage) {
            setSavedProgressPercentage(progress.percentage);
            setReadingProgress(progress.percentage);
          } else {
            // Calculate and set progress percentage
            const progressPercent = Math.floor((page / total) * 100);
            setSavedProgressPercentage(progressPercent);
            setReadingProgress(progressPercent);
          }
        } catch (parseError) {
          console.error("Error parsing saved progress:", parseError);
          // Reset to defaults if parsing fails
          setCurrentPage(1);
          setTotalPages(1);
          setReadingProgress(0);
          setSavedProgressPercentage(null);
        }
      }
    } catch (error) {
      console.error("Error loading reading progress:", error);
    }
  };

  const saveReadingProgress = async () => {
    if (!pdfId || totalPages <= 1) return;

    try {
      // Calculate current progress percentage
      const progressPercentage = Math.floor((currentPage / totalPages) * 100);

      // Save to AsyncStorage (local) only
      const key = `pdf_progress_${pdfId}`;
      const progressData = JSON.stringify({
        page: currentPage,
        total: totalPages,
        percentage: progressPercentage,
        timestamp: new Date().toISOString(),
      });

      await AsyncStorage.setItem(key, progressData);
      console.log(
        `Saved reading progress locally: page ${currentPage}/${totalPages} (${progressPercentage}%)`
      );

      // Update the saved percentage
      setSavedProgressPercentage(progressPercentage);

      // Gọi API để lưu lên server
      try {
        const response = await savePdfReadingProgress(
          pdfId,
          currentPage,
          totalPages
        );
        if (response.success) {
          console.log(
            `📄 Đã lưu tiến độ đọc PDF lên server thành công: ${progressPercentage}%`
          );
        } else {
          console.warn(
            `📄 Không thể lưu tiến độ đọc PDF lên server: ${
              response.message || "Lỗi không xác định"
            }`
          );
        }
      } catch (apiError) {
        console.error("📄 Lỗi khi lưu tiến độ đọc lên server:", apiError);
        // Tiếp tục sử dụng local storage nếu API lỗi
      }

      // Update recently viewed documents list to improve sync between screens
      try {
        // Lấy user_id để lưu riêng cho từng người dùng
        const userId = await AsyncStorage.getItem("user_id");

        if (userId) {
          const recentlyViewedKey = `recently_viewed_docs_${userId}`;
          let recentlyViewed = [];
          const recentlyViewedJson = await AsyncStorage.getItem(
            recentlyViewedKey
          );

          if (recentlyViewedJson) {
            recentlyViewed = JSON.parse(recentlyViewedJson);
          }

          // Add current PDF to the top if not already there, or move to top if exists
          const pdfIdStr = pdfId.toString();
          recentlyViewed = recentlyViewed.filter((id) => id !== pdfIdStr);
          recentlyViewed.unshift(pdfIdStr);

          // Keep only the most recent 10 items
          if (recentlyViewed.length > 10) {
            recentlyViewed = recentlyViewed.slice(0, 10);
          }

          await AsyncStorage.setItem(
            recentlyViewedKey,
            JSON.stringify(recentlyViewed)
          );
          console.log(
            `📄 Đã cập nhật danh sách PDF đã xem cho người dùng ${userId}`
          );
        } else {
          console.warn(
            "📄 Không thể cập nhật danh sách PDF đã xem: không tìm thấy user_id"
          );
        }
      } catch (recentError) {
        console.error("Error updating recently viewed list:", recentError);
      }

      // Force a refresh in the app state to ensure other screens pick up changes immediately
      await AsyncStorage.setItem(
        "reading_progress_updated",
        new Date().toISOString()
      );

      // Cập nhật theo user_id nếu có
      const userId = await AsyncStorage.getItem("user_id");
      if (userId) {
        await AsyncStorage.setItem(
          `reading_progress_updated_${userId}`,
          new Date().toISOString()
        );
      }
    } catch (error) {
      console.error("Error saving reading progress:", error);
    }
  };

  const handleLocalFile = async (filePath) => {
    console.log("Loading local PDF file:", filePath);

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error("Local PDF file not found");
    }

    console.log("File size:", fileInfo.size, "bytes");
    if (fileInfo.size === 0) {
      throw new Error("PDF file is empty");
    }

    setFileUri(filePath);

    // For local files, we need to get a content URI on Android for permissions
    let pdfPath = filePath;
    if (Platform.OS === "android") {
      try {
        // Get a content URI that can be used by the WebView
        pdfPath = await FileSystem.getContentUriAsync(filePath);
        console.log("Using content URI for Android:", pdfPath);
      } catch (err) {
        console.warn(
          "Could not get content URI, using file path directly:",
          err
        );
      }
    }

    // Based on selected view method
    if (viewMethod === "direct") {
      createDirectWebViewHTML(pdfPath);
    } else if (viewMethod === "base64") {
      await createBase64HTML(filePath);
    } else if (viewMethod === "pdfjs") {
      createPdfJsHTML(filePath);
    }

    // Get PDF info if available and we have pdfId
    if (pdfId) {
      await fetchPdfInfo();
    }

    setLoading(false);
  };

  const createDirectWebViewHTML = (path) => {
    console.log("Using direct WebView embedding for PDF:", path);
    // Handle file:// URLs properly
    const formattedPath = path.startsWith("file://")
      ? path
      : Platform.OS === "ios"
      ? path
      : `file://${path}`;

    // Use an optimized HTML setup with embedded PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: #f0f0f0;
            }
            .container {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              margin: 0;
              padding: 0;
            }
            #pdf-viewer {
              width: 100%;
              height: 100%;
              border: none;
              margin: 0;
              padding: 0;
              display: block;
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
            }
            #loading {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100%;
              width: 100%;
              position: absolute;
              top: 0;
              left: 0;
              background-color: rgba(240, 240, 240, 0.9);
              z-index: 10;
            }
            .spinner {
              border: 4px solid rgba(0, 0, 0, 0.1);
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border-left-color: #3b82f6;
              animation: spin 1s ease infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            #error-message {
              color: red;
              text-align: center;
              padding: 20px;
              display: none;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(255, 255, 255, 0.9);
              border-radius: 8px;
              z-index: 20;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div id="loading">
              <div class="spinner"></div>
            </div>
            <div id="error-message"></div>
            <object
              id="pdf-viewer"
              data="${formattedPath}"
              type="application/pdf"
              width="100%"
              height="100%">
                <p>It appears you don't have a PDF plugin for this browser. No worries, you can
                <a href="${formattedPath}">click here to download the PDF file.</a></p>
            </object>
          </div>
         
          <script>
            // Monitor PDF loading
            const viewer = document.getElementById('pdf-viewer');
            const loading = document.getElementById('loading');
            const errorMsg = document.getElementById('error-message');
           
            // Set timeout to detect if PDF fails to load - reduced from 8000 to 5000ms
            let loadTimeout = setTimeout(() => {
              loading.style.display = 'none';
              errorMsg.style.display = 'block';
              errorMsg.textContent = 'PDF failed to load. Please try another viewing method.';
              window.ReactNativeWebView.postMessage('PDF_LOAD_TIMEOUT');
            }, 5000);
           
            // Check if viewer loaded successfully
            viewer.onload = function() {
              loading.style.display = 'none';
              clearTimeout(loadTimeout);
              window.ReactNativeWebView.postMessage('PDF_LOADED');
            };
           
            viewer.onerror = function() {
              loading.style.display = 'none';
              errorMsg.style.display = 'block';
              errorMsg.textContent = 'Error loading PDF.';
              clearTimeout(loadTimeout);
              window.ReactNativeWebView.postMessage('PDF_LOAD_ERROR');
            };
          </script>
        </body>
      </html>
    `;
    setHtmlContent(html);
  };

  const createBase64HTML = async (path) => {
    try {
      console.log("Creating base64 HTML for PDF:", path);
      // Read the file as base64 encoded string
      const base64 = await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Generate HTML with embedded base64 data
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
              body, html {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background-color: #f0f0f0;
              }
              .container {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              #pdf-viewer {
                width: 100%;
                height: 100%;
                border: none;
              }
              #error-message {
                color: red;
                text-align: center;
                padding: 20px;
                display: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div id="error-message"></div>
              <object
                id="pdf-viewer"
                data="data:application/pdf;base64,${base64}"
                type="application/pdf"
                width="100%"
                height="100%">
                <p>Your browser doesn't support PDF embedding.</p>
              </object>
            </div>
           
            <script>
              const viewer = document.getElementById('pdf-viewer');
              const errorMsg = document.getElementById('error-message');
             
              // If base64 data is too large, notify React Native
              if ('${base64}'.length > 5000000) {
                window.ReactNativeWebView.postMessage('BASE64_LARGE');
              }
             
              viewer.onload = function() {
                window.ReactNativeWebView.postMessage('PDF_LOADED');
              };
             
              viewer.onerror = function() {
                errorMsg.style.display = 'block';
                errorMsg.textContent = 'Error loading PDF using base64.';
                window.ReactNativeWebView.postMessage('PDF_LOAD_ERROR');
              };
            </script>
          </body>
        </html>
      `;
      setHtmlContent(html);
    } catch (err) {
      console.error("Error creating base64 HTML:", err);
      throw new Error("Could not convert file to base64: " + err.message);
    }
  };

  const createPdfJsHTML = (path) => {
    console.log("Using PDF.js viewer for:", path);

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
            <p>Đang tải tài liệu...</p>
            <div class="loading-progress" id="loading-progress">Đang chuẩn bị tài liệu...</div>
          </div>
         
          <div id="progress-bar-container">
            <div id="progress-bar" style="width: ${readingProgress}%"></div>
          </div>
         
          <div id="pdf-container"></div>
         
          <div id="page-info" class="fade">Trang ${currentPage} / ${totalPages}</div>
          
          <div id="debug"></div>
          
          <div id="error-container">
            <h3>Lỗi khi tải PDF</h3>
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
             
              // Notify React Native when page changes
              window.ReactNativeWebView.postMessage('PAGE_CHANGE:' + currentPage + ':' + pdfDoc.numPages);
             
              // Clear the container completely before adding a new page
              while (container.firstChild) {
                container.removeChild(container.firstChild);
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

  const fetchPdfInfo = async () => {
    if (!pdfId) return;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setPdfInfo(data.data);
      }
    } catch (error) {
      console.error("Error fetching PDF info:", error);
    }
  };

  const downloadPdf = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/(auth)/LogIn");
        return;
      }

      // First get PDF info
      await fetchPdfInfo();

      // Create direct API URL for the PDF
      const directUrl = `${API_URL}/pdfs/${pdfId}/download`;

      // Check for local PDF file in document directory
      const fileName = `pdf_${pdfId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      setFileUri(fileUri);

      // For all view methods, download the file first for consistency
      console.log("Downloading PDF to local storage...");

      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (fileInfo.exists && fileInfo.size > 0) {
        console.log("Using existing downloaded file:", fileUri);

        if (viewMethod === "direct") {
          createDirectWebViewHTML(fileUri);
        } else if (viewMethod === "base64") {
          await createBase64HTML(fileUri);
        } else if (viewMethod === "pdfjs") {
          createPdfJsHTML(fileUri);
        }

        setLoading(false);
      } else {
        // Download the file
        console.log("Downloading file to:", fileUri);

        try {
          const downloadResumable = FileSystem.createDownloadResumable(
            directUrl,
            fileUri,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
            (downloadProgress) => {
              const progress =
                downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite;
              console.log(`PDF download progress: ${progress * 100}%`);
            }
          );

          const downloadResult = await downloadResumable.downloadAsync();

          if (downloadResult && downloadResult.uri) {
            console.log("Download successful:", downloadResult.uri);

            // Get content URI for Android
            let contentUri = downloadResult.uri;
            if (Platform.OS === "android") {
              try {
                contentUri = await FileSystem.getContentUriAsync(
                  downloadResult.uri
                );
                console.log("Content URI for Android:", contentUri);
              } catch (err) {
                console.warn(
                  "Could not get content URI, using file path directly:",
                  err
                );
              }
            }

            if (viewMethod === "direct") {
              createDirectWebViewHTML(contentUri);
            } else if (viewMethod === "base64") {
              await createBase64HTML(downloadResult.uri);
            } else if (viewMethod === "pdfjs") {
              createPdfJsHTML(contentUri);
            }

            setLoading(false);
          } else {
            throw new Error("Download completed but no file was returned");
          }
        } catch (downloadError) {
          console.error("Download error:", downloadError);
          throw new Error("Failed to download PDF: " + downloadError.message);
        }
      }
    } catch (error) {
      console.error("Error in PDF handling:", error);
      setError(`Failed to load PDF: ${error.message}`);
      setLoading(false);
    }
  };

  const sharePdf = async () => {
    try {
      if (!fileUri) {
        Alert.alert("Error", "No PDF file available to share");
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        console.log("Sharing file:", fileUri);
        await Sharing.shareAsync(fileUri, {
          UTI: "com.adobe.pdf",
          mimeType: "application/pdf",
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error sharing PDF:", error);
      Alert.alert("Error", `Could not share PDF: ${error.message}`);
    }
  };

  const openExternal = async () => {
    try {
      if (fileUri) {
        // First try to open with content URI (better for Android)
        if (Platform.OS === "android") {
          try {
            const contentUri = await FileSystem.getContentUriAsync(fileUri);
            console.log("Opening content URI in external app:", contentUri);

            const canOpen = await Linking.canOpenURL(contentUri);
            if (canOpen) {
              await Linking.openURL(contentUri);
              return;
            }
          } catch (err) {
            console.warn("Error getting content URI or opening file:", err);
            // Fall through to other methods
          }
        }

        // Next try sharing (works on both platforms)
        try {
          if (await Sharing.isAvailableAsync()) {
            console.log("Sharing file:", fileUri);
            await Sharing.shareAsync(fileUri, {
              UTI: "com.adobe.pdf",
              mimeType: "application/pdf",
            });
            return;
          }
        } catch (err) {
          console.warn("Error sharing file:", err);
        }

        // Finally try direct Linking (less reliable)
        try {
          console.log("Trying to open file directly:", fileUri);
          const canOpen = await Linking.canOpenURL(fileUri);
          if (canOpen) {
            await Linking.openURL(fileUri);
            return;
          }
        } catch (err) {
          console.warn("Error opening file with Linking:", err);
        }
      }

      // As a last resort, try to open the remote URL
      if (pdfId) {
        try {
          const token = await AsyncStorage.getItem("token");
          const url = `${API_URL}/pdfs/${pdfId}/download`;
          console.log("Opening remote URL in browser:", url);
          await Linking.openURL(url);
        } catch (err) {
          console.error("Error opening URL:", err);
          Alert.alert("Error", "Could not open PDF in external application");
        }
      }
    } catch (error) {
      console.error("Error in openExternal:", error);
      Alert.alert("Error", "Could not open PDF in external application");
    }
  };

  const changeViewMethod = () => {
    // Cycle through view methods, but in a different order to prioritize working methods
    if (viewMethod === "pdfjs") {
      setViewMethod("base64");
    } else if (viewMethod === "base64") {
      setViewMethod("direct");
    } else {
      setViewMethod("pdfjs");
    }
  };

  const showDebugInfo = () => {
    Alert.alert(
      "Thông tin PDF",
      `PDF ID: ${pdfId || "None"}\nTrang: ${currentPage}/${totalPages}\nTiến độ: ${readingProgress}%\nLocal path: ${
        localPath || "None"
      }\nFile URI: ${fileUri || "Không có"}`,
      [{ text: "OK" }]
    );
  };

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

  // Log khi chapter hiện tại thay đổi (để debug)
  useEffect(() => {
    if (currentChapter) {
      console.log(
        `Current chapter: ${currentChapter.title} (Page ${currentChapter.page})`
      );
    }
  }, [currentChapter]);

  const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    // console.log('WebView message:', message);

    if (message === "TOGGLE_MENU") {
      toggleBottomMenu();
    }

    if (
      message.includes("PDF_LOAD_ERROR") ||
      message.includes("PDF_LOAD_TIMEOUT") ||
      message.includes("PDF_ERROR")
    ) {
      console.warn(`PDF loading issue detected: ${message}`);
      setError("Không thể tải PDF. " + message);
    }

    // Track when PDF has fully loaded
    if (message === "PDF_LOADED") {
      console.log("PDF fully loaded");
      pdfLoadedRef.current = true;

      // If we have a saved page position, navigate to it
      if (currentPage > 1 && webViewRef.current) {
        console.log(`PDF loaded - navigating to saved page: ${currentPage}`);
        webViewRef.current.injectJavaScript(`
          queueRenderPage(${currentPage});
          true;
        `);
      }

      // Extract chapters after PDF is loaded
      if (!loadedChapters.current) {
        console.log("Scheduling chapters extraction...");
        setTimeout(() => {
          extractChapters();
        }, 1000);
      }
    }

    if (message === "REQUEST_PDF_DATA" && fileUri) {
      // WebView is requesting PDF data for PDF.js viewer
      // Read the file and send it back to the WebView
      (async () => {
        try {
          const base64Data = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Use webViewRef.current instead of this.webViewRef
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(
              `handlePdfData("${base64Data}"); true;`
            );
          }
        } catch (error) {
          console.error("Error reading PDF for WebView:", error);
          setError("Lỗi khi đọc file PDF: " + error.message);
        }
      })();
    }

    // Handle page change messages
    if (message.startsWith("PAGE_CHANGE:")) {
      const parts = message.split(":");
      if (parts.length === 3) {
        const page = parseInt(parts[1], 10);
        const total = parseInt(parts[2], 10);

        // Make sure the received page is valid
        if (!isNaN(page) && page > 0 && !isNaN(total) && total > 0) {
          console.log(`Received page change notification: ${page}/${total}`);

          // Only update if the values are different to avoid loops
          let shouldUpdate = false;

          if (page !== currentPage) {
            shouldUpdate = true;
            setCurrentPage(page);
          }

          if (total !== totalPages && total > 0) {
            shouldUpdate = true;
            setTotalPages(total);
          }

          // Immediately save progress when page changes from the viewer
          if (shouldUpdate) {
            console.log(
              "Saving reading progress after page change from viewer"
            );
            // Use setTimeout to ensure state updates have completed
            setTimeout(() => saveReadingProgress(), 100);
          }
        }
      }
    }

    // Handle total pages message
    if (message.startsWith("TOTAL_PAGES:")) {
      const total = parseInt(message.split(":")[1], 10);
      if (!isNaN(total) && total > 0 && total !== totalPages) {
        console.log(`Setting total pages to ${total}`);
        setTotalPages(total);
      }
    }

    // Xử lý thông tin chapters từ WebView
    if (message.startsWith("CHAPTERS_DATA:")) {
      try {
        const chaptersData = JSON.parse(message.replace("CHAPTERS_DATA:", ""));
        console.log(`Received ${chaptersData.length} chapters from PDF`);

        // Nếu không có chapters, tạo chapters tự động
        if (chaptersData.length === 0) {
          const autoChapters = [];
          for (let i = 1; i <= totalPages; i += 10) {
            autoChapters.push({
              id: i,
              title: `Trang ${i}`,
              page: i,
            });
          }
          setChapters(autoChapters);
        } else {
          setChapters(chaptersData);
        }

        loadedChapters.current = true;
      } catch (error) {
        console.error("Error parsing chapters data:", error);
      }
    } else if (message.startsWith("CHAPTERS_ERROR:")) {
      // console.error('Error extracting chapters:', message.replace('CHAPTERS_ERROR:', ''));
      // Nếu không thể trích xuất chapters, tạo chapters tự động dựa trên số trang
      if (totalPages > 0) {
        const autoChapters = [];
        for (let i = 1; i <= totalPages; i += 10) {
          autoChapters.push({
            id: i,
            title: `Trang ${i}`,
            page: i,
          });
        }
        setChapters(autoChapters);
      }
    }

    // Xử lý thông tin debug
    if (message.startsWith("DEBUG:")) {
      console.log("WebView Debug:", message.substring(6));
      return;
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
  };

  // Handlers to control PDF.js viewer via WebView injection
  const handleZoomIn = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`onZoomIn(); true;`);
    }
  };

  const handleZoomOut = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`onZoomOut(); true;`);
    }
  };

  const handleFitWidth = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`onFitWidth(); true;`);
    }
  };

  // Function to toggle the bottom menu
  const toggleBottomMenu = () => {
    setBottomMenuVisible((prev) => !prev);
    // Also show/hide top controls when toggling bottom menu
    setControlsVisible((prev) => !prev);
  };

  // Add specific functions for page navigation
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      
      // Make sure to directly tell the WebView to change page too
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (typeof queueRenderPage === 'function') {
            queueRenderPage(${nextPage});
          }
          true;
        `);
      }
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1; 
      setCurrentPage(prevPage);
      
      // Make sure to directly tell the WebView to change page too
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (typeof queueRenderPage === 'function') {
            queueRenderPage(${prevPage});
          }
          true;
        `);
      }
    }
  };

  const extractChapters = async () => {
    if (!webViewRef.current) return;

    console.log("Extracting PDF chapters...");
    loadedChapters.current = false;

    webViewRef.current.injectJavaScript(`
      (async function() {
        try {
          if (!pdfDoc) {
            window.ReactNativeWebView.postMessage('CHAPTERS_ERROR:PDF not loaded');
            return;
          }

          const outline = await pdfDoc.getOutline();
          if (!outline || outline.length === 0) {
            window.ReactNativeWebView.postMessage('CHAPTERS_ERROR:No outline found');
            // Nếu không có outline, tạo chapters tự động theo số trang
            const autoChapters = [];
            const totalPages = pdfDoc.numPages;
            
            // Tạo chapters mỗi 10 trang
            const chapterInterval = Math.min(10, Math.ceil(totalPages / 10));
            for (let i = 1; i <= totalPages; i += chapterInterval) {
              autoChapters.push({
                id: autoChapters.length + 1,
                title: 'Trang ' + i,
                page: i
              });
            }
            
            if (autoChapters.length > 0) {
              window.ReactNativeWebView.postMessage('CHAPTERS_DATA:' + JSON.stringify(autoChapters));
            }
            return;
          }

          const chapters = [];
          let id = 1;

          async function processOutline(items) {
            for (const item of items) {
              if (item.dest) {
                try {
                  const ref = item.dest[0];
                  const page = await pdfDoc.getPageIndex(ref);
                  chapters.push({
                    id: id++,
                    title: item.title || 'Chương ' + id,
                    page: page + 1
                  });
                } catch (e) {
                  console.error('Error processing outline item:', e);
                }
              }
              if (item.items && item.items.length > 0) {
                await processOutline(item.items);
              }
            }
          }

          await processOutline(outline);
          
          // Sắp xếp chapters theo số trang
          chapters.sort((a, b) => a.page - b.page);
          
          window.ReactNativeWebView.postMessage('CHAPTERS_DATA:' + JSON.stringify(chapters));
        } catch (error) {
          // console.error('Error extracting chapters:', error);
          window.ReactNativeWebView.postMessage('CHAPTERS_ERROR:' + error.message);
        }
      })();
      true;
    `);
  };

  // Cập nhật useEffect để đảm bảo chapters được extract sau khi PDF load xong
  useEffect(() => {
    if (pdfLoadedRef.current && !loadedChapters.current) {
      console.log("PDF loaded, extracting chapters...");
      loadedChapters.current = true;
      // Đợi 1 giây để đảm bảo PDF đã hoàn tất khởi tạo
      setTimeout(() => {
        extractChapters();
      }, 1000);
    }
  }, [pdfLoadedRef.current]);

  return (
    <View style={styles.container}>
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
          {pdfInfo?.title || "Trình xem PDF"}
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
          <Text style={styles.loadingText}>Đang tải PDF...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#ff0000" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={sharePdf}>
            <Text style={styles.shareButtonText}>Chia sẻ PDF</Text>
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
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error("WebView HTTP error:", nativeEvent);
              setError(
                `HTTP error ${nativeEvent.statusCode}: ${
                  nativeEvent.description || "Unknown error"
                }`
              );
            }}
            scalesPageToFit={Platform.OS === "android"}
            decelerationRate={0.998}
            onContentSizeChange={() => console.log("Content size changed")}
          />

          {/* Reading progress indicator */}
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${readingProgress}%` }]}
            />
            {savedProgressPercentage !== null && (
              <View
                style={[
                  styles.savedProgressMarker,
                  { left: `${savedProgressPercentage}%` },
                ]}
              />
            )}
          </View>

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
            
            {/* Loại bỏ highlighter button */}
          </View>
        </View>
      )}

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
    transition: "transform 0.3s ease",
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
  zoomControls: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  zoomButton: {
    marginHorizontal: 4,
    padding: 4,
  },
  zoomText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  debugButton: {
    padding: 8,
  },
  webViewContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#f0f0f0",
    marginTop: Platform.OS === "ios" ? 88 : 56, // Add margin to push content below header
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    height: "100%",
  },
  webView: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    marginTop: 0,
    marginBottom: 0,
    height: "100%",
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
  shareButton: {
    marginTop: 12,
    backgroundColor: "#4caf50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
  },
  shareButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  progressBarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#e5e7eb", // gray-200
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3b82f6", // blue-500
  },
  savedProgressMarker: {
    position: "absolute",
    top: 0,
    height: "100%",
    width: 2,
    backgroundColor: "#facc15", // yellow-400
  },
  // New styles for bottom menu
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
    transition: "transform 0.3s ease",
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
  menuButton: {
    marginLeft: 16,
  },
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
