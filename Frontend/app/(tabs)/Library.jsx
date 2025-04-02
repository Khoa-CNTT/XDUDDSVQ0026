import React from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Tính toán kích thước phù hợp
const { width } = Dimensions.get("window");
const THUMBNAIL_SIZE = 60; // Kích thước cố định cho hình thu nhỏ

export default function Library() {
  // Dữ liệu mẫu cho các sách
  const books = [
    {
      id: 1,
      title: "Hãy Nhớ Tên Anh Ấy",
      author: "Trần Hồng Quân",
      colors: ["#8e44ad", "#9b59b6", "#a569bd"], // Màu chính, phụ 1, phụ 2
      count: 5,
    },
    {
      id: 2,
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      colors: ["#6a5acd", "#8e7cc3", "#9c87de"], // Màu tím xanh
      count: 49,
    },
    {
      id: 3,
      title: "Đắc Nhân Tâm",
      author: "Dale Carnegie",
      colors: ["#2ecc71", "#27ae60", "#16a085"], // Màu xanh lá
      count: 12,
    },
    {
      id: 4,
      title: "Các Yếu Tố Lãnh Đạo Thành Công",
      author: "John Maxwell",
      colors: ["#3949ab", "#5c6bc0", "#7986cb"], // Màu xanh đậm
      count: 5,
    },
  ];

  // Xử lý thêm sách từ thiết bị
  const handleAddBooks = () => {
    // Xử lý logic thêm sách từ thiết bị ở đây
    console.log("Adding books from device");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 px-4">
        {/* Book list */}
        <FlatList
          data={books}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item: book }) => (
            <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
              {/* Stacked Book Thumbnails */}
              <View
                style={{
                  width: THUMBNAIL_SIZE + 25,
                  height: THUMBNAIL_SIZE,
                  marginRight: 14,
                }}
              >
                {/* Third book */}
                <View
                  style={{
                    position: "absolute",
                    left: 20,
                    top: 4,
                    width: THUMBNAIL_SIZE - 16,
                    height: THUMBNAIL_SIZE - 16,
                    backgroundColor: book.colors[2],
                    borderRadius: 8,
                    borderWidth: 0.5,
                    borderColor: "rgba(255,255,255,0.2)",
                    transform: [{ rotate: "-12deg" }],
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 1.5,
                    elevation: 1,
                  }}
                />

                {/* Middle book */}
                <View
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 2,
                    width: THUMBNAIL_SIZE - 8,
                    height: THUMBNAIL_SIZE - 8,
                    backgroundColor: book.colors[1],
                    borderRadius: 8,
                    borderWidth: 0.5,
                    borderColor: "rgba(255,255,255,0.3)",
                    transform: [{ rotate: "-6deg" }],
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.25,
                    shadowRadius: 2.22,
                    elevation: 2,
                    zIndex: 1,
                  }}
                />

                {/* Foreground book */}
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: THUMBNAIL_SIZE,
                    height: THUMBNAIL_SIZE,
                    backgroundColor: book.colors[0],
                    borderRadius: 8,
                    padding: 8,
                    justifyContent: "space-between",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.23,
                    shadowRadius: 2.62,
                    elevation: 3,
                    zIndex: 2,
                  }}
                >
                  {/* Icon in white circle */}
                  <View className="bg-white w-7 h-7 rounded-full items-center justify-center">
                    <Ionicons name="add" size={18} color={book.colors[0]} />
                  </View>

                  {/* "Sách" text at bottom */}
                  <Text className="text-white text-xs font-medium">Sách</Text>
                </View>
              </View>

              {/* Title and author */}
              <View className="flex-1">
                <Text className="text-base font-medium">{book.title}</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {book.author}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  {book.count} sách
                </Text>
              </View>

              {/* More options */}
              <TouchableOpacity className="p-2">
                <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListFooterComponent={() => (
            <Text className="text-center text-gray-500 my-8 text-xs">
              {books.length} bộ sách
            </Text>
          )}
          ListHeaderComponent={() => (
            <View>
              <Text className="text-4xl font-bold mb-8">Thư Viện</Text>
        <View className="border-b border-gray-200 " />

        {/* Add from device menu */}
        <TouchableOpacity
          onPress={handleAddBooks}
          className="flex-row items-center justify-between py-4 border-b border-gray-200"
        >
          <View className="flex-row items-center justify-center ">
            <Ionicons name="add-circle-outline" size={25} color="#666" />
            <Text className="text-xl ml-4 ">Thêm từ thiết bị</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
