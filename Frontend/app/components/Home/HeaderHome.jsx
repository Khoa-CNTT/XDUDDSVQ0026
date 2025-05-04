import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HeaderHome = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Get user data from AsyncStorage
    const getUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setUsername(user.name || 'Người dùng');
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      }
    };

    getUserData();
  }, []);

  return (
    <View className="pt-2 pb-4 px-4">
      <View className="flex-row justify-between items-center mb-2">
        <View>
          
          <Text className="text-4xl font-bold">Home</Text>
        </View>
        <TouchableOpacity 
          className="bg-gray-100 w-10 h-10 rounded-full justify-center items-center"
          onPress={() => router.push('/screen/Profile')}
        >
          <Icon name="person" size={24} color="#0064e1" />
        </TouchableOpacity>
      </View>
      
      <View className="flex-row mt-4">
        <TouchableOpacity 
          className="bg-blue-50 flex-1 mr-2 rounded-xl p-4 border border-blue-100"
          onPress={() => router.push('/screen/Library')}
        >
          <Icon name="menu-book" size={24} color="#0064e1" />
          <Text className="font-semibold mt-2">Thư viện</Text>
          <Text className="text-xs text-gray-500 mt-1">Tất cả tài liệu của bạn</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="bg-purple-50 flex-1 ml-2 rounded-xl p-4 border border-purple-100"
          onPress={() => router.push('/screen/Explore')}
        >
          <Icon name="explore" size={24} color="#8b5cf6" />
          <Text className="font-semibold mt-2">Khám phá</Text>
          <Text className="text-xs text-gray-500 mt-1">Tìm tài liệu mới</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HeaderHome;
