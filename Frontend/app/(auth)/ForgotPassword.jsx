import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import React, { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import authService from '../services/authService';

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setError('Vui lòng nhập email của bạn');
            return;
        }
        
        if (!validateEmail(email)) {
            setError('Email không hợp lệ');
            return;
        }
        
        setError('');
        setLoading(true);
        
        try {            
            const result = await authService.forgotPassword(email);
            
            setLoading(false);
            
            if (result.success) {
                Alert.alert(
                    'Thành công',
                    result.message,
                    [{ text: 'OK' }]
                );
            } else {
                setError(result.message || 'Có lỗi xảy ra, vui lòng thử lại sau');
            }
        } catch (error) {
            console.error('Lỗi quên mật khẩu:', error);
            setLoading(false);
            setError('Có lỗi xảy ra, vui lòng thử lại sau');
        }
    };

    return (
        <View className="flex-1 mt-10 px-5">
            <Stack.Screen
                options={{
                    title: 'Quên Mật Khẩu',
                    headerBackTitle: 'Quay lại',
                }}
            />
            
            <View className="mb-10">
                <Text className="text-2xl font-bold text-center mb-2">Quên mật khẩu?</Text>
                <Text className="text-center text-gray-500">
                    Nhập email của bạn và chúng tôi sẽ gửi cho bạn mật khẩu mới.
                </Text>
            </View>
            
            {error ? (
                <Text className="text-red-500 text-center mb-4">{error}</Text>
            ) : null}
            
            <Text className="text-gray-700 ml-2 text-lg font-bold mb-2">Email</Text>
            <View className="bg-gray-200 rounded-xl mb-6">
                <TextInput
                    className="p-4 text-gray-700"
                    placeholder="Nhập email của bạn"
                    placeholderTextColor="gray"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
            </View>
            
            <TouchableOpacity
                className={`bg-blue-400 py-4 rounded-xl mb-6 ${loading ? 'opacity-70' : ''}`}
                onPress={handleForgotPassword}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <Text className="text-center text-white font-bold text-lg">
                        Gửi Yêu Cầu
                    </Text>
                )}
            </TouchableOpacity>
            
            <TouchableOpacity 
                className="items-center"
                onPress={() => router.back()}
            >
                <Text className="text-gray-700 font-semibold">Quay lại</Text>
            </TouchableOpacity>
        </View>
    )
} 