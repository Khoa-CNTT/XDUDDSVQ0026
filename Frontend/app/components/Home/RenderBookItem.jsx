import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

const RenderBookItem = ({ item }) => (
    <TouchableOpacity
      className="w-[120px] mr-4"
      onPress={() => {
        if (item.file_path) {
          router.push({
            pathname: '/PdfViewer',
            params: { pdfPath: item.file_path, pdfTitle: item.title || item.name_book }
          });
        } else {
          router.push(`/Books/${item.id || item.book_id}`);
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
        numberOfLines={2}
      >
        {item.title || item.name_book}
      </Text>
      <Text className="text-gray-500 text-xs">{item.author}</Text>
    </TouchableOpacity>
  );
  export default RenderBookItem;