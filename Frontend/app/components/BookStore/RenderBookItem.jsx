import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const RenderBookItem = React.memo(
  ({ item, onPress }) => {
    const [readingProgress, setReadingProgress] = useState(0);
    const isMountedRef = useRef(true);
    const intervalRef = useRef(null);
    const lastCheckedRef = useRef(null);

    // Tách hàm getReadingProgress ra để tái sử dụng
    const getReadingProgress = useCallback(async () => {
      try {
        if (!isMountedRef.current) return;

        const key = `pdf_progress_${item.id || item.book_id}`;
        const progress = await AsyncStorage.getItem(key);

        if (progress && isMountedRef.current) {
          const progressData = JSON.parse(progress);
          if (progressData.percentage) {
            setReadingProgress(progressData.percentage);
          }
        }
      } catch (error) {
        console.error("Error loading reading progress:", error);
      }
    }, [item.id, item.book_id]);

    useEffect(() => {
      // console.log(`📱 RenderBookItem mounted for book: ${item.id || item.book_id}`);
      isMountedRef.current = true;

      // Load initial progress
      getReadingProgress();

      // Thiết lập interval với tham chiếu để có thể dọn dẹp
      intervalRef.current = setInterval(async () => {
        if (!isMountedRef.current) return;

        try {
          const lastUpdate = await AsyncStorage.getItem(
            "reading_progress_updated"
          );
          if (lastUpdate && lastUpdate !== lastCheckedRef.current) {
            // console.log(`📱 Progress updated for book: ${item.id || item.book_id}`);
            lastCheckedRef.current = lastUpdate;
            await getReadingProgress();
          }
        } catch (error) {
          if (isMountedRef.current) {
            console.error("Error checking for progress updates:", error);
          }
        }
      }, 30000); // Tăng interval lên 30 giây để giảm số lần check

      return () => {
        // console.log(`📱 RenderBookItem unmounting for book: ${item.id || item.book_id}`);
        isMountedRef.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [getReadingProgress, item.id, item.book_id]);

    // Xử lý xóa tiến trình đọc sách
    const handleDeleteProgress = async () => {
      const bookId = item.id || item.book_id;
      try {
        Alert.alert(
          "Xóa tiến trình đọc sách",
          "Bạn có chắc chắn muốn xóa tiến trình đọc sách này?",
          [
            {
              text: "Hủy",
              style: "cancel",
            },
            {
              text: "Xóa",
              style: "destructive",
              onPress: async () => {
                try {
                  const key = `pdf_progress_${bookId}`;
                  await AsyncStorage.removeItem(key);
                  setReadingProgress(0);
                  Alert.alert("Thành công", "Đã xóa tiến trình đọc sách");
                } catch (error) {
                  console.error("Error deleting reading progress:", error);
                  Alert.alert("Lỗi", "Không thể xóa tiến trình đọc sách");
                }
              },
            },
          ]
        );
      } catch (error) {
        console.error("Error showing delete dialog:", error);
      }
    };

    // Hàm loại bỏ khoảng trắng
    const removeWhitespace = (str) => {
      if (!str) return "";
      return str.replace(/\s+/g, "");
    };

    // Xử lý ảnh bìa sách
    const renderBookCover = () => {
      if (!item.image) {
        // Nếu không có ảnh
        return (
          <View className="w-full h-[200px] justify-center items-center bg-gray-100">
            <Ionicons name="book-outline" size={32} color="#999" />
            <Text className="mt-2 text-xs text-gray-500">Không có ảnh</Text>
          </View>
        );
      }

      if (typeof item.image === "string") {
        // Nếu là đường dẫn URL
        return (
          <Image
            source={{ uri: item.image }}
            className="w-full h-[200px]"
            resizeMode="cover"
            defaultSource={require("../../../assets/images/bia1.png")}
          />
        );
      } else {
        // Nếu là local image (require)
        return (
          <Image
            source={item.image}
            className="w-full h-[200px]"
            resizeMode="cover"
          />
        );
      }
    };

    const handlePress = () => {
      if (onPress) {
        onPress(item);
      } else {
        // Luôn chuyển đến trang chi tiết sách, không còn kiểm tra file_path
        router.push(`/Books/${item.id || item.book_id}`);
      }
    };

    // Xử lý tiêu đề sách - loại bỏ khoảng trắng nếu cần
    const bookTitle = item.title || item.name_book || "Sách không tiêu đề";
    // ID sách không khoảng trắng để sử dụng làm id
    const bookIdNoSpace = removeWhitespace(item.id || item.book_id || "");

    return (
      <TouchableOpacity
        className="w-[170px] mx-1 mb-3 rounded-lg bg-white overflow-hidden"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
          height: 290, // Set fixed total height
        }}
        onPress={handlePress}
        onLongPress={readingProgress > 0 ? handleDeleteProgress : null}
        delayLongPress={800}
        activeOpacity={0.7}
      >
        <View className="relative">
          {renderBookCover()}

          {item.price && item.price.includes("Miễn phí") && (
            <View className="absolute top-2 right-2 bg-green-500 px-1.5 py-0.5 rounded-md">
              <Text className="text-white text-[10px] font-bold">Free</Text>
            </View>
          )}

          {readingProgress > 0 && (
            <View className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-1.5">
              <View className="h-1 bg-white/30 rounded-full overflow-hidden">
                <View
                  className="h-full bg-blue-500"
                  style={{ width: `${readingProgress}%` }}
                />
              </View>

              {readingProgress >= 5 && (
                <Text className="text-white text-[9px] text-center mt-0.5">
                  {Math.round(readingProgress)}%
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 90 }} className="p-2.5 justify-between">
          <View>
            <Text
              className="text-sm font-semibold text-gray-800 leading-tight"
              numberOfLines={2}
              style={{ minHeight: 40 }}
            >
              {bookTitle}
            </Text>
            <Text className="text-xs text-gray-500" numberOfLines={1}>
              {item.author || "Không rõ tác giả"}
            </Text>
          </View>

          {item.price && (
            <View className="mt-2 w-full flex items-end">
              <Text className="text-xs font-bold text-red-500">
                {item.price}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Shallow compare item properties that matter for rendering
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.item.name_book === nextProps.item.name_book &&
      prevProps.item.image === nextProps.item.image &&
      prevProps.item.price === nextProps.item.price
    );
  }
);

export default RenderBookItem;
