import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRouter } from 'expo-router';
const HeaderHome = () => (
    <>
      {/* Header with additional top padding */}
      <View className="flex-row flex-1 justify-between items-center px-4 mb-8">
        <Text className="text-4xl font-bold">Trang Chủ</Text>
        <View className="flex-row">
          <TouchableOpacity className="mr-4">
            <Ionicons name="ellipsis-horizontal-circle-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="person-circle-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
export default HeaderHome;



