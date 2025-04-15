import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRouter } from 'expo-router';

const HeaderHome = () => {
  const router = useRouter();

  return (
    <View className="flex-row flex-1 justify-between items-center px-4 mb-8">
      <Text className="text-4xl font-bold">Trang Chủ</Text>
      <View className="flex-row">
        <TouchableOpacity onPress={() => router.push('/screen/Profile')}>
          <Image source={require("../../../assets/images/profile.png")}
            className="w-[30px] h-[30px] rounded-full"
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HeaderHome;
