import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { API_URL } from '../config';
import { Ionicons } from '@expo/vector-icons';

export default function PdfLibraryScreen() {
  const router = useRouter();
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadedStatus, setDownloadedStatus] = useState({});

  useEffect(() => {
    fetchPDFs();
  }, []);

  const fetchPDFs = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        // Redirect to login screen if not already there
        router.replace('/login');
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
      console.log('PDFs data:', data);
      
      if (data.success) {
        setPdfs(data.data);
        checkDownloadedPdfs(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch PDFs');
      }
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      Alert.alert('Error', `Failed to fetch PDFs: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkDownloadedPdfs = async (pdfList) => {
    try {
      const statusMap = {};
      
      // Check each PDF if it exists locally
      for (const pdf of pdfList) {
        const fileName = `pdf_${pdf.id}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        statusMap[pdf.id] = fileInfo.exists;
      }
      
      setDownloadedStatus(statusMap);
    } catch (error) {
      console.error('Error checking downloaded PDFs:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPDFs();
  };

  const handlePdfPress = async (pdfId) => {
    try {
      setLoading(true);
      
      // Check if the PDF exists locally
      const fileName = `pdf_${pdfId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      // Navigate to the PDF reader with local path if available
      router.push({
        pathname: '/PdfViewer',
        params: { 
          pdfId: pdfId,
          localPath: fileInfo.exists ? encodeURIComponent(fileUri) : ''
        }
      });
    } catch (error) {
      console.error('Error checking local file:', error);
      
      // Navigate without local path if there was an error
      router.push({
        pathname: '/PdfViewer',
        params: { pdfId: pdfId }
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (pdfId) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Please log in to download PDFs');
        return;
      }
      
      // First, check if file already exists
      const fileName = `pdf_${pdfId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (fileInfo.exists) {
        Alert.alert('Info', 'PDF is already downloaded and available offline.');
        setLoading(false);
        return;
      }
      
      // Show download started message
      Alert.alert('Download Started', 'The PDF is being downloaded to your device.');
      
      // Download the file
      const downloadResumable = FileSystem.createDownloadResumable(
        `${API_URL}/pdfs/${pdfId}/download`,
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
        Alert.alert('Success', 'PDF downloaded successfully and is now available offline.');
        
        // Refresh the list to show any changes in the download status
        fetchPDFs();
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', `Failed to download PDF: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deletePDF = async (pdfId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      Alert.alert(
        'Confirm Deletion',
        'Are you sure you want to delete this PDF?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            onPress: async () => {
              try {
                setLoading(true);
                
                // Delete from server
                const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
                  method: 'DELETE',
                  headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                const data = await response.json();
                
                // Try to delete local file regardless of server response
                try {
                  // Check if file exists locally
                  const fileName = `pdf_${pdfId}.pdf`;
                  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
                  
                  const fileInfo = await FileSystem.getInfoAsync(fileUri);
                  
                  if (fileInfo.exists) {
                    await FileSystem.deleteAsync(fileUri);
                    console.log('Deleted local PDF file:', fileUri);
                  }
                } catch (fileError) {
                  console.error('Error deleting local file:', fileError);
                  // Continue anyway, we still want to remove from the list even if local file deletion fails
                }
                
                if (data.success) {
                  // Remove from the list
                  setPdfs(currentPdfs => currentPdfs.filter(pdf => pdf.id !== pdfId));
                  
                  // Update download status
                  setDownloadedStatus(current => {
                    const updated = { ...current };
                    delete updated[pdfId];
                    return updated;
                  });
                  
                  Alert.alert('Success', 'PDF deleted successfully');
                } else {
                  throw new Error(data.message || 'Failed to delete PDF');
                }
              } catch (error) {
                console.error('Error deleting PDF:', error);
                Alert.alert('Error', `Failed to delete PDF: ${error.message}`);
              } finally {
                setLoading(false);
              }
            },
            style: 'destructive'
          }
        ]
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message);
    }
  };

  const renderItem = ({ item }) => {
    const isDownloaded = downloadedStatus[item.id] || false;
    
    return (
      <View className="bg-white p-4 rounded-lg mb-4 shadow">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-bold" numberOfLines={1} style={{ flex: 1 }}>{item.title}</Text>
          {isDownloaded && (
            <View className="bg-green-100 px-2 py-1 rounded-lg">
              <Text className="text-green-700 text-xs font-semibold">Downloaded</Text>
            </View>
          )}
        </View>
        
        {item.description && (
          <Text className="text-gray-600 mb-2" numberOfLines={2}>{item.description}</Text>
        )}
        
        <View className="flex-row justify-between">
          <TouchableOpacity 
            onPress={() => handlePdfPress(item.id)}
            className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
          >
            <Ionicons name="book-outline" size={18} color="white" style={{ marginRight: 8 }} />
            <Text className="text-white font-semibold">Read</Text>
          </TouchableOpacity>
          
          <View className="flex-row">
            <TouchableOpacity 
              onPress={() => downloadPdf(item.id)}
              className={`${isDownloaded ? 'bg-gray-400' : 'bg-green-500'} px-4 py-2 rounded-lg flex-row items-center mr-2`}
              disabled={isDownloaded}
            >
              <Ionicons 
                name={isDownloaded ? "checkmark-circle-outline" : "download-outline"} 
                size={18} 
                color="white" 
                style={{ marginRight: 8 }} 
              />
              <Text className="text-white font-semibold">
                {isDownloaded ? 'Downloaded' : 'Download'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => deletePDF(item.id)}
              className="bg-red-500 px-4 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="trash-outline" size={18} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-semibold">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-100 pt-10 px-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold">PDF Library</Text>
        <TouchableOpacity 
          onPress={() => router.push('/upload-pdf')}
          className="bg-blue-500 p-2 rounded-full"
        >
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="mt-2 text-gray-500">Loading PDFs...</Text>
        </View>
      ) : pdfs.length > 0 ? (
        <FlatList
          data={pdfs}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <View className="flex-1 justify-center items-center">
          <Icon name="description" size={64} color="#cccccc" />
          <Text className="mt-4 text-gray-500 text-lg">No PDFs found</Text>
          <TouchableOpacity 
            className="mt-4 bg-green-500 px-6 py-3 rounded-lg"
            onPress={() => router.push('/upload-pdf')}
          >
            <Text className="text-white font-bold">Upload PDF</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
} 