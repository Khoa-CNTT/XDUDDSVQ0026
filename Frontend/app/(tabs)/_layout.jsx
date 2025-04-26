import { View, Text } from 'react-native'
import React from 'react'
import { Tabs, Stack } from 'expo-router'
import TabBar from '../components/TabBar'

export default function _layout() {
  return (
    <Tabs
        tabBar={props=> <TabBar {...props}/>}
    >
        <Tabs.Screen name="Home" 
          options={{
            headerTransparent: true,
            headerTitle: '',
            headerShown: false,
        }}/>
        <Tabs.Screen name="Library"
          options={{
            headerTransparent: true,
            headerTitle: '',
            headerShown: false,
        }}
        />
        <Tabs.Screen name="BookStore"
          options={{
            headerTransparent: true,
            headerTitle: '',
            headerShown: false,
        }}
        />
        <Tabs.Screen name="Search"
          options={{
            headerTransparent: true,
            headerTitle: '',
            headerShown: false,
        }}
        />
    </Tabs>
    
  )
}