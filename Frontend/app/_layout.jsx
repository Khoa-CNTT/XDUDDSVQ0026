import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router' 
import "../global.css"
export default function _layout() {
  return(
    <Stack>
      <Stack.Screen name="Landing" 
        options={{
            headerShown: false,
            title: '',
        }}
      />
      <Stack.Screen name="(auth)/SignUp" 
        options={{
            headerTransparent: true,
            headerTitle: '',
            headerShown: false,
        }}

      />
      <Stack.Screen name="(auth)/LogIn"
        options={{
            headerTransparent: true,
            headerTitle: '',
            headerShown: false,
        }}
       />
       <Stack.Screen name="(tabs)"
        options={{
            headerTransparent: true,
            headerTitle: '',
            headerShown: false,
        }}
       />
       <Stack.Screen name="index"
        options={{
            headerTransparent: true,
            headerTitle: '',
            headerShown: false,
        }}
       />
    </Stack>

   ) ;
}