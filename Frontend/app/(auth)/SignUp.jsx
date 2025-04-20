import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import AntDesign from '@expo/vector-icons/AntDesign';
import React, { useState } from "react";
import { useRouter } from "expo-router";
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

export default function SignUp() {
  const router = useRouter();
  const [name_user, setName_user] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSecureTextEntry, setIsSecureTextEntry] = useState(true);
  const [isSecureTextEntry2, setIsSecureTextEntry2] = useState(true);

  const handleSignUp = async () => {
    if (email === '' || password === '' || name_user === '') {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('https://refined-true-macaw.ngrok-free.app/api/dang-ky', {
        name_user: name_user,
        email: email,
        password: password,
      });
      
      console.log('Response:', response.data);
      
      if (response.data.status) {
        console.log('Đăng ký thành công:', email);
        Alert.alert('Thành công', response.data.message || 'Đã đăng ký thành công!', [
          {
            text: 'OK',
            onPress: () => router.push('/(auth)/LogIn')
          }
        ]);
      } else {
        // Hiển thị thông báo lỗi từ backend
        Alert.alert('Lỗi', response.data.message || 'Đăng ký thất bại');
      }
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      
      // Xử lý lỗi từ API
      if (error.response) {
        // Nếu server trả về lỗi với status code
        const errorMessage = error.response.data.message || 'Đã xảy ra lỗi khi đăng ký';
        Alert.alert('Lỗi đăng ký', errorMessage);
        
        // Log chi tiết lỗi nếu có
        if (error.response.data.errors) {
          console.log('Validation errors:', error.response.data.errors);
        }
      } else if (error.request) {
        // Nếu request được gửi nhưng không nhận được response
        Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
      } else {
        // Lỗi khác
        Alert.alert('Lỗi', 'Đã xảy ra lỗi không xác định');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#4169e1" }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
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
              source={require("../../assets/images/signup.png")}
              className="w-64 h-64"
            />
          </View>
        </SafeAreaView>
        <View
          className="flex-1 bg-white px-8 pt-4"
          style={{ borderTopLeftRadius: 50, borderTopRightRadius: 50 }}
        >
          <View className="form space-y-2 gap-3 pt-3">
            <Text className="text-gray-700 ml-4">Họ và Tên</Text>
            <TextInput
              className="p-4 bg-gray-100 text-gray-700 rounded-2xl mb-3"
              placeholder="Nhập Họ và Tên"
              value={name_user}
              onChangeText={setName_user}
            />
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
            <Text className="text-gray-700 ml-4">Nhập Lại Mật Khẩu</Text>
                      <View className="flex-row  rounded-2xl items-center mb-4">
                        <TextInput
                          className="flex-1 p-4 bg-gray-100 text-gray-700 rounded-2xl"
                          placeholder="Nhập Lại Mật Khẩu"
                          secureTextEntry={isSecureTextEntry2}
                          value={password}
                          onChangeText={setPassword}
                        />
                        <TouchableOpacity
                          className="px-3 py-2"
                          onPress={() => setIsSecureTextEntry2(!isSecureTextEntry2)}
                        >
                          <Text className="text-black font-medium">
                            {isSecureTextEntry2 ? <Ionicons name="eye" size={24} /> : <Ionicons name="eye-off" size={24} />}
                          </Text>
                        </TouchableOpacity>
                      </View>
            
            <TouchableOpacity 
              className="bg-yellow-400 py-3 mt-5 rounded-xl"
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#4B5563" />
              ) : (
                <Text className="text-center text-gray-700 font-bold text-xl">
                  Đăng Ký
                </Text>
              )}
            </TouchableOpacity>
            <View className="flex-row justify-center mt-5 mb-5">
              <Text className="text-xl">Bạn đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/LogIn")}>
                <Text className="font-semibold text-yellow-400 text-xl">Đăng Nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
