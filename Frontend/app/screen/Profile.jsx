import { View, Text, SafeAreaView, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Stack } from 'expo-router'
import { Feather, FontAwesome,MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authService from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Profile() {
    const router = useRouter();
    const [userName, setUserName] = useState('User');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch user info when component mounts
        const getUserInfo = async () => {
            const user = await authService.getUserInfo();
            if (user && user.name) {
                setUserName(user.name);
            } else if (user && user.name_user) {
                setUserName(user.name_user);
            }
        };
        getUserInfo();
    }, []);

    const handleLogout = async () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất?',
            [
                {
                    text: 'Hủy',
                    style: 'cancel',
                },
                {
                    text: 'Đăng xuất',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const result = await authService.logout();
                            if (result.success) {
                                // Clear all stored data
                                await AsyncStorage.removeItem('token');
                                await AsyncStorage.removeItem('user');
                                // Navigate to landing page
                                router.replace('Landing');
                            } else {
                                Alert.alert('Thông báo', result.message || 'Đăng xuất không thành công');
                            }
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Lỗi', 'Có lỗi xảy ra khi đăng xuất');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView>
            <Stack.Screen
                options={{
                    title: 'Cài Đặt',
                    headerBackTitle: 'Quay lại',
                }}
            />

            <View className="items-center">
                <Image
                    source={require('../../assets/images/profile.png')}
                    className="w-[100px] h-[100px] rounded-full mt-6"
                    resizeMode="cover"
                />
                <Text className="text-black mt-4 text-3xl font-semibold">{userName}</Text>
            </View>
            <View className="mt-6 bg-gray-50">
                <TouchableOpacity className="flex-row items-center px-5 gap-x-6 pt-5"
                    onPress={() => router.push('../screen/Charity')}
                >
                    <MaterialCommunityIcons name="charity" size={22} color="#000000" />
                    <Text className="text-2xl font-light text-black">Quyên Góp / Ủng Hộ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-row items-center px-5 pt-5 gap-x-6"
                    onPress={handleLogout}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#0891b2" />
                    ) : (
                        <Feather name="log-out" size={22} color="#000000" />
                    )}
                    <Text className="text-2xl font-light text-black">Đăng Xuất</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center px-5 py-5 gap-x-6"
                    onPress={() => router.push('../(auth)/ChangePassword')}
                >
                    <FontAwesome name="exchange" size={22} color="#000000" />
                    <Text className="text-2xl font-light text-black">Đổi Mật Khẩu</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}