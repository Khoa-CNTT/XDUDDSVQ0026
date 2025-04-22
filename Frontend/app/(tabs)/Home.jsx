import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import booksData from "../../assets/booksData";
import HeaderHome from "../components/Home/HeaderHome";
import RenderBookItem from "../components/Home/RenderBookItem";
import RenderReadingNowItem from "../components/Home/RenderReadingNowItem";
import SectionHeader from "../components/SectionHeader";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import * as FileSystem from 'expo-file-system';

const screenWidth = Dimensions.get('window').width;

const SPACING = 16;

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [readingProgress, setReadingProgress] = useState({});
  const [recentlyReadPdfs, setRecentlyReadPdfs] = useState([]);
  const [completedPdfs, setCompletedPdfs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReadingProgressAndPdfs();
  }, []);

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
      // Only use AsyncStorage (removed database sync)
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
        
        // Process PDFs with reading progress
        const recentlyRead = [];
        const completed = [];
        const inProgress = [];
        
        pdfs.forEach(pdf => {
          const progress = readingProgress[pdf.id];
          
          if (progress) {
            // Get percentage either from saved value or calculate it
            let percentComplete = 0;
            
            if (progress.percentage) {
              percentComplete = parseInt(progress.percentage, 10);
            } else if (progress.page && progress.total) {
              percentComplete = Math.floor((progress.page / progress.total) * 100);
            }
            
            // Create a proper Date object from the timestamp string
            const timestamp = progress.timestamp ? new Date(progress.timestamp) : new Date();
            
            const pdfWithProgress = {
              ...pdf,
              progress: percentComplete,
              currentPage: progress.page,
              totalPages: progress.total,
              timestamp: timestamp
            };
            
            // Add to recently read if started (greater than 0%)
            if (percentComplete > 0) {
              recentlyRead.push(pdfWithProgress);
            }
            
            // Add to in progress if between 1% and 99%
            if (percentComplete > 0 && percentComplete < 100) {
              inProgress.push(pdfWithProgress);
            }
            
            // Add to completed if 100%
            if (percentComplete >= 100) {
              completed.push(pdfWithProgress);
            }
          }
        });
        
        // Sort by most recently read
        const sortByTimestamp = (a, b) => {
          const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
          const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
          return timeB - timeA; // Most recent first
        };
        
        recentlyRead.sort(sortByTimestamp);
        inProgress.sort(sortByTimestamp);
        completed.sort(sortByTimestamp);
        
        console.log(`Found ${inProgress.length} PDFs in progress, ${completed.length} completed PDFs`);
        
        setRecentlyReadPdfs(recentlyRead);
        setCompletedPdfs(completed);
        
        // Replace empty recentlyReadPdfs with inProgress for "Đang Đọc" section
        if (inProgress.length > 0) {
          setRecentlyReadPdfs(inProgress);
        }
      }
    } catch (error) {
      console.error('Error fetching PDFs:', error);
    }
  };

  // Handle viewing a PDF
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
    { id: 'reading', type: 'reading', title: 'Đang Đọc' },
    { id: 'recentlyRead', type: 'recentlyRead', title: 'Đã Đọc Gần Đây' },
    { id: 'completed', type: 'completed', title: 'Đã Đọc Xong' },
    { id: 'trending', type: 'trending', title: 'Mới & Xu Hướng' },
    { id: 'categories', type: 'categories', title: 'Danh Mục' },
    { id: 'free', type: 'free', title: 'Sách Miễn Phí' },
    { id: 'topcharts', type: 'topcharts', title: 'Bảng Xếp Hạng' },
  ];

  // Render different section types for the main FlatList
  const renderSection = ({ item }) => {
    switch (item.type) {
      case 'reading':
        return (
          <View>
            <SectionHeader title={item.title} />
            <View className="flex-row flex-wrap justify-between mt-4 px-4">
              {recentlyReadPdfs.length > 0 ? (
                recentlyReadPdfs.slice(0, 4).map(pdf => (
                  <View key={pdf.id} className="w-[46%]">
                    <TouchableOpacity
                      className="mb-6"
                      style={{ width: (screenWidth - SPACING * 3) / 2 }}
                      onPress={() => handleViewPdf(pdf.id)}
                    >
                      <View
                        className="rounded-lg mb-2 shadow-md bg-blue-100 justify-center items-center"
                        style={{ width: (screenWidth - SPACING * 3) / 2, height: ((screenWidth - SPACING * 3) / 2) * 1.5 }}
                      >
                        <Icon name="picture-as-pdf" size={48} color="#0064e1" />
                      </View>
                     
                      <View className="px-1">
                        <Text
                          className="font-semibold text-sm mb-1"
                          numberOfLines={2}
                        >
                          {pdf.title}
                        </Text>
                       
                        <View className="flex-row items-center mt-1 mb-1">
                          <View className="h-1 bg-gray-200 rounded-full w-full overflow-hidden">
                            <View
                              className="h-1 bg-blue-500 rounded-full"
                              style={{ width: `${pdf.progress || 0}%` }}
                            />
                          </View>
                          <Text className="text-gray-400 text-xs mt-1 ml-1">
                            {pdf.progress}%
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                booksData.featuredBooks.slice(0, 4).map(book => (
                  <View key={book.id} className="w-[46%]">
                    {RenderReadingNowItem({ item: book })}
                  </View>
                ))
              )}
            </View>
          </View>
        );

      case 'recentlyRead':
        if (recentlyReadPdfs.length === 0) return null;
        return (
          <View>
            <SectionHeader title={item.title} />
            <FlatList
              data={recentlyReadPdfs}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="mr-4"
                  style={{ width: 120 }}
                  onPress={() => handleViewPdf(item.id)}
                >
                  <View
                    className="rounded-lg mb-2 shadow-md bg-blue-100 justify-center items-center"
                    style={{ width: 120, height: 180 }}
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
          </View>
        );

      case 'completed':
        if (completedPdfs.length === 0) return null;
        return (
          <View>
            <SectionHeader title={item.title} />
            <FlatList
              data={completedPdfs}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="mr-4"
                  style={{ width: 120 }}
                  onPress={() => handleViewPdf(item.id)}
                >
                  <View
                    className="rounded-lg mb-2 shadow-md bg-green-100 justify-center items-center relative"
                    style={{ width: 120, height: 180 }}
                  >
                    <Icon name="picture-as-pdf" size={40} color="#16a34a" />
                    <View className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                      <Icon name="check" size={16} color="#fff" />
                    </View>
                  </View>
                  
                  <Text
                    className="font-semibold text-sm mb-0.5"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  
                  <Text className="text-green-600 text-xs font-medium">
                    Đã hoàn thành
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => `completed-${item.id}`}
              contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING }}
            />
          </View>
        );
      
      case 'trending':
        return (
          <View>
            <SectionHeader title={item.title} />
            <FlatList
              data={booksData.bestSellers}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={RenderBookItem}
              keyExtractor={book => book.id}
              contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING * 2 }}
            />
          </View>
        );
     
      case 'categories':
        return (
          <View className="mb-2">
            <SectionHeader title={item.title} />
            <View className="flex-row flex-wrap justify-between px-4">
              {['Tiểu Thuyết', 'Giáo Dục', 'Kinh Doanh', 'Tâm Lý Học', 'Khoa Học', 'Lịch Sử'].map((category, index) => (
                <TouchableOpacity
                  key={index}
                  className="bg-white rounded-xl p-4 mb-4 shadow w-[46%]"
                >
                  <Text className="text-base font-semibold">{category}</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    {Math.floor(Math.random() * 100) + 50} sách
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
     
      case 'free':
        return (
          <View>
            <SectionHeader title={item.title} />
            <FlatList
              data={booksData.freeBooks}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={RenderBookItem}
              keyExtractor={book => book.id}
              contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING * 2 }}
            />
          </View>
        );
     
      case 'topcharts':
        return (
          <View>
            <SectionHeader title={item.title} />
            <FlatList
              data={[...booksData.bestSellers].sort(() => Math.random() - 0.5)}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View className="w-[120px] mr-4 relative">
                  {/* Ranking Badge */}
                  <View className="absolute top-0 left-0 z-10 bg-blue-500 w-[30px] h-[30px] rounded-full justify-center items-center shadow-md">
                    <Text className="text-white font-bold">
                      {index + 1}
                    </Text>
                  </View>

                  {/* Book Item */}
                  <TouchableOpacity
                    className="mt-[15px]"
                    onPress={() => {
                      if (item.file_path) {
                        navigation.navigate('PdfViewer', {
                          pdfPath: item.file_path,
                          pdfTitle: item.name_book
                        });
                      } else {
                        router.push(`/Books/${item.book_id}`);
                      }
                    }}
                  >
                    {item.image ? (
                      <Image
                        source={item.image}
                        className="w-[120px] h-[180px] rounded-lg mb-2 shadow-sm"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-[120px] h-[180px] rounded-lg mb-2 shadow-sm bg-gray-300 justify-center items-center">
                        <Text className="text-gray-500">No Image</Text>
                      </View>
                    )}
                    <Text
                      className="font-semibold text-sm mb-0.5"
                      numberOfLines={3}
                    >
                      {item.name_book}
                    </Text>
                    <Text className="text-gray-500 text-xs">{item.author}</Text>
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item, index) => `top-${item.book_id || item.id || index}`}
              contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING * 2, paddingTop: 10 }}
            />
          </View>
        );
     
      default:
        return null;
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <FlatList
        data={sections}
        keyExtractor={item => item.id}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
              <View className="flex-1">
                <HeaderHome />
              </View>
            }
        contentContainerStyle={{ paddingBottom: SPACING * 7 }}
      />
    </SafeAreaView>
  );
}



