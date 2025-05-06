import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

export default function Charity() {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen
                options={{
                    title: "Quyên Góp / Ủng Hộ",
                    headerBackTitle: 'Quay lại'
                }}
            />
            <View>
            <Text className="text-center font-extrabold text-4xl mt-5">Donate Books</Text>

            </View>
            <View className="items-center mt-6">
                <TouchableOpacity className="bg-purple-600 rounded-lg w-[240px] py-4">
                    <Text className="text-white text-xl font-bold text-center">Select Book File</Text>
                </TouchableOpacity>
            </View>
            <Text className="text-center my-8">No files selected</Text>
            <View className="items-center ">
                <TouchableOpacity className="bg-gray-400 rounded-lg py-4 w-[240px]">
                    <Text className="text-white text-xl font-bold text-center">Donate</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}