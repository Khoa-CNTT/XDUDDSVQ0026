import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import HeaderHome from "../components/Home/HeaderHome";
import SectionHeader from "../components/SectionHeader";
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import * as FileSystem from 'expo-file-system';

const screenWidth = Dimensions.get('window').width;
const SPACING = 16;

export default function HomeScreen() {
  const router = useRouter();
  const [readingProgress, setReadingProgress] = useState({});
  const [recentlyReadPdfs, setRecentlyReadPdfs] = useState([]);
  const [completedPdfs, setCompletedPdfs] = useState([]);
  const [allPdfs, setAllPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Refs for managing lifecycle and fetch requests
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const isLoadingRef = useRef(false);
  const lastCheckedUpdate = useRef('');

  // useEffect to initialize component
  useEffect(() => {
    isMountedRef.current = true;
    
    // Tải dữ liệu ban đầu
    if (!isLoadingRef.current) {
      loadReadingProgressAndPdfs();
    }
    
    // Cleanup when component unmounts
    return () => {
      // console.log('📚 Home component unmounted');
      isMountedRef.current = false;
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Kiểm tra xem có nên tải lại dữ liệu không
  const shouldRefreshData = async () => {
    try {
      // Thời điểm lần cuối tải dữ liệu
      const lastFetchedStr = await AsyncStorage.getItem('home_data_last_fetched');
      const lastFetched = lastFetchedStr ? parseInt(lastFetchedStr) : 0;
      
      // Thời gian hiện tại
      const now = Date.now();
      
      // Khoảng thời gian tối thiểu giữa các lần refresh (2 phút = 120000ms)
      const minRefreshInterval = 120000;
      
      // Nếu chưa từng tải dữ liệu hoặc đã quá lâu
      if (!lastFetched || (now - lastFetched) > minRefreshInterval) {
        return true;
      }
      
      // Tránh việc tải lại dữ liệu nếu đã có dữ liệu
      if (allPdfs.length === 0) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('📚 Error checking refresh status:', error);
      // Nếu có lỗi, mặc định là tải lại dữ liệu
      return true;
    }
  };

  // Add useFocusEffect to reload data when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('📚 Home screen focused');
      isMountedRef.current = true;
      
      // Tạo AbortController mới để quản lý fetch requests
      const controller = new AbortController();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = controller;
      
      // Tải lại dữ liệu khi tab được focus, nhưng chỉ khi cần thiết
      const refreshDataOnFocus = async () => {
        try {
          // Kiểm tra xem có cần tải lại dữ liệu không
          const needRefresh = await shouldRefreshData();
          
          if (needRefresh) {
            console.log('📚 Home data refresh needed, fetching latest data...');
            // Đặt cờ để tránh nhiều fetchs cùng lúc
            isLoadingRef.current = true;
            
            if (!loading) setLoading(true);
            
            // Tải lại dữ liệu
            await loadReadingProgress();
            await fetchPDFs(controller.signal);
            
            if (isMountedRef.current) {
              // Cập nhật timestamp
              await AsyncStorage.setItem('home_data_last_fetched', Date.now().toString());
              setLoading(false);
            }
          } else {
            console.log('📚 Using cached home data, no need to refresh');
            // Vẫn tải lại reading progress vì nó thay đổi thường xuyên
            if (!isLoadingRef.current) {
              await loadReadingProgress();
            }
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('📚 Home data refresh was aborted');
            return;
          }
          
          console.error('📚 Error refreshing home data:', error);
        } finally {
          if (isMountedRef.current) {
            isLoadingRef.current = false;
          }
        }
      };
      
      refreshDataOnFocus();
      
      // Set up listener for reading progress updates
      const setupProgressListener = () => {
        // Đảm bảo chỉ có một interval đang chạy
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
        
        // Check for updates every 5 seconds
        checkIntervalRef.current = setInterval(async () => {
          if (!isMountedRef.current) return;
          
          try {
            const lastUpdate = await AsyncStorage.getItem('reading_progress_updated');
            if (lastUpdate && lastUpdate !== lastCheckedUpdate.current) {
              console.log('📚 Reading progress was updated, refreshing data...');
              lastCheckedUpdate.current = lastUpdate;
              // Chỉ tải lại reading progress, không phải toàn bộ dữ liệu
              await loadReadingProgress();
            }
          } catch (error) {
            if (isMountedRef.current) {
              console.error('📚 Error checking for reading progress updates:', error);
            }
          }
        }, 5000); // Check every 5 seconds
      };
      
      setupProgressListener();
      
      return () => {
        console.log('📚 Home screen unfocused - cleaning up');
        
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        
        // Abort ongoing fetch requests
        controller.abort();
      };
    }, [])
  );

  // Load reading progress and PDFs data
  const loadReadingProgressAndPdfs = async () => {
    if (isLoadingRef.current || !isMountedRef.current) return;
    
    try {
      isLoadingRef.current = true;
      if (!loading) setLoading(true);
      
      // Tạo AbortController mới để quản lý fetch requests
      const controller = new AbortController();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = controller;
      
      await loadReadingProgress();
      await fetchPDFs(controller.signal);
      
      if (isMountedRef.current) {
        // Cập nhật timestamp
        await AsyncStorage.setItem('home_data_last_fetched', Date.now().toString());
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('📚 Data loading was aborted');
        return;
      }
      
      console.error('📚 Error loading data:', error);
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Load reading progress from AsyncStorage
  const loadReadingProgress = async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('📚 Loading reading progress...');
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter(key => key.startsWith('pdf_progress_'));
      
      if (progressKeys.length > 0) {
        const progressItems = await AsyncStorage.multiGet(progressKeys);
        const progressData = {};
        
        progressItems.forEach(([key, value]) => {
          if (value) {
            try {
              const pdfId = key.replace('pdf_progress_', '');
              const progress = JSON.parse(value);
              progressData[pdfId] = progress;
            } catch (parseError) {
              console.error('📚 Error parsing progress data:', parseError);
            }
          }
        });
        
        if (isMountedRef.current) {
          setReadingProgress(progressData);
          console.log('📚 Loaded reading progress from local storage for', Object.keys(progressData).length, 'PDFs');
        }
      }
    } catch (error) {
      console.error('📚 Error loading reading progress:', error);
    }
  };

  // Function to get reading progress percentage consistently
  const getReadingProgressForPdf = (pdfId) => {
    const progress = readingProgress[pdfId];
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

  // Fetch PDFs from API and categorize them
  const fetchPDFs = async (signal) => {
    if (!isMountedRef.current) return;
    
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('📚 No token found');
        return;
      }
      
      console.log('📚 Fetching PDFs from API...');
      const response = await fetch(`${API_URL}/pdfs`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal // Pass the AbortController signal
      });
      
      if (!isMountedRef.current) return;
      
      const data = await response.json();
      
      if (data.success) {
        const pdfs = data.data;
        console.log(`📚 Fetched ${pdfs.length} PDFs from API`);
        
        // Get recently viewed document IDs
        const recentlyViewedKey = 'recently_viewed_docs';
        const recentlyViewedJson = await AsyncStorage.getItem(recentlyViewedKey);
        const recentlyViewedIds = recentlyViewedJson ? JSON.parse(recentlyViewedJson) : [];
        
        // Process PDFs with reading progress
        const recentlyRead = [];
        const completed = [];
        const inProgress = [];
        const processedPdfs = [];
        
        // Process all PDFs and check for reading progress
        pdfs.forEach(pdf => {
          // Always recalculate progress using the common function
          const percentComplete = getReadingProgressForPdf(pdf.id);
          const progress = readingProgress[pdf.id];
          
          // Create a proper Date object from the timestamp string
          const timestamp = progress?.timestamp ? new Date(progress.timestamp) : new Date();
          
          const pdfWithProgress = {
            ...pdf,
            progress: percentComplete,
            currentPage: progress?.page || 1,
            totalPages: progress?.total || 1,
            timestamp: timestamp
          };
          
          // Add to processed pdfs list
          processedPdfs.push(pdfWithProgress);
          
          // Check if this is a recently viewed document
          const isRecentlyViewed = recentlyViewedIds.includes(pdf.id.toString());
          
          // Add to recently read if it has progress or is recently viewed
          if (percentComplete > 0 || isRecentlyViewed) {
            recentlyRead.push(pdfWithProgress);
          }
          
          // Add to completed if 100%
          if (percentComplete >= 100) {
            completed.push(pdfWithProgress);
          }
          
          // Add to in progress if between 1% and 99%
          if (percentComplete > 0 && percentComplete < 100) {
            inProgress.push(pdfWithProgress);
          }
        });
        
        // Sort by most recently read
        const sortByTimestamp = (a, b) => {
          const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
          const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
          return timeB - timeA; // Most recent first
        };
        
        // Sort all three arrays
        recentlyRead.sort(sortByTimestamp);
        completed.sort(sortByTimestamp);
        inProgress.sort(sortByTimestamp);
        
        if (isMountedRef.current) {
          console.log(`📚 Found ${recentlyRead.length} recently read PDFs, ${completed.length} completed PDFs`);
          
          setRecentlyReadPdfs(recentlyRead);
          setCompletedPdfs(completed);
          setAllPdfs(processedPdfs);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('📚 PDF fetch was aborted');
        return;
      }
      
      console.error('📚 Error fetching PDFs:', error);
    }
  };

  // Handle viewing a PDF - Update to ensure reading progress is properly loaded
  const handleViewPdf = async (pdfId) => {
    try {
      // Get the reading progress for this PDF
      const progress = readingProgress[pdfId];
      let currentPage = 1;
      
      if (progress && progress.page) {
        currentPage = parseInt(progress.page, 10);
        console.log(`📚 Opening PDF at saved page ${currentPage}`);
      }
      
      // Check if the PDF exists locally
      const fileName = `pdf_${pdfId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      // Add to recently viewed before navigating
      const recentlyViewedKey = 'recently_viewed_docs';
      try {
        const recentlyViewedJson = await AsyncStorage.getItem(recentlyViewedKey);
        let recentlyViewedIds = recentlyViewedJson ? JSON.parse(recentlyViewedJson) : [];
        
        // Remove if already in list (to add at the beginning)
        recentlyViewedIds = recentlyViewedIds.filter(id => id !== pdfId.toString());
        
        // Add at beginning of array
        recentlyViewedIds.unshift(pdfId.toString());
        
        // Keep only the most recent 10
        if (recentlyViewedIds.length > 10) {
          recentlyViewedIds = recentlyViewedIds.slice(0, 10);
        }
        
        await AsyncStorage.setItem(recentlyViewedKey, JSON.stringify(recentlyViewedIds));
      } catch (err) {
        console.error('📚 Error updating recently viewed:', err);
      }
      
      router.push({
        pathname: '/PdfViewer',
        params: { 
          pdfId: pdfId,
          localPath: fileInfo.exists ? encodeURIComponent(fileUri) : '',
          initialPage: currentPage
        }
      });
    } catch (error) {
      console.error('📚 Error preparing PDF view:', error);
      
      // Fall back to basic navigation if there's an error
      router.push({
        pathname: '/PdfViewer',
        params: { pdfId: pdfId }
      });
    }
  };

  // Define all sections for the main FlatList
  const sections = [
    { id: 'recentlyRead', type: 'recentlyRead', title: 'Đã Đọc Gần Đây' },
    { id: 'allDocs', type: 'allDocs', title: 'Tất Cả Tài Liệu' },
  ];

  // Render different section types for the main FlatList
  const renderSection = ({ item }) => {
    switch (item.type) {
      case 'recentlyRead':
        return (
          <View>
            <View className="flex-row justify-between items-center mb-4 mt-6 px-4">
              <Text className="text-[22px] font-bold">{item.title}</Text>
            </View>
            {recentlyReadPdfs.length > 0 ? (
              <FlatList
                data={recentlyReadPdfs.slice(0, 3)}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="mr-4"
                    style={{ width: 130 }}
                    onPress={() => handleViewPdf(item.id)}
                  >
                    <View
                      className="rounded-lg mb-2 shadow-md bg-blue-100 justify-center items-center"
                      style={{ width: 130, height: 180 }}
                    >
                      <Icon name="picture-as-pdf" size={40} color="#0064e1" />
                    </View>
                    
                    <Text
                      className="font-semibold text-sm mb-0.5"
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    
                    <View className="flex-row items-center mt-1">
                      <View className="h-1 bg-gray-200 rounded-full flex-1 mr-2">
                        <View
                          className="h-1 bg-blue-500 rounded-full"
                          style={{ width: `${getReadingProgressForPdf(item.id)}%` }}
                        />
                      </View>
                      <Text className="text-gray-400 text-xs">
                        {getReadingProgressForPdf(item.id)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={item => `recent-${item.id}`}
                contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING }}
              />
            ) : (
              <View className="px-4 py-6 items-center">
                <Text className="text-gray-500">Bạn chưa đọc tài liệu nào gần đây</Text>
              </View>
            )}
          </View>
        );

      case 'allDocs':
        return (
          <View>
            <SectionHeader title={item.title} type="all" />
            <View className="px-4">
              {allPdfs.length > 0 ? (
                allPdfs.slice(0, 3).map((pdf, index) => (
                  <TouchableOpacity 
                    key={`all-${pdf.id}`}
                    className="flex-row items-center bg-white p-3 mb-3 rounded-xl shadow-sm"
                    onPress={() => handleViewPdf(pdf.id)}
                  >
                    <View className="bg-blue-100 h-14 w-14 rounded-lg justify-center items-center mr-3">
                      <Icon name="picture-as-pdf" size={28} color="#0064e1" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold" numberOfLines={1}>{pdf.title}</Text>
                      <Text className="text-gray-500 text-xs mt-1">
                        {pdf.upload_date ? new Date(pdf.upload_date).toLocaleDateString("vi-VN") : "Không rõ ngày tải lên"}
                      </Text>
                      
                      <View className="flex-row items-center mt-2">
                        <View className="h-1 bg-gray-200 rounded-full flex-1 mr-2">
                          <View
                            className="h-1 bg-blue-500 rounded-full"
                            style={{ width: `${getReadingProgressForPdf(pdf.id)}%` }}
                          />
                        </View>
                        <Text className="text-gray-400 text-xs">
                          {getReadingProgressForPdf(pdf.id)}%
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron-right" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                ))
              ) : (
                <View className="py-6 items-center">
                  <Text className="text-gray-500">Không có tài liệu nào</Text>
                </View>
              )}
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#0064e1" />
        <Text className="mt-4 text-gray-600">Đang tải dữ liệu...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <FlatList
        data={sections}
        keyExtractor={item => item.id}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<HeaderHome />}
        contentContainerStyle={{ paddingBottom: 120 }}
      />
    </SafeAreaView>
  );
}



