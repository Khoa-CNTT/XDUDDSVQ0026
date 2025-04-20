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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LogIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isSecureTextEntry, setIsSecureTextEntry] = useState(true);

  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      // Cập nhật URL Ngrok cố định
      const API_URL = 'https://refined-true-macaw.ngrok-free.app/api/dang-nhap';

      console.log('Connecting to:', API_URL);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      // Kiểm tra response trước khi parse JSON
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Lỗi kết nối đến server. Vui lòng thử lại sau.');
      }

      console.log('Response data:', data);

      if (!data.status) {
        // Xử lý trường hợp đăng nhập thất bại
        throw new Error(data.message || 'Email hoặc mật khẩu không chính xác');
      }

      // Lưu tên người dùng nếu có
      if (data.name_user) {
        await AsyncStorage.setItem('name', data.name_user);
      }

      // Lưu token nếu có
      if (data.token) {
        await AsyncStorage.setItem('authToken', data.token);
      }

      console.log('Đăng nhập thành công!');
      Alert.alert('Thành công', data.message, [
        {
          text: 'OK',
          onPress: () => router.push('/(tabs)/Home')
        }
      ]);
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);

      // Thông báo lỗi cho người dùng
      let errorMessage = 'Đã xảy ra lỗi khi đăng nhập';
      if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Lỗi đăng nhập', errorMessage);
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
          <View className="flex-row  rounded-2xl items-center mb-4">
            <TextInput
              className="flex-1 p-4 bg-gray-100 text-gray-700 rounded-2xl"
              placeholder="Nhập Mật Khẩu"
              secureTextEntry={isSecureTextEntry}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              className="px-3 py-2"
              onPress={() => setIsSecureTextEntry(!isSecureTextEntry)}
            >
              <Text className="text-black font-medium">
                {isSecureTextEntry ? <Ionicons name="eye" size={24} /> : <Ionicons name="eye-off" size={24} />}
              </Text>
            </TouchableOpacity>
          </View>
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
