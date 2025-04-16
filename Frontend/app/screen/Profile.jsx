import { View, Text, SafeAreaView, Image, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { Feather ,FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
export default function Profile() {
    const router = useRouter();
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
                <Text className="text-black mt-4 text-3xl font-semibold">Trương Quang Khải</Text>
            </View>
            <View className="mt-6 bg-gray-50">
                <TouchableOpacity className="flex-row items-center px-5 py-5 gap-x-6">
                    <Feather name="log-out" size={22} color="#0891b2" />
                    <Text className="text-2xl font-light text-black">Đăng Xuất</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center px-5 pb-5 gap-x-6"
                    onPress={() => router.push('/(auth)/ChangePassword')}
                >
                    <FontAwesome name="exchange" size={22} color="#0891b2" />
                    <Text className="text-2xl font-light text-black">Đổi Mật Khẩu</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}