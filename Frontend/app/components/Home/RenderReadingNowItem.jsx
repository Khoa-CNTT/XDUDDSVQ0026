import React from 'react';
import { Image, TouchableOpacity, Dimensions } from 'react-native';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
const screenWidth = Dimensions.get('window').width;
const SPACING = 16;
const ITEM_WIDTH = (screenWidth - SPACING * 3) / 2;
const IMAGE_HEIGHT = ITEM_WIDTH * 1.5; // Tỷ lệ khung hình đẹp hơn cho sách


const RenderReadingNowItem = ({ item }) => (
  <TouchableOpacity
    className="mb-6"
    style={{ width: ITEM_WIDTH }}
    onPress={() => router.push(`/screen/${item.id}`)}
  >
    {item.image ? (
      <Image
        source={item.image}
        className="rounded-lg mb-2 shadow-md"
        style={{ width: ITEM_WIDTH, height: IMAGE_HEIGHT }}
        resizeMode="cover"
      />
    ) : (
      <View
        className="rounded-lg mb-2 shadow-md bg-gray-200 justify-center items-center"
        style={{ width: ITEM_WIDTH, height: IMAGE_HEIGHT }}
      >
        <Text className="text-gray-500 font-medium">No Image</Text>
      </View>
    )}
   
    <View className="px-1">
      <Text
        className="font-semibold text-sm mb-1"
        numberOfLines={2}
      >
        {item.title}
      </Text>
     
      <Text className="text-gray-500 text-xs mb-1" numberOfLines={1}>
        {item.author}
      </Text>
     
      {item.progress !== undefined && (
        <View className="flex-row items-center mt-1 mb-1">
          <View className="h-1 bg-gray-200 rounded-full w-full overflow-hidden">
            <View
              className="h-1 bg-blue-500 rounded-full"
              style={{ width: `${item.progress || 0}%` }}
            />
          </View>
          <Text className="text-gray-400 text-xs mt-1">
            {item.progress || 0}%
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);


export default RenderReadingNowItem;



