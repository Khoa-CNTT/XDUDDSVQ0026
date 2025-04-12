import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { router } from 'expo-router';


const RenderBookItem = ({ item }) => (
    <TouchableOpacity key={item.id} className="mr-4 w-32"
      onPress={() => router.push(`/Books/${item.id}`)}
    >
      <View className="bg-gray-100 rounded-lg overflow-hidden h-48 mb-2">
        <Image
          source={item.image}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
      <View className="flex-row mb-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= item.rating ? "star" : "star-outline"}
            size={14}
            color="#FFD700"
          />
        ))}
      </View>
      <Text className="font-bold" numberOfLines={1} ellipsizeMode="tail">
        {item.title.length > 10 ? item.title.substring(0, 10) + '...' : item.title}
      </Text>
      <Text className="text-gray-500 text-sm" numberOfLines={1} ellipsizeMode="tail">{item.author}</Text>
      <View className="h-8 justify-end">
        <Text className="text-purple-600 font-bold">{item.price}</Text>
      </View>
    </TouchableOpacity>
  );
  export default RenderBookItem;