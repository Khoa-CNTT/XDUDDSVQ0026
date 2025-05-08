import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform, Linking, Alert, Share, Dimensions, PixelRatio, FlatList, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { savePdfReadingProgress } from './services/pdfService';


export default function PdfViewer() {
  const { pdfId, localPath, initialPage } = useLocalSearchParams();
  const router = useRouter();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState(null);
  const [fileUri, setFileUri] = useState(null);
  const [error, setError] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [viewMethod, setViewMethod] = useState('pdfjs'); // Changed default to 'pdfjs' since it's working
  const [currentPage, setCurrentPage] = useState(initialPage ? parseInt(initialPage, 10) : 1);
  const [totalPages, setTotalPages] = useState(1);
  const [readingProgress, setReadingProgress] = useState(0);
  const [savedProgressPercentage, setSavedProgressPercentage] = useState(null); // Store the saved progress percentage
  const [controlsVisible, setControlsVisible] = useState(true); // Track if controls are visible
  const [bottomMenuVisible, setBottomMenuVisible] = useState(true); // Track if bottom menu is visible
  const [isHighlighterActive, setIsHighlighterActive] = useState(false); // Track if highlighter is active
  const [showMenu, setShowMenu] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [activeTab, setActiveTab] = useState('chapters');

  // Get screen dimensions for better PDF scaling
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const pixelRatio = PixelRatio.get(); // Get device pixel ratio for better resolution

  // Reference to track if the PDF has loaded
  const pdfLoadedRef = useRef(false);
  const loadedChapters = useRef(false);


  useEffect(() => {
    console.log(`PdfViewer initialized with pdfId: ${pdfId}, initialPage: ${initialPage || 1}`);
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
          throw new Error('No PDF specified');
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err.message || 'Failed to load PDF');
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
     
      console.log(`Progress updated: ${progress}% (Page ${currentPage}/${totalPages})`);
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
         
          console.log(`Loaded reading progress from local storage: page ${page}/${total}`);
         
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
          console.error('Error parsing saved progress:', parseError);
          // Reset to defaults if parsing fails
          setCurrentPage(1);
          setTotalPages(1);
          setReadingProgress(0);
          setSavedProgressPercentage(null);
        }
      }
    } catch (error) {
      console.error('Error loading reading progress:', error);
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
        timestamp: new Date().toISOString()
      });
     
      await AsyncStorage.setItem(key, progressData);
      console.log(`Saved reading progress locally: page ${currentPage}/${totalPages} (${progressPercentage}%)`);
     
      // Update the saved percentage
      setSavedProgressPercentage(progressPercentage);
      
      // Gọi API để lưu lên server
      try {
        const response = await savePdfReadingProgress(pdfId, currentPage, totalPages);
        if (response.success) {
          console.log(`📄 Đã lưu tiến độ đọc PDF lên server thành công: ${progressPercentage}%`);
        } else {
          console.warn(`📄 Không thể lưu tiến độ đọc PDF lên server: ${response.message || 'Lỗi không xác định'}`);
        }
      } catch (apiError) {
        console.error('📄 Lỗi khi lưu tiến độ đọc lên server:', apiError);
        // Tiếp tục sử dụng local storage nếu API lỗi
      }
      
      // Update recently viewed documents list to improve sync between screens
      try {
        // Lấy user_id để lưu riêng cho từng người dùng
        const userId = await AsyncStorage.getItem('user_id');
        
        if (userId) {
          const recentlyViewedKey = `recently_viewed_docs_${userId}`;
          let recentlyViewed = [];
          const recentlyViewedJson = await AsyncStorage.getItem(recentlyViewedKey);
          
          if (recentlyViewedJson) {
            recentlyViewed = JSON.parse(recentlyViewedJson);
          }
          
          // Add current PDF to the top if not already there, or move to top if exists
          const pdfIdStr = pdfId.toString();
          recentlyViewed = recentlyViewed.filter(id => id !== pdfIdStr);
          recentlyViewed.unshift(pdfIdStr);
          
          // Keep only the most recent 10 items
          if (recentlyViewed.length > 10) {
            recentlyViewed = recentlyViewed.slice(0, 10);
          }
          
          await AsyncStorage.setItem(recentlyViewedKey, JSON.stringify(recentlyViewed));
          console.log(`📄 Đã cập nhật danh sách PDF đã xem cho người dùng ${userId}`);
        } else {
          console.warn('📄 Không thể cập nhật danh sách PDF đã xem: không tìm thấy user_id');
        }
      } catch (recentError) {
        console.error('Error updating recently viewed list:', recentError);
      }
      
      // Force a refresh in the app state to ensure other screens pick up changes immediately
      await AsyncStorage.setItem('reading_progress_updated', new Date().toISOString());
      
      // Cập nhật theo user_id nếu có
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) {
        await AsyncStorage.setItem(`reading_progress_updated_${userId}`, new Date().toISOString());
      }
     
    } catch (error) {
      console.error('Error saving reading progress:', error);
    }
  };


  const handleLocalFile = async (filePath) => {
    console.log('Loading local PDF file:', filePath);
   
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('Local PDF file not found');
    }
   
    console.log('File size:', fileInfo.size, 'bytes');
    if (fileInfo.size === 0) {
      throw new Error('PDF file is empty');
    }
   
    setFileUri(filePath);
   
    // For local files, we need to get a content URI on Android for permissions
    let pdfPath = filePath;
    if (Platform.OS === 'android') {
      try {
        // Get a content URI that can be used by the WebView
        pdfPath = await FileSystem.getContentUriAsync(filePath);
        console.log('Using content URI for Android:', pdfPath);
      } catch (err) {
        console.warn('Could not get content URI, using file path directly:', err);
      }
    }
   
    // Based on selected view method
    if (viewMethod === 'direct') {
      createDirectWebViewHTML(pdfPath);
    } else if (viewMethod === 'base64') {
      await createBase64HTML(filePath);
    } else if (viewMethod === 'pdfjs') {
      createPdfJsHTML(filePath);
    }
   
    // Get PDF info if available and we have pdfId
    if (pdfId) {
      await fetchPdfInfo();
    }
   
    setLoading(false);
  };


  const createDirectWebViewHTML = (path) => {
    console.log('Using direct WebView embedding for PDF:', path);
    // Handle file:// URLs properly
    const formattedPath = path.startsWith('file://')
      ? path
      : (Platform.OS === 'ios' ? path : `file://${path}`);
   
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
      console.error('Error creating base64 HTML:', err);
      throw new Error('Could not convert file to base64: ' + err.message);
    }
  };


  const createPdfJsHTML = (path) => {
    console.log("Using PDF.js viewer for:", path);
   
    // Always use the embedded PDF.js approach instead of the remote viewer URL
    // This approach works reliably on all devices
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=${1/pixelRatio}, maximum-scale=5.0, user-scalable=yes">
          <!-- Preload PDF.js resources to improve loading time -->
          <link rel="preload" href="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js" as="script">
          <link rel="preload" href="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js" as="script">
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
              will-change: transform;
              width: 100%;
              height: 100%;
              overflow: auto;
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              -webkit-overflow-scrolling: touch;
              padding-top: ${Platform.OS === 'android' ? 56 : 60}px; /* Adjusted for Android */
              box-sizing: border-box;
            }
            .page-canvas {
              display: block;
              border: none;
              background: white;
              will-change: transform;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
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
            /* Add loading text */
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
            /* Highlighter styles */
            .highlighter-enabled {
              cursor: crosshair;
            }
            .highlight-layer {
              position: absolute;
              pointer-events: none;
              z-index: 2;
            }
            .highlight {
              position: absolute;
              background-color: rgba(255, 255, 0, 0.3);
              border-radius: 2px;
              pointer-events: none;
            }
            /* Zoom indicator */
            #zoom-indicator {
              position: fixed;
              bottom: 50px;
              right: 20px;
              background-color: rgba(0,0,0,0.5);
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              z-index: 100;
              opacity: 0;
              transition: opacity 0.3s;
            }
            #zoom-indicator.visible {
              opacity: 0.7;
            }
          </style>
        </head>
        <body>
          <div id="loading">
            <div class="spinner"></div>
            <p>Loading PDF...</p>
            <div class="loading-progress" id="loading-progress">Preparing document...</div>
          </div>
         
          <div id="progress-bar-container">
            <div id="progress-bar" style="width: ${readingProgress}%"></div>
          </div>
         
          <div id="pdf-container"></div>
         
          <div id="page-info" class="fade">Page ${currentPage} of 1</div>
          
          <div id="zoom-indicator">Zoom: 100%</div>
         
          <script>
            // Configure PDF.js worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
           
            // Variables for PDF rendering
            let pdfDoc = null;
            let currentPage = ${currentPage};
            let scale = 2.0; // Increased scale for better visibility
            let pageRendering = false;
            let pageNumPending = null;
            const container = document.getElementById('pdf-container');
            const loading = document.getElementById('loading');
            const loadingProgress = document.getElementById('loading-progress');
            const pageInfo = document.getElementById('page-info');
            const progressBar = document.getElementById('progress-bar');
            const zoomIndicator = document.getElementById('zoom-indicator');
            
            // Detect Android for platform specific adjustments
            const isAndroid = ${Platform.OS === 'android' ? 'true' : 'false'};
           
            // Calculate initial scale to fit width of phone screen with pixel ratio
            const screenWidth = ${screenWidth};
            const screenHeight = ${screenHeight};
            const pixelRatio = ${pixelRatio};
            
            // Adjust scale to make PDF fit full width with better defaults for Android
            const initialScale = isAndroid 
              ? Math.max(1.5, (screenWidth / 600)) 
              : Math.max(1.5, (screenWidth / 612));
            scale = initialScale;
           
            // Variables for touch handling
            let touchStartX = 0;
            let touchEndX = 0;
            let touchStartY = 0;
            let touchEndY = 0;
            let lastTap = 0;
            let tappedTwice = false;
            
            // Flag to track if we're zoomed in (to disable page swiping)
            let isZoomedIn = false;
            
            // Improved swipe detection with threshold
            const SWIPE_THRESHOLD = 50;
           
            // Variables for highlighting
            let isHighlighterEnabled = false;
            let isHighlighting = false;
            let highlightStartX = 0;
            let highlightStartY = 0;
            let highlightLayer = null;
            let highlights = [];
           
            // Auto-hide page info after delay
            let pageInfoTimeout;
            function showPageInfo() {
              pageInfo.classList.remove('fade');
              clearTimeout(pageInfoTimeout);
              pageInfoTimeout = setTimeout(() => {
                pageInfo.classList.add('fade');
              }, 2000);
            }

            // Function to show zoom level
            function showZoomLevel() {
              const percentage = Math.round((scale / initialScale) * 100);
              zoomIndicator.textContent = 'Zoom: ' + percentage + '%';
              zoomIndicator.classList.add('visible');
              
              // Check if zoomed in to disable page swiping
              isZoomedIn = scale > initialScale * 1.05; // Allow a small buffer for rounding errors
              
              // Show zoom indicator for 2 seconds
              clearTimeout(zoomIndicatorTimeout);
              zoomIndicatorTimeout = setTimeout(() => {
                zoomIndicator.classList.remove('visible');
              }, 2000);
            }
            let zoomIndicatorTimeout;

            // Function to store the current viewer state
            function logState() {
              console.log('Current state: Page ' + currentPage + ' of ' + (pdfDoc ? pdfDoc.numPages : 'unknown') + ' at scale ' + scale);
            }
           
            // Optimized rendering function
            function renderPage(num) {
              if (!pdfDoc) return;
             
              if (num < 1) num = 1;
              if (num > pdfDoc.numPages) num = pdfDoc.numPages;
             
              pageRendering = true;
              pageInfo.textContent = 'Page ' + num + ' of ' + pdfDoc.numPages;
              showPageInfo();
             
              currentPage = num;
             
              const progress = Math.floor((currentPage / pdfDoc.numPages) * 100);
              progressBar.style.width = progress + '%';
             
              // Always notify React Native when page changes
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
                  // Calculate viewport to fit width perfectly (especially for Android)
                  const pageWidth = page.getViewport({ scale: 1.0 }).width;
                  const containerWidth = container.clientWidth;
                  
                  // Get the best scale to fit the page width to container
                  const optimalScale = containerWidth / pageWidth;
                  
                  // For Android, we want to make sure the page fills the width completely
                  const finalScale = isAndroid ? Math.max(scale, optimalScale) : scale;
                  
                  const viewport = page.getViewport({ scale: finalScale });
                  
                  const canvas = document.createElement('canvas');
                  canvas.className = 'page-canvas';
                  canvas.style.opacity = '0';
                 
                  // Set canvas dimensions with pixel ratio for higher resolution
                  const outputScale = pixelRatio;
                  canvas.width = Math.floor(viewport.width * outputScale);
                  canvas.height = Math.floor(viewport.height * outputScale);
                 
                  // Set canvas style width to 100% of container for Android
                  canvas.style.width = '100%';
                  canvas.style.maxWidth = 'none';
                 
                  container.appendChild(canvas);
                 
                  // Create/recreate highlight layer
                  const oldHighlightLayer = container.querySelector('.highlight-layer');
                  if (oldHighlightLayer) {
                    container.removeChild(oldHighlightLayer);
                  }
                 
                  highlightLayer = document.createElement('div');
                  highlightLayer.className = 'highlight-layer';
                  highlightLayer.style.width = viewport.width + 'px';
                  highlightLayer.style.height = viewport.height + 'px';
                  highlightLayer.style.position = 'absolute';
                  highlightLayer.style.left = canvas.offsetLeft + 'px';
                  highlightLayer.style.top = canvas.offsetTop + 'px';
                  container.appendChild(highlightLayer);
                 
                  // Restore highlights for this page
                  renderHighlights(num);
                 
                  const ctx = canvas.getContext('2d');
                  ctx.scale(outputScale, outputScale);
                 
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
           
            // Improved touch navigation setup with better double-tap detection
            function handleTouchStart(evt) {
              // Skip if highlighter is enabled
              if (isHighlighterEnabled) {
                if (!isHighlighting) {
                  isHighlighting = true;
                  const touch = evt.touches[0];
                  highlightStartX = touch.clientX - container.getBoundingClientRect().left;
                  highlightStartY = touch.clientY - container.getBoundingClientRect().top + container.scrollTop;
                }
                return;
              }
             
              touchStartX = evt.changedTouches[0].screenX;
              touchStartY = evt.changedTouches[0].screenY;
             
              // Improved double-tap detection
              const currentTime = new Date().getTime();
              const tapLength = currentTime - lastTap;
              
              if (tapLength < 300 && tapLength > 0) {
                tappedTwice = true;
                // Handle double tap - toggle zoom
                evt.preventDefault();
                
                // Toggle between fit width and higher zoom
                if (scale > initialScale) {
                  scale = initialScale;
                } else {
                  // On Android use a higher zoom level for better readability
                  scale = isAndroid ? initialScale * 2.5 : initialScale * 2.0;
                }
                
                // Update zoom indicator and render page
                showZoomLevel();
                queueRenderPage(currentPage);
              } else {
                tappedTwice = false;
                setTimeout(() => {
                  if (!tappedTwice) {
                    // This was a single tap and will be handled in touchend
                    // for menu toggling if no swipe is detected
                  }
                }, 300);
              }
              lastTap = currentTime;
            }
           
            function handleTouchMove(evt) {
              if (isHighlighterEnabled && isHighlighting) {
                const touch = evt.touches[0];
                const currentX = touch.clientX - container.getBoundingClientRect().left;
                const currentY = touch.clientY - container.getBoundingClientRect().top + container.scrollTop;
               
                // Remove previous temporary highlight
                const tempHighlight = highlightLayer.querySelector('.temp-highlight');
                if (tempHighlight) {
                  highlightLayer.removeChild(tempHighlight);
                }
               
                // Create new temporary highlight
                const highlight = document.createElement('div');
                highlight.className = 'highlight temp-highlight';
               
                // Calculate position and dimensions
                const left = Math.min(highlightStartX, currentX);
                const top = Math.min(highlightStartY, currentY);
                const width = Math.abs(currentX - highlightStartX);
                const height = Math.abs(currentY - highlightStartY);
               
                highlight.style.left = left + 'px';
                highlight.style.top = top + 'px';
                highlight.style.width = width + 'px';
                highlight.style.height = height + 'px';
               
                highlightLayer.appendChild(highlight);
              }
            }
           
            function handleTouchEnd(evt) {
              touchEndX = evt.changedTouches[0].screenX;
              touchEndY = evt.changedTouches[0].screenY;
             
              // If highlighting, complete the highlight
              if (isHighlighterEnabled && isHighlighting) {
                const touch = evt.changedTouches[0];
                const currentX = touch.clientX - container.getBoundingClientRect().left;
                const currentY = touch.clientY - container.getBoundingClientRect().top + container.scrollTop;
               
                // Only create highlight if it has some size
                const width = Math.abs(currentX - highlightStartX);
                const height = Math.abs(currentY - highlightStartY);
               
                if (width > 5 && height > 5) {
                  // Remove temporary highlight
                  const tempHighlight = highlightLayer.querySelector('.temp-highlight');
                  if (tempHighlight) {
                    highlightLayer.removeChild(tempHighlight);
                  }
                 
                  // Create permanent highlight
                  const left = Math.min(highlightStartX, currentX);
                  const top = Math.min(highlightStartY, currentY);
                 
                  const highlight = document.createElement('div');
                  highlight.className = 'highlight';
                  highlight.style.left = left + 'px';
                  highlight.style.top = top + 'px';
                  highlight.style.width = width + 'px';
                  highlight.style.height = height + 'px';
                 
                  highlightLayer.appendChild(highlight);
                 
                  // Store highlight data
                  highlights.push({
                    page: currentPage,
                    left: left,
                    top: top,
                    width: width,
                    height: height
                  });
                 
                  // Save highlights
                  saveHighlights();
                }
               
                isHighlighting = false;
                return;
              }
             
              // Calculate distance moved
              const deltaX = Math.abs(touchEndX - touchStartX);
              const deltaY = Math.abs(touchEndY - touchStartY);
             
              // Only handle swipe if not zoomed in
              if (!isZoomedIn) {
                // If it's a swipe (significant horizontal movement and not too much vertical movement)
                if (deltaX > SWIPE_THRESHOLD && deltaY < 75) {
                  // This was a swipe - handle page navigation
                  handleSwipe();
                }
              }
              
              // If it's a tap (very little movement in any direction)
              if (deltaX < 10 && deltaY < 10 && !tappedTwice) {
                // Toggle menu on tap
                window.ReactNativeWebView.postMessage('TOGGLE_MENU');
              }
            }
           
            function handleSwipe() {
              // Only process swipes for navigation if we're not zoomed in
              if (isZoomedIn) return;
              
              if (touchEndX < touchStartX - SWIPE_THRESHOLD) {
                // Swipe left - go to next page
                if (goToNextPage()) {
                  // Prevent other tap events if page navigated
                  tappedTwice = true;
                  setTimeout(() => { tappedTwice = false; }, 100);
                }
              }
              if (touchEndX > touchStartX + SWIPE_THRESHOLD) {
                // Swipe right - go to previous page
                if (goToPrevPage()) {
                  // Prevent other tap events if page navigated
                  tappedTwice = true;
                  setTimeout(() => { tappedTwice = false; }, 100);
                }
              }
            }
           
            // Highlighter functions
            function toggleHighlighter(enabled) {
              isHighlighterEnabled = enabled;
              if (enabled) {
                container.classList.add('highlighter-enabled');
              } else {
                container.classList.remove('highlighter-enabled');
                isHighlighting = false;
              }
            }
           
            function saveHighlights() {
              const highlightsData = JSON.stringify(highlights);
              localStorage.setItem('pdf_highlights_' + document.location.href, highlightsData);
            }
           
            function loadHighlights() {
              try {
                const highlightsData = localStorage.getItem('pdf_highlights_' + document.location.href);
                if (highlightsData) {
                  highlights = JSON.parse(highlightsData);
                  renderHighlights(currentPage);
                }
              } catch (e) {
                console.error('Error loading highlights:', e);
              }
            }
           
            function renderHighlights(pageNum) {
              if (!highlightLayer) return;
             
              // Clear existing highlights
              highlightLayer.innerHTML = '';
             
              // Add highlights for current page
              highlights.filter(h => h.page === pageNum).forEach(h => {
                const highlight = document.createElement('div');
                highlight.className = 'highlight';
                highlight.style.left = h.left + 'px';
                highlight.style.top = h.top + 'px';
                highlight.style.width = h.width + 'px';
                highlight.style.height = h.height + 'px';
                highlightLayer.appendChild(highlight);
              });
            }
           
            // Add touch event listeners
            document.addEventListener('touchstart', handleTouchStart, false);
            document.addEventListener('touchmove', handleTouchMove, false);
            document.addEventListener('touchend', handleTouchEnd, false);
           
            // Handle window resize to make sure PDF fits the screen properly
            window.addEventListener('resize', function() {
              if (pdfDoc && !pageRendering) {
                // Re-render the current page to adjust to new screen size
                queueRenderPage(currentPage);
              }
            });
           
            // Optimized PDF loading
            async function renderPDF() {
              try {
                setTimeout(() => {
                  window.ReactNativeWebView.postMessage('REQUEST_PDF_DATA');
                }, 100);
               
                window.handlePdfData = async function(base64Data) {
                  try {
                    loadingProgress.textContent = 'Preparing document...';
                   
                    setTimeout(async () => {
                      try {
                        const binaryString = window.atob(base64Data);
                        const bytes = new Uint8Array(binaryString.length);
                       
                        const chunkSize = 10000;
                        for (let i = 0; i < binaryString.length; i += chunkSize) {
                          const chunk = Math.min(chunkSize, binaryString.length - i);
                          for (let j = 0; j < chunk; j++) {
                            bytes[i + j] = binaryString.charCodeAt(i + j);
                          }
                         
                          if (i + chunk < binaryString.length) {
                            const progress = Math.floor((i / binaryString.length) * 100);
                            loadingProgress.textContent = 'Processing PDF... ' + progress + '%';
                            await new Promise(resolve => setTimeout(resolve, 0));
                          }
                        }
                       
                        loadingProgress.textContent = 'Loading document...';
                       
                        const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
                        pdfDoc = await loadingTask.promise;
                       
                        window.ReactNativeWebView.postMessage('TOTAL_PAGES:' + pdfDoc.numPages);
                       
                        if (currentPage > pdfDoc.numPages) {
                          currentPage = 1;
                        }
                       
                        loading.style.display = 'none';
                       
                        console.log('Opening PDF at page ' + currentPage);
                        renderPage(currentPage);
                        loadHighlights();
                       
                        window.ReactNativeWebView.postMessage('PDF_LOADED');
                        
                        // Special handling for Android - force initial render to fit width properly
                        if (isAndroid) {
                          setTimeout(() => {
                            const containerWidth = container.clientWidth;
                            const canvas = container.querySelector('.page-canvas');
                            if (canvas) {
                              // Make sure the canvas width is optimal
                              canvas.style.width = '100%';
                            }
                          }, 500);
                        }
                      } catch (error) {
                        console.error('Error rendering PDF:', error);
                        window.ReactNativeWebView.postMessage('PDF_ERROR: ' + error.message);
                        loading.style.display = 'none';
                      }
                    }, 0);
                  } catch (error) {
                    console.error('Error processing PDF data:', error);
                    window.ReactNativeWebView.postMessage('PDF_ERROR: ' + error.message);
                    loading.style.display = 'none';
                  }
                };
              } catch (error) {
                console.error('Initial PDF loading error:', error);
                window.ReactNativeWebView.postMessage('PDF_ERROR: ' + error.message);
                loading.style.display = 'none';
              }
            }
           
            // Start rendering when page loads
            renderPDF();
          </script>
        </body>
      </html>
    `;
    setHtmlContent(html);
  };


  const fetchPdfInfo = async () => {
    if (!pdfId) return;
   
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
     
      const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
     
      const data = await response.json();
      if (data.success) {
        setPdfInfo(data.data);
      }
    } catch (error) {
      console.error('Error fetching PDF info:', error);
    }
  };


  const downloadPdf = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/(auth)/LogIn');
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
      console.log('Downloading PDF to local storage...');
     
      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
     
      if (fileInfo.exists && fileInfo.size > 0) {
        console.log('Using existing downloaded file:', fileUri);
       
        if (viewMethod === 'direct') {
          createDirectWebViewHTML(fileUri);
        } else if (viewMethod === 'base64') {
          await createBase64HTML(fileUri);
        } else if (viewMethod === 'pdfjs') {
          createPdfJsHTML(fileUri);
        }
       
        setLoading(false);
      } else {
        // Download the file
        console.log('Downloading file to:', fileUri);
       
        try {
          const downloadResumable = FileSystem.createDownloadResumable(
            directUrl,
            fileUri,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            },
            (downloadProgress) => {
              const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
              console.log(`PDF download progress: ${progress * 100}%`);
            }
          );
         
          const downloadResult = await downloadResumable.downloadAsync();
         
          if (downloadResult && downloadResult.uri) {
            console.log('Download successful:', downloadResult.uri);
           
            // Get content URI for Android
            let contentUri = downloadResult.uri;
            if (Platform.OS === 'android') {
              try {
                contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);
                console.log('Content URI for Android:', contentUri);
              } catch (err) {
                console.warn('Could not get content URI, using file path directly:', err);
              }
            }
           
            if (viewMethod === 'direct') {
              createDirectWebViewHTML(contentUri);
            } else if (viewMethod === 'base64') {
              await createBase64HTML(downloadResult.uri);
            } else if (viewMethod === 'pdfjs') {
              createPdfJsHTML(contentUri);
            }
           
            setLoading(false);
          } else {
            throw new Error('Download completed but no file was returned');
          }
        } catch (downloadError) {
          console.error('Download error:', downloadError);
          throw new Error('Failed to download PDF: ' + downloadError.message);
        }
      }
    } catch (error) {
      console.error('Error in PDF handling:', error);
      setError(`Failed to load PDF: ${error.message}`);
      setLoading(false);
    }
  };


  const sharePdf = async () => {
    try {
      if (!fileUri) {
        Alert.alert('Error', 'No PDF file available to share');
        return;
      }
     
      if (await Sharing.isAvailableAsync()) {
        console.log('Sharing file:', fileUri);
        await Sharing.shareAsync(fileUri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', `Could not share PDF: ${error.message}`);
    }
  };


  const openExternal = async () => {
    try {
      if (fileUri) {
        // First try to open with content URI (better for Android)
        if (Platform.OS === 'android') {
          try {
            const contentUri = await FileSystem.getContentUriAsync(fileUri);
            console.log('Opening content URI in external app:', contentUri);
           
            const canOpen = await Linking.canOpenURL(contentUri);
            if (canOpen) {
              await Linking.openURL(contentUri);
              return;
            }
          } catch (err) {
            console.warn('Error getting content URI or opening file:', err);
            // Fall through to other methods
          }
        }
       
        // Next try sharing (works on both platforms)
        try {
          if (await Sharing.isAvailableAsync()) {
            console.log('Sharing file:', fileUri);
            await Sharing.shareAsync(fileUri, {
              UTI: 'com.adobe.pdf',
              mimeType: 'application/pdf'
            });
            return;
          }
        } catch (err) {
          console.warn('Error sharing file:', err);
        }
       
        // Finally try direct Linking (less reliable)
        try {
          console.log('Trying to open file directly:', fileUri);
          const canOpen = await Linking.canOpenURL(fileUri);
          if (canOpen) {
            await Linking.openURL(fileUri);
            return;
          }
        } catch (err) {
          console.warn('Error opening file with Linking:', err);
        }
      }
     
      // As a last resort, try to open the remote URL
      if (pdfId) {
        try {
          const token = await AsyncStorage.getItem('token');
          const url = `${API_URL}/pdfs/${pdfId}/download`;
          console.log('Opening remote URL in browser:', url);
          await Linking.openURL(url);
        } catch (err) {
          console.error('Error opening URL:', err);
          Alert.alert('Error', 'Could not open PDF in external application');
        }
      }
    } catch (error) {
      console.error('Error in openExternal:', error);
      Alert.alert('Error', 'Could not open PDF in external application');
    }
  };


  const changeViewMethod = () => {
    // Cycle through view methods, but in a different order to prioritize working methods
    if (viewMethod === 'pdfjs') {
      setViewMethod('base64');
    } else if (viewMethod === 'base64') {
      setViewMethod('direct');
    } else {
      setViewMethod('pdfjs');
    }
  };
 
  const showDebugInfo = () => {
    Alert.alert(
      'Debug Info',
      `View method: ${viewMethod}\nFile URI: ${fileUri || 'None'}\nPDF ID: ${pdfId || 'None'}\nLocal path: ${localPath || 'None'}\nReading progress: ${readingProgress}%\nPage: ${currentPage}/${totalPages}`,
      [{ text: 'OK' }]
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
      console.log(`Current chapter: ${currentChapter.title} (Page ${currentChapter.page})`);
    }
  }, [currentChapter]);
 
  const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    // console.log('WebView message:', message);
   
    if (message === 'TOGGLE_MENU') {
      toggleBottomMenu();
    }
   
    if (message.includes('PDF_LOAD_ERROR') || message.includes('PDF_LOAD_TIMEOUT')) {
      console.warn(`PDF loading issue detected: ${message}`);
      setError('Failed to load PDF. ' + message);
    }
    
    // Track when PDF has fully loaded
    if (message === 'PDF_LOADED') {
      console.log('PDF fully loaded');
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
        console.log('Scheduling chapters extraction...');
        setTimeout(() => {
          extractChapters();
        }, 1000);
      }
    }
   
    if (message === 'REQUEST_PDF_DATA' && fileUri) {
      // WebView is requesting PDF data for PDF.js viewer
      // Read the file and send it back to the WebView
      (async () => {
        try {
          const base64Data = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
         
          // Use webViewRef.current instead of this.webViewRef
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`handlePdfData("${base64Data}"); true;`);
          }
        } catch (error) {
          console.error('Error reading PDF for WebView:', error);
          setError('Error reading PDF file: ' + error.message);
        }
      })();
    }
   
    // Handle page change messages
    if (message.startsWith('PAGE_CHANGE:')) {
      const parts = message.split(':');
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
            console.log('Saving reading progress after page change from viewer');
            // Use setTimeout to ensure state updates have completed
            setTimeout(() => saveReadingProgress(), 100);
          }
        }
      }
    }
   
    // Handle total pages message
    if (message.startsWith('TOTAL_PAGES:')) {
      const total = parseInt(message.split(':')[1], 10);
      if (!isNaN(total) && total > 0 && total !== totalPages) {
        console.log(`Setting total pages to ${total}`);
        setTotalPages(total);
      }
    }

    // Xử lý thông tin chapters từ WebView
    if (message.startsWith('CHAPTERS_DATA:')) {
      try {
        const chaptersData = JSON.parse(message.replace('CHAPTERS_DATA:', ''));
        console.log(`Received ${chaptersData.length} chapters from PDF`);
        
        // Nếu không có chapters, tạo chapters tự động
        if (chaptersData.length === 0) {
          const autoChapters = [];
          for (let i = 1; i <= totalPages; i += 10) {
            autoChapters.push({
              id: i,
              title: `Page ${i}`,
              page: i
            });
          }
          setChapters(autoChapters);
        } else {
          setChapters(chaptersData);
        }
        
        loadedChapters.current = true;
      } catch (error) {
        console.error('Error parsing chapters data:', error);
      }
    } else if (message.startsWith('CHAPTERS_ERROR:')) {
      console.error('Error extracting chapters:', message.replace('CHAPTERS_ERROR:', ''));
      // Nếu không thể trích xuất chapters, tạo chapters tự động dựa trên số trang
      if (totalPages > 0) {
        const autoChapters = [];
        for (let i = 1; i <= totalPages; i += 10) {
          autoChapters.push({
            id: i,
            title: `Page ${i}`,
            page: i
          });
        }
        setChapters(autoChapters);
      }
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
    setBottomMenuVisible(prev => !prev);
    // Also show/hide top controls when toggling bottom menu
    setControlsVisible(prev => !prev);
  };
 
  // Function to toggle highlighter tool
  const toggleHighlighter = () => {
    const newState = !isHighlighterActive;
    setIsHighlighterActive(newState);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        toggleHighlighter(${newState});
        true;
      `);
    }
  };


  // Add this useEffect to sync the PDF view with current page changes
  useEffect(() => {
    if (webViewRef.current && pdfLoadedRef.current && currentPage > 0 && totalPages > 0) {
      console.log(`Syncing PDF page to ${currentPage}`);
      webViewRef.current.injectJavaScript(`
        queueRenderPage(${currentPage});
        true;
      `);
    }
  }, [currentPage, totalPages]);


  // Add specific functions for page navigation
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };


  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
  };


  const extractChapters = async () => {
    if (!webViewRef.current) return;
    
    console.log('Extracting PDF chapters...');
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
                title: 'Page ' + i,
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
                    title: item.title || 'Chapter ' + id,
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
          console.error('Error extracting chapters:', error);
          window.ReactNativeWebView.postMessage('CHAPTERS_ERROR:' + error.message);
        }
      })();
      true;
    `);
  };


  // Cập nhật useEffect để đảm bảo chapters được extract sau khi PDF load xong
  useEffect(() => {
    if (pdfLoadedRef.current && !loadedChapters.current) {
      console.log('PDF loaded, extracting chapters...');
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
      <View style={[
        styles.header,
        controlsVisible ? null : styles.headerHidden
      ]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {pdfInfo?.title || 'PDF Viewer'}
        </Text>
       
        <TouchableOpacity style={styles.debugButton} onPress={showDebugInfo}>
          <Icon name="info" size={20} color="#fff" />
        </TouchableOpacity>
       
        <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
      </View>


      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#ff0000" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={sharePdf}
          >
            <Text style={styles.shareButtonText}>Share PDF</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.webView}
            originWhitelist={['*']}
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
              console.error('WebView error:', nativeEvent);
              setError(`WebView error: ${nativeEvent.description || 'Unknown error'}`);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView HTTP error:', nativeEvent);
              setError(`HTTP error ${nativeEvent.statusCode}: ${nativeEvent.description || 'Unknown error'}`);
            }}
            scalesPageToFit={Platform.OS === 'android'}
            decelerationRate={0.998}
            onContentSizeChange={() => console.log('Content size changed')}
          />
         
          {/* Reading progress indicator */}
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${readingProgress}%` }]}
            />
            {savedProgressPercentage !== null && (
              <View
                style={[styles.savedProgressMarker, { left: `${savedProgressPercentage}%` }]}
              />
            )}
          </View>
         
          {/* Bottom menu bar with buttons instead of slider */}
          <View style={[
            styles.bottomMenu,
            bottomMenuVisible ? null : styles.bottomMenuHidden
          ]}>
            <View style={styles.pageNavigationContainer}>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={goToPrevPage}
                disabled={currentPage <= 1}
              >
                <Icon name="navigate-before" size={28} color={currentPage <= 1 ? "#ccc" : "#3b82f6"} />
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
                <Icon name="navigate-next" size={28} color={currentPage >= totalPages ? "#ccc" : "#3b82f6"} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.highlighterButton, isHighlighterActive && styles.highlighterActive]}
              onPress={toggleHighlighter}
            >
              <Icon name="edit" size={24} color={isHighlighterActive ? "#fff" : "#3b82f6"} />
            </TouchableOpacity>
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
            
            <View style={styles.menuTabs}>
              <TouchableOpacity 
                style={[styles.menuTab, activeTab === 'chapters' && styles.activeTab]}
                onPress={() => setActiveTab('chapters')}
              >
                <Text style={[styles.menuTabText, activeTab === 'chapters' && styles.activeTabText]}>Chapters</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.menuTab, activeTab === 'pages' && styles.activeTab]}
                onPress={() => setActiveTab('pages')}
              >
                <Text style={[styles.menuTabText, activeTab === 'pages' && styles.activeTabText]}>Pages</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'chapters' ? (
              <FlatList
                data={chapters}
                renderItem={({ item }) => {
                  // So sánh với currentChapter để xác định chapter hiện tại
                  const isCurrentChapter = currentChapter && currentChapter.id === item.id;
                  
                  return (
                    <TouchableOpacity 
                      style={[styles.chapterItem, isCurrentChapter && styles.currentChapterItem]}
                      onPress={() => {
                        setCurrentPage(item.page);
                        setShowMenu(false);
                      }}
                    >
                      <View style={styles.chapterContent}>
                        <Text style={[styles.chapterTitle, isCurrentChapter && styles.currentChapterText]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.chapterPage, isCurrentChapter && styles.currentChapterText]}>
                          Page {item.page}
                        </Text>
                      </View>
                      {isCurrentChapter && (
                        <Icon name="check-circle" size={20} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={item => item.id}
              />
            ) : (
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
                        ).map(page => (
                          <TouchableOpacity
                            key={page}
                            style={[
                              styles.pageButton,
                              currentPage === page && styles.currentPageButton
                            ]}
                            onPress={() => {
                              setCurrentPage(page);
                              setShowMenu(false);
                            }}
                          >
                            <Text 
                              style={[
                                styles.pageButtonText,
                                currentPage === page && styles.currentPageButtonText
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
            )}
          </View>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: Platform.OS === 'ios' ? 40 : 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 3,
    height: Platform.OS === 'ios' ? 88 : 56,
  },
  headerHidden: {
    transform: [{ translateY: -100 }],
    transition: 'transform 0.3s ease',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  zoomButton: {
    marginHorizontal: 4,
    padding: 4,
  },
  zoomText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugButton: {
    padding: 8,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f0f0f0',
    marginTop: Platform.OS === 'ios' ? 88 : 56, // Add margin to push content below header
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    height: '100%',
  },
  webView: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    marginTop: 0,
    marginBottom: 0,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 18,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginTop: 16,
    color: '#ef4444',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  shareButton: {
    marginTop: 12,
    backgroundColor: '#4caf50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#e5e7eb', // gray-200
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6', // blue-500
  },
  savedProgressMarker: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: 2,
    backgroundColor: '#facc15', // yellow-400
  },
  // New styles for bottom menu
  bottomMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 3,
    transition: 'transform 0.3s ease',
  },
  bottomMenuHidden: {
    transform: [{ translateY: 100 }],
  },
  pageNavigationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    padding: 8,
    borderRadius: 30,
    backgroundColor: 'rgba(235, 235, 235, 0.5)',
  },
  pageInfo: {
    marginHorizontal: 15,
    alignItems: 'center',
    minWidth: 80,
  },
  pageText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  highlighterButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlighterActive: {
    backgroundColor: '#3b82f6',
  },
  menuButton: {
    marginLeft: 16,
  },
  menuModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  menuContent: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 88 : 56,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  menuTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  menuTabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  chapterItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentChapterItem: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  chapterContent: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  currentChapterText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  chapterPage: {
    fontSize: 14,
    color: '#6b7280',
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
    color: '#6b7280',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  pageButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4, // Compensate for pageButton margin
  },
  pageButton: {
    width: '16.666%', // Show 6 buttons per row
    aspectRatio: undefined, // Remove fixed aspect ratio
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    margin: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  currentPageButton: {
    backgroundColor: '#3b82f6',
  },
  pageButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  currentPageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

