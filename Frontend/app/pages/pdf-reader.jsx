import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

export default function PdfReader() {
  const { pdfId, localPath } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pdf, setPdf] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Set a timeout for PDF loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoadingTimeout(true);
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (localPath) {
          // If we have a local path, use it directly
          const filePath = decodeURIComponent(localPath);
          console.log('Loading local PDF file:', filePath);
          
          // Check if file exists
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists) {
            if (Platform.OS === 'ios') {
              // iOS requires a special file URL format
              setPdfUrl(filePath.replace('file://', ''));
            } else {
              setPdfUrl(filePath);
            }
            setLoading(false);
          } else {
            throw new Error('Local PDF file not found');
          }
        } else {
          await fetchPdfDetails();
        }
      } catch (err) {
        console.error('Error in loadPdf:', err);
        setError(err.message || 'Failed to load PDF');
        setLoading(false);
      }
    };
    
    loadPdf();
  }, [pdfId, localPath]);

  const fetchPdfDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        router.replace('/(auth)/LogIn');
        return;
      }
      
      const response = await fetch(`${API_URL}/pdfs/${pdfId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPdf(data.data);
        
        // Check for local PDF file in document directory
        const fileName = `pdf_${pdfId}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        if (fileInfo.exists) {
          console.log('Found local PDF file:', fileUri);
          console.log('File size:', fileInfo.size, 'bytes');
          
          if (Platform.OS === 'ios') {
            // iOS requires a special file URL format
            setPdfUrl(fileUri.replace('file://', ''));
          } else {
            setPdfUrl(fileUri);
          }
          setLoading(false);
        } else {
          // If PDF is not found locally, try to download it
          console.log('PDF file not found locally:', fileUri);
          await downloadPdf(token, pdfId, fileUri);
        }
      } else {
        throw new Error(data.message || 'Failed to fetch PDF details');
      }
    } catch (error) {
      console.error('Error fetching PDF details:', error);
      setError(`Failed to fetch PDF details: ${error.message}`);
      Alert.alert('Error', `Failed to fetch PDF details: ${error.message}`);
      setLoading(false);
    }
  };

  const downloadPdf = async (token, pdfId, fileUri) => {
    try {
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
        console.log('PDF downloaded successfully:', downloadResult.uri);
        
        // Check file size after download
        const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
        console.log('Downloaded file size:', fileInfo.size, 'bytes');
        
        if (fileInfo.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        if (Platform.OS === 'ios') {
          // iOS requires a special file URL format
          setPdfUrl(downloadResult.uri.replace('file://', ''));
        } else {
          setPdfUrl(downloadResult.uri);
        }
        setLoading(false);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError(`Failed to download PDF: ${error.message}`);
      Alert.alert('Error', `Failed to download PDF: ${error.message}`);
      setLoading(false);
    }
  };

  const renderPdfViewer = () => {
    if (!pdfUrl) return null;
    
    // Create a simple PDF viewer HTML with iframe
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background: #f0f0f0;
            }
            iframe {
              width: 100%;
              height: 100%;
              border: none;
            }
          </style>
        </head>
        <body>
          <iframe src="${pdfUrl}" type="application/pdf" width="100%" height="100%"></iframe>
        </body>
      </html>
    `;

    return (
      <WebView
        source={{ html: htmlContent }}
        style={styles.webView}
        originWhitelist={['*']}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>Loading PDF...</Text>
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setError(`WebView error: ${nativeEvent.description}`);
        }}
      />
    );
  };

  const handleRetry = () => {
    setError(null);
    setLoadingTimeout(false);
    setPdfUrl(null);
    setLoading(true);
    fetchPdfDetails();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {pdf?.title || 'PDF Reader'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading PDF...</Text>
          
          {loadingTimeout && (
            <View style={{marginTop: 20}}>
              <Text style={styles.errorText}>Loading is taking longer than expected.</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#ff0000" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : pdfUrl ? (
        renderPdfViewer()
      ) : (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#ff0000" />
          <Text style={styles.errorText}>
            PDF not available. Please download it first.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
  },
  webView: {
    flex: 1,
    backgroundColor: '#f0f0f0',
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
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 