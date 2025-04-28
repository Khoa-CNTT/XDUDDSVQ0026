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
  Modal,
} from "react-native";
import AntDesign from '@expo/vector-icons/AntDesign';
import React, { useState, useEffect } from "react";
import { Ionicons } from '@expo/vector-icons';
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
  const [isSecureTextEntry, setIsSecureTextEntry] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [previousUser, setPreviousUser] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }
  
    try {
      setLoading(true);
      // Use authService for login instead of direct fetch
      const deviceName = Platform.OS === 'ios' ? 
                        'iPhone' : 
                        Platform.OS === 'android' ? 
                        'Android Device' : 
                        'Web Browser';
      
      const result = await authService.login(email, password, deviceName);
      
      if (result.success) {
        console.log('Đăng nhập thành công!');
        Alert.alert('Thành công', result.message, [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)/Home')
          }
        ]);
      } else {
        Alert.alert('Lỗi đăng nhập', result.message || 'Email hoặc mật khẩu không chính xác');
      }
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      Alert.alert('Lỗi đăng nhập', error.message || 'Đã xảy ra lỗi khi đăng nhập');
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

  const handleAutoLogin = async () => {
    try {
      setLoading(true);
      const loginInfo = await authService.getPreviousLoginInfo();
      
      if (loginInfo.hasLogin) {
        console.log('Đăng nhập tự động thành công!');
        // Chuyển hướng đến trang Home
        router.push('/(tabs)/Home');
      } else {
        Alert.alert('Lỗi đăng nhập', 'Không tìm thấy thông tin đăng nhập');
      }
    } catch (error) {
      console.error('Error during auto login:', error);
      Alert.alert('Lỗi đăng nhập', 'Có lỗi xảy ra khi đăng nhập tự động');
    } finally {
      setLoading(false);
      setShowLoginModal(false);
    }
  };

  // Kiểm tra token hiện tại và chuyển hướng nếu đã đăng nhập
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        console.log('Checking previous login info...');
        // Kiểm tra thông tin đăng nhập trước đó
        const previousLoginInfo = await authService.getPreviousLoginInfo();
        console.log('Previous login info:', previousLoginInfo);
        
        if (previousLoginInfo.hasLogin) {
          // Hiển thị modal xác nhận đăng nhập
          console.log('Setting previous user:', previousLoginInfo.user);
          setPreviousUser(previousLoginInfo.user);
          console.log('Setting showLoginModal to true');
          setShowLoginModal(true);
          console.log('Modal should be visible now');
        } else {
          // Không có thông tin đăng nhập trước đó, không làm gì cả
          console.log('No previous login found');
        }
      } catch (error) {
        console.error('Error checking previous login:', error);
        // Xóa token để đảm bảo an toàn
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
    };
    
    console.log('Running checkLoginStatus useEffect');
    checkLoginStatus();
  }, []);

  // Add an effect to monitor modal state changes
  useEffect(() => {
    console.log('Modal visible state changed:', showLoginModal);
  }, [showLoginModal]);

  return (
    <>
      {/* Login Modal - Outside main view to ensure visibility */}
      {showLoginModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          onRequestClose={() => {
            console.log('Modal closed by system back');
            setShowLoginModal(false);
          }}
        >
          <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View className="bg-white p-5 rounded-2xl w-4/5 items-center" style={{ elevation: 10 }}>
              <Text className="text-xl font-bold text-center mb-4">Xin chào!</Text>
              <Text className="text-center mb-6">
                Bạn muốn đăng nhập vào tài khoản {previousUser?.name || previousUser?.email || 'đã lưu'} tiếp tục?
              </Text>
              
              <View className="flex-row w-full justify-around">
                <TouchableOpacity 
                  className="bg-gray-200 py-2 px-6 rounded-xl"
                  onPress={() => {
                    console.log('User pressed Decline');
                    setShowLoginModal(false);
                  }}
                >
                  <Text className="font-semibold">Từ chối</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="bg-yellow-400 py-2 px-6 rounded-xl"
                  onPress={() => {
                    console.log('User pressed Accept');
                    handleAutoLogin();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#4B5563" />
                  ) : (
                    <Text className="font-semibold">Đồng ý</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Main Login Screen */}
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
            <View className="flex-row rounded-2xl items-center mb-4">
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

            <View className="flex-row justify-center mt-5">
              <Text className="text-xl">bạn chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/SignUp")}>
                <Text className="font-semibold text-yellow-400 text-xl">Đăng Ký</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}
