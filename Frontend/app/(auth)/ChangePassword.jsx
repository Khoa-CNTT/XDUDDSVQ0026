import { View, Text,TextInput, TouchableOpacity } from 'react-native'
import React, { useState } from 'react';
import { Stack } from 'expo-router';
export default function ChangePassword() {
    
    return (
        <View className="flex-1 mt-10 gap-y-3 mx-5">
            <Stack.Screen
                options={{
                    title: 'Đổi Mật Khẩu',
                    headerBackTitle: 'Quay lại',
                }}
            />
            <Text className="text-gray-700 ml-4 text-2xl font-bold ">Mật Khẩu Hiện Tại</Text>
            <TextInput
                className="p-4 bg-white text-gray-700 rounded-2xl"
                placeholder="Nhập Mật Khẩu Hiện Tại"
                secureTextEntry={true}
                returnKeyType="done"
            />
            <Text className="text-gray-700 ml-4 text-2xl font-bold ">Mật Khẩu Mới</Text>
            <TextInput
                className="p-4 bg-white text-gray-700 rounded-2xl"
                placeholder="Nhập Mật Khẩu Hiện Tại"
                secureTextEntry={true}
                returnKeyType="done"
            />
            <Text className="text-gray-700 ml-4 text-2sxl font-bold ">Nhập Lại Mật Khẩu Mới</Text>
            <TextInput
                className="p-4 bg-white text-gray-700 rounded-2xl"
                placeholder="Nhập Mật Khẩu Hiện Tại"
                secureTextEntry={true}
                returnKeyType="done"
            />
            <TouchableOpacity className="flex items-end my-5">
                        <Text className="text-gray-700 font-xl">Quên mật khẩu ?</Text>
                      </TouchableOpacity>
            <TouchableOpacity className="bg-blue-400 py-3 mt-3 rounded-xl">
                <Text className="text-center text-black font-bold text-xl">
                    Đổi Mật Khẩu
                </Text> 
            </TouchableOpacity>
        </View>
        
        
    )
}