import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router' 
import "../global.css"

export default function AppLayout() {
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
       <Stack.Screen name="UploadPdf"
        options={{
            headerTransparent: false,
            headerTitle: 'Tải lên sách PDF',
            headerShown: true,
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: 'bold',
            },
            animation: 'slide_from_bottom'
        }}
       />
       <Stack.Screen name="PdfViewer"
        options={{
            headerShown: false,
            animation: 'slide_from_right'
        }}
       />
       <Stack.Screen name="pages/pdf-reader"
        options={{
            headerShown: false,
            animation: 'slide_from_right'
        }}
       />
    </Stack>

   ) ;
}