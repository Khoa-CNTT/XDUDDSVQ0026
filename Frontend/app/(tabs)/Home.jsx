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
import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    loadReadingProgressAndPdfs();
  }, []);

  // Add useFocusEffect to reload data when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadReadingProgressAndPdfs();
      return () => {
        // cleanup if needed
      };
    }, [])
  );

  // Load reading progress and PDFs data
  const loadReadingProgressAndPdfs = async () => {
    try {
      setLoading(true);
      await loadReadingProgress();
      await fetchPDFs();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load reading progress from AsyncStorage
  const loadReadingProgress = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter(key => key.startsWith('pdf_progress_'));
      
      if (progressKeys.length > 0) {
        const progressItems = await AsyncStorage.multiGet(progressKeys);
        const progressData = {};
        
        progressItems.forEach(([key, value]) => {
          if (value) {
            const pdfId = key.replace('pdf_progress_', '');
            const progress = JSON.parse(value);
            progressData[pdfId] = progress;
          }
        });
        
        setReadingProgress(progressData);
        console.log('Loaded reading progress from local storage for', Object.keys(progressData).length, 'PDFs');
      }
    } catch (error) {
      console.error('Error loading reading progress:', error);
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
  const fetchPDFs = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found');
        return;
      }
      
      const response = await fetch(`${API_URL}/pdfs`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        const pdfs = data.data;
        setAllPdfs(pdfs);
        
        // Get recently viewed document IDs
        const recentlyViewedKey = 'recently_viewed_docs';
        const recentlyViewedJson = await AsyncStorage.getItem(recentlyViewedKey);
        const recentlyViewedIds = recentlyViewedJson ? JSON.parse(recentlyViewedJson) : [];
        
        // Process PDFs with reading progress
        const recentlyRead = [];
        const completed = [];
        const inProgress = [];
        
        // Process all PDFs and check for reading progress
        pdfs.forEach(pdf => {
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
        
        console.log(`Found ${recentlyRead.length} recently read PDFs, ${completed.length} completed PDFs`);
        
        setRecentlyReadPdfs(recentlyRead);
        setCompletedPdfs(completed);
      }
    } catch (error) {
      console.error('Error fetching PDFs:', error);
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
        console.log(`Opening PDF at saved page ${currentPage}`);
      }
      
      // Check if the PDF exists locally
      const fileName = `pdf_${pdfId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      router.push({
        pathname: '/PdfViewer',
        params: { 
          pdfId: pdfId,
          localPath: fileInfo.exists ? encodeURIComponent(fileUri) : '',
          initialPage: currentPage
        }
      });
    } catch (error) {
      console.error('Error preparing PDF view:', error);
      
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
            <SectionHeader title={item.title} />
            {recentlyReadPdfs.length > 0 ? (
              <FlatList
                data={recentlyReadPdfs}
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
                          style={{ width: `${item.progress}%` }}
                        />
                      </View>
                      <Text className="text-gray-400 text-xs">
                        {item.progress}%
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
            <SectionHeader title={item.title} />
            <View className="px-4">
              {allPdfs.length > 0 ? (
                allPdfs.map((pdf, index) => (
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



