import { View, Text, SafeAreaView, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Stack } from 'expo-router'
import { Feather, FontAwesome, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authService from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Profile() {
    const router = useRouter();
    const [userName, setUserName] = useState('User');
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        // Fetch user info when component mounts
        getUserInfo();
    }, []);

    const getUserInfo = async () => {
        const user = await authService.getUserInfo();
        if (user && user.name) {
            setUserName(user.name);
            setNewName(user.name);
        } else if (user && user.name_user) {
            setUserName(user.name_user);
            setNewName(user.name_user);
        }
    };

    const handleUpdateName = async () => {
        if (!newName.trim()) {
            Alert.alert('Thông báo', 'Tên không được để trống');
            return;
        }

        setLoading(true);
        try {
            const result = await authService.updateUserInfo({ name_user: newName.trim() });
            if (result.success) {
                setUserName(newName.trim());
                setIsEditing(false);
                Alert.alert('Thành công', 'Đã cập nhật tên thành công');
                // Refresh user info from server
                getUserInfo();
            } else {
                Alert.alert('Thông báo', result.message || 'Cập nhật không thành công');
            }
        } catch (error) {
            console.error('Update name error:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi cập nhật tên');
        } finally {
            setLoading(false);
        }
    };

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
                
                {isEditing ? (
                    <View className="flex-row items-center mt-4">
                        <TextInput 
                            className="text-black text-2xl font-semibold border-b border-gray-400 px-2 py-1 min-w-[200px] text-center"
                            value={newName}
                            onChangeText={setNewName}
                            autoFocus
                        />
                        {loading ? (
                            <ActivityIndicator size="small" color="#0891b2" className="ml-2" />
                        ) : (
                            <View className="flex-row">
                                <TouchableOpacity onPress={handleUpdateName} className="ml-2">
                                    <AntDesign name="check" size={24} color="green" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => {
                                    setIsEditing(false);
                                    setNewName(userName);
                                }} className="ml-2">
                                    <AntDesign name="close" size={24} color="red" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ) : (
                    <View className="flex-row items-center mt-4">
                        <Text className="text-black text-3xl font-semibold">{userName}</Text>
                        <TouchableOpacity 
                            onPress={() => setIsEditing(true)}
                            className="ml-2"
                        >
                            <Feather name="edit-2" size={20} color="#0891b2" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            
            <View className="mt-6 bg-gray-50">
                <TouchableOpacity className="flex-row items-center px-5 gap-x-6 pt-5"
                    onPress={() => router.push('../screen/Charity')}
                >
                    <Text style={{fontSize: 22}}>🤍</Text>
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
                        <Text style={{fontSize: 22}}>↩️</Text>
                    )}
                    <Text className="text-2xl font-light text-black">Đăng Xuất</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center px-5 py-5 gap-x-6"
                    onPress={() => router.push('../(auth)/ChangePassword')}
                >
                    <Text style={{fontSize: 22}}>🗝️</Text>
                    <Text className="text-2xl font-light text-black">Đổi Mật Khẩu</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}