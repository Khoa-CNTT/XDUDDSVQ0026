import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import React, { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import authService from '../services/authService';

export default function ChangePassword() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSecureTextEntry1, setIsSecureTextEntry1] = useState(true);
    const [isSecureTextEntry2, setIsSecureTextEntry2] = useState(true);
    const [isSecureTextEntry3, setIsSecureTextEntry3] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const validateForm = () => {
        if (!currentPassword.trim()) {
            setError('Vui lòng nhập mật khẩu hiện tại');
            return false;
        }
        if (!newPassword.trim()) {
            setError('Vui lòng nhập mật khẩu mới');
            return false;
        }
        if (newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự');
            return false;
        }
        if (newPassword === currentPassword) {
            setError('Mật khẩu mới phải khác mật khẩu hiện tại');
            return false;
        }
        if (confirmPassword !== newPassword) {
            setError('Xác nhận mật khẩu không khớp');
            return false;
        }
        setError('');
        return true;
    };

    const handleChangePassword = async () => {
        if (!validateForm()) return;
        
        setLoading(true);
        try {
            const result = await authService.changePassword(
                currentPassword,
                newPassword,
                confirmPassword
            );
            
            if (result.success) {
                Alert.alert('Thành công', result.message, [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                setError(result.message);
            }
        } catch (error) {
            setError('Có lỗi xảy ra: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        router.push('../(auth)/ForgotPassword');
    };
    
    return (
        <View className="flex-1 mt-10 gap-y-3 mx-5">
            <Stack.Screen
                options={{
                    title: 'Đổi Mật Khẩu',
                    headerBackTitle: 'Quay lại',
                }}
            />
            {error ? (
                <Text className="text-red-500 text-center mb-2">{error}</Text>
            ) : null}
            
            <Text className="text-gray-700 ml-4 text-2xl font-bold ">Mật khẩu hiện tại</Text>
            <View className="flex-row bg-gray-200 rounded-2xl items-center mb-4 px-2">
                <TextInput
                    className="flex-1 p-4 text-gray-700 rounded-2xl"
                    placeholder="Nhập mật khẩu hiện tại"
                    placeholderTextColor="black"
                    returnKeyType="done"
                    secureTextEntry={isSecureTextEntry1}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                />
                <TouchableOpacity
                    className="px-3 py-2"
                    onPress={() => setIsSecureTextEntry1(!isSecureTextEntry1)}
                >
                    <Text className="text-black font-medium">
                        {isSecureTextEntry1 ? <Ionicons name="eye" size={24} /> : <Ionicons name="eye-off" size={24} />}
                    </Text>
                </TouchableOpacity>
            </View>
            <Text className="text-gray-700 ml-4 text-2xl font-bold ">Mật khẩu mới</Text>
            <View className="flex-row bg-gray-200 rounded-2xl items-center mb-4 px-2">
                <TextInput
                    className="flex-1 p-4 text-gray-700  rounded-2xl"
                    placeholder="Nhập mật khẩu mới"
                    placeholderTextColor="black"
                    returnKeyType="done"
                    secureTextEntry={isSecureTextEntry2}
                    value={newPassword}
                    onChangeText={setNewPassword}
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
            <Text className="text-gray-700 ml-4 text-2xl font-bold ">Nhập lại mật khẩu mới</Text>
            <View className="flex-row bg-gray-200 rounded-2xl items-center mb-4 px-2">
                <TextInput
                    className="flex-1 p-4 text-gray-700 rounded-2xl"
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor="black"
                    returnKeyType="done"
                    secureTextEntry={isSecureTextEntry3}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                    className="px-3 py-2"
                    onPress={() => setIsSecureTextEntry3(!isSecureTextEntry3)}
                >
                    <Text className="text-black font-medium">
                        {isSecureTextEntry3 ? <Ionicons name="eye" size={24} /> : <Ionicons name="eye-off" size={24} />}
                    </Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity className="flex items-end my-5" onPress={handleForgotPassword}>
                <Text className="text-gray-700 font-xl">Quên mật khẩu ?</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                className={`bg-blue-400 py-3 mt-3 rounded-xl ${loading ? 'opacity-70' : ''}`}
                onPress={handleChangePassword}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <Text className="text-center text-black font-bold text-xl">
                        Đổi Mật Khẩu
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    )
}