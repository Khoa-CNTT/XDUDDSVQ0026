import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import AntDesign from '@expo/vector-icons/AntDesign';
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import authService from '../services/authService';

export default function LogIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }
  
    try {
      setLoading(true);
      const result = await authService.login(email, password);
      
      if (result.success) {
        console.log('Đăng nhập thành công, token đã được lưu');
        router.replace('/(tabs)/Home');
      } else {
        Alert.alert('Đăng nhập thất bại', result.message || 'Vui lòng kiểm tra lại thông tin đăng nhập');
      }
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      Alert.alert('Lỗi', 'Không thể đăng nhập. Vui lòng thử lại sau.');
      // Xóa token nếu có lỗi
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    Alert.alert(
      'Thông báo',
      'Đăng nhập bằng Google hiện không khả dụng trong Expo Go. Vui lòng sử dụng email và mật khẩu.',
      [{ text: 'OK' }]
    );
  };

  // Kiểm tra token hiện tại và chuyển hướng nếu đã đăng nhập
  useEffect(() => {
    const checkToken = async () => {
      try {
        const authStatus = await authService.checkAuthStatus();
        console.log('Auth status:', authStatus);
        if (authStatus.isLoggedIn) {
          router.push('/(tabs)/Home');
        }
      } catch (error) {
        console.error('Error checking token:', error);
        // Xóa token để đảm bảo an toàn
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
    };
    
    checkToken();
  }, []);

  return (
    <View className="flex-1 bg-white" style={{ backgroundColor: "#4169e1" }}>
      <SafeAreaView className="flex">
        <View className="flex-row justify-start mt-3">
          <TouchableOpacity 
          onPress={() => router.push('Landing')}
          className="bg-yellow-400 p-2 rounded-tr-2xl ml-5 rounded-bl-2xl">
            <AntDesign name="back" size={24} color="black" />
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-center">
          <Image
            source={require("../../assets/images/login.png")}
            className="w-64 h-64"
          />
        </View>
      </SafeAreaView>
      <View
        className="flex-1 bg-white px-8 pt-4"
        style={{ borderTopLeftRadius: 50, borderTopRightRadius: 50 }}
      >
        <View className="form space-y-2 gap-3 pt-3">
          <Text className="text-gray-700 ml-4">Email</Text>
          <TextInput
            className="p-4 bg-gray-100 text-gray-700 rounded-2xl mb-3"
            placeholder="Nhập Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text className="text-gray-700 ml-4">Mật Khẩu</Text>
          <TextInput
            className="p-4 bg-gray-100 text-gray-700 rounded-2xl"
            placeholder="Nhập Mật Khẩu"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity className="flex items-end mb-5">
            <Text className="text-gray-700 mt-2">Quên mật khẩu ?</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="bg-yellow-400 py-3 mt-3 rounded-xl"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#4B5563" />
            ) : (
              <Text className="text-center text-gray-700 font-bold text-xl">
                Đăng Nhập
              </Text>
            )}
          </TouchableOpacity>
          
          <View className="flex-row justify-center mt-48">
            <Text className="text-xl ">bạn chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/SignUp")}>
              <Text className="font-semibold text-yellow-400 text-xl">Đăng Ký</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
