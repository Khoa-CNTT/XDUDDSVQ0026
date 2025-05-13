import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Stack } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import { API_URL } from "../config";
import authService from "../services/authService";

export default function Charity() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [donationsCount, setDonationsCount] = useState(0);

  useEffect(() => {
    // Try to get user info if available, but not required
    const getUserInfo = async () => {
      try {
        const userInfo = await authService.getUserInfo();
        console.log("User info for donation:", userInfo);
        if (userInfo) {
          setName(userInfo.name_user || userInfo.name || "");
          setEmail(userInfo.email || "");

          // Store user_id if available
          if (userInfo.user_id) {
            setUserId(userInfo.user_id);
            console.log("Set user_id for donation:", userInfo.user_id);
          }
        }
      } catch (error) {
        console.error("Error getting user info:", error);
      }
    };

    getUserInfo();
    fetchDonationsCount();
  }, []);

  const fetchDonationsCount = async () => {
    try {
      // Lấy email từ userInfo
      const userInfo = await authService.getUserInfo();
      const email = userInfo ? userInfo.email : null;

      if (!email) {
        console.log("No email found for user");
        setDonationsCount(0);
        return;
      }

      // Gọi API với email
      const response = await axios.get(
        `${API_URL}/user-donations-count?email=${encodeURIComponent(email)}`
      );

      if (response.data && response.data.count !== undefined) {
        setDonationsCount(response.data.count);
      }
    } catch (error) {
      console.error("Error fetching donations count:", error);
      setDonationsCount(0);
    }
  };

  const selectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/epub+zip"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log("User cancelled file picker");
        return;
      }

      setSelectedFile(result.assets[0]);
      // Extract filename without extension as default title
      const filename = result.assets[0].name;
      const titleWithoutExtension =
        filename.substring(0, filename.lastIndexOf(".")) || filename;
      setTitle(titleWithoutExtension);
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Lỗi", "Không thể chọn tệp. Vui lòng thử lại.");
    }
  };

  const donateBook = async () => {
    // Validate form fields
    if (!selectedFile) {
      Alert.alert("Thông báo", "Vui lòng chọn một tệp sách để quyên góp.");
      return;
    }

    if (!name || !email || !title) {
      Alert.alert("Thông báo", "Vui lòng điền đầy đủ thông tin.");
      return;
    }

    setLoading(true);
    try {
      // Create form data with all required fields
      const formData = new FormData();
      formData.append("title", title);
      formData.append("name_user", name);
      formData.append("email", email);

      // Include user_id if available
      if (userId) {
        formData.append("user_id", userId);
        console.log("Including user_id in donation:", userId);
      }

      // Use 'file' key as expected by the backend
      formData.append("file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || "application/pdf",
      });

      console.log("Sending donation with form data:", {
        title,
        name_user: name,
        email,
        user_id: userId || "not provided",
        file: selectedFile.name,
      });

      // Tăng timeout cho request để tránh lỗi network timeout
      const response = await axios.post(`${API_URL}/donate-book`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
        timeout: 30000, // 30 seconds timeout
      });

      console.log("Donation response:", response.data);

      if (response.status === 201) {
        Alert.alert("Thành công", "Cảm ơn bạn đã quyên góp sách!");
        setSelectedFile(null);
        setTitle("");
        fetchDonationsCount(); // Refresh count
      }
    } catch (error) {
      console.error("Error donating book:", error);
      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          (error.response?.data?.errors
            ? JSON.stringify(error.response.data.errors)
            : "Có lỗi xảy ra khi tải lên sách. Vui lòng thử lại.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Quyên Góp / Ủng Hộ",
          headerBackTitle: "Quay lại",
        }}
      />
      <ScrollView className="flex-1">
        <View>
          <Text className="text-center font-extrabold text-4xl mt-5">
            Donate Books
          </Text>
          <Text className="text-center text-gray-600 mt-2">
            Đã có {donationsCount} cuốn sách được quyên góp
          </Text>
        </View>

        {/* Donor information */}
        <View className="px-6 mt-6">
          <Text className="text-lg font-bold mb-4">
            Thông tin người quyên góp
          </Text>

          <Text className="text-gray-700 mb-1">Họ và tên</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-2 mb-3"
            value={name}
            onChangeText={setName}
            placeholder="Nhập họ và tên của bạn"
          />

          <Text className="text-gray-700 mb-1">Email</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-2 mb-3"
            value={email}
            onChangeText={setEmail}
            placeholder="Nhập địa chỉ email của bạn"
            keyboardType="email-address"
          />

          <Text className="text-gray-700 mb-1">Tiêu đề sách</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-2 mb-3"
            value={title}
            onChangeText={setTitle}
            placeholder="Nhập tiêu đề sách"
          />
        </View>

        <View className="items-center mt-4">
          <TouchableOpacity
            className="bg-purple-600 rounded-lg w-[240px] py-4"
            onPress={selectFile}
            disabled={loading}
          >
            <Text className="text-white text-xl font-bold text-center">
              Select Book File
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-center my-4 px-4">
          {selectedFile ? `Đã chọn: ${selectedFile.name}` : "Chưa chọn tệp nào"}
        </Text>

        <View className="items-center mb-6">
          {loading ? (
            <ActivityIndicator size="large" color="#8B5CF6" />
          ) : (
            <TouchableOpacity
              className={`rounded-lg py-4 w-[240px] ${
                selectedFile && name && email && title
                  ? "bg-purple-600"
                  : "bg-gray-400"
              }`}
              onPress={donateBook}
              disabled={!selectedFile || !name || !email || !title || loading}
            >
              <Text className="text-white text-xl font-bold text-center">
                Donate
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
