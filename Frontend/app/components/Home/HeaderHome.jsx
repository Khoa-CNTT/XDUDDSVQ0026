import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRouter } from 'expo-router';

const HeaderHome = () => (
    <>
      {/* Header with improved styling */}
      <View className="flex-row justify-between items-center px-5 pt-6 pb-4">
        <Text className="text-3xl font-bold text-gray-800 tracking-tight">Trang Chủ</Text>
        <View className="flex-row">
          <TouchableOpacity className="mr-4 bg-gray-100 rounded-full p-2">
            <Ionicons name="ellipsis-horizontal-circle-outline" size={22} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-gray-100 rounded-full p-2">
            <Ionicons name="person-circle-outline" size={22} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
  
export default HeaderHome;



