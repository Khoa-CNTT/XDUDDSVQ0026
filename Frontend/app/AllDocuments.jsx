import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StatusBar,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

export default function AllDocumentsScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
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
        setDocuments(data.data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPdf = (pdfId) => {
    router.push({
      pathname: '/PdfViewer',
      params: { pdfId }
    });
  };

  const handleEdit = (doc) => {
    setSelectedDoc(doc);
    setNewTitle(doc.title);
    setEditModalVisible(true);
  };

  const handleDelete = (doc) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa tài liệu này?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(`${API_URL}/pdfs/${doc.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                setDocuments(documents.filter(d => d.id !== doc.id));
                Alert.alert("Thành công", "Tài liệu đã được xóa");
              }
            } catch (error) {
              console.error('Error deleting document:', error);
              Alert.alert("Lỗi", "Không thể xóa tài liệu");
            }
          }
        }
      ]
    );
  };

  const handleSaveEdit = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/pdfs/${selectedDoc.id}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setDocuments(documents.map(doc => 
          doc.id === selectedDoc.id ? { ...doc, title: newTitle } : doc
        ));
        setEditModalVisible(false);
        Alert.alert("Thành công", "Tiêu đề đã được cập nhật");
      } else {
        Alert.alert("Lỗi", data.message || "Không thể cập nhật tiêu đề");
      }
    } catch (error) {
      console.error('Error updating document:', error);
      Alert.alert("Lỗi", "Không thể cập nhật tiêu đề");
    }
  };

  const renderItem = ({ item }) => (
    <View className="flex-row items-center bg-white p-4 mb-3 rounded-xl shadow-sm mx-4">
      <View className="bg-blue-100 h-14 w-14 rounded-lg justify-center items-center mr-3">
        <Icon name="picture-as-pdf" size={28} color="#0064e1" />
      </View>
      <TouchableOpacity 
        className="flex-1"
        onPress={() => handleViewPdf(item.id)}
      >
        <Text className="font-semibold" numberOfLines={1}>{item.title}</Text>
        <Text className="text-gray-500 text-xs mt-1">
          {item.upload_date ? new Date(item.upload_date).toLocaleDateString("vi-VN") : "Không rõ ngày tải lên"}
        </Text>
      </TouchableOpacity>
      <View className="flex-row">
        <TouchableOpacity 
          className="p-2"
          onPress={() => handleEdit(item)}
        >
          <Icon name="edit" size={24} color="#0064e1" />
        </TouchableOpacity>
        <TouchableOpacity 
          className="p-2"
          onPress={() => handleDelete(item)}
        >
          <Icon name="delete" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* <View className="flex-row items-center p-4 border-b border-gray-200 bg-white">
        <TouchableOpacity 
          className="mr-4"
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">Tất cả tài liệu và sách</Text>
      </View> */}

      <FlatList
        data={documents}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingVertical: 16 }}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-xl w-[90%]">
            <Text className="text-xl font-bold mb-4">Chỉnh sửa tiêu đề</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4"
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Nhập tiêu đề mới"
            />
            <View className="flex-row justify-end">
              <TouchableOpacity 
                className="px-4 py-2 mr-2"
                onPress={() => setEditModalVisible(false)}
              >
                <Text className="text-gray-600">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="bg-blue-500 px-4 py-2 rounded-lg"
                onPress={handleSaveEdit}
              >
                <Text className="text-white">Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 