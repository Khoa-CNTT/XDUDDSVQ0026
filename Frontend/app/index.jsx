import { View, Text } from 'react-native'
import React from 'react'
import { Redirect } from 'expo-router'

export default function index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {/* <Redirect href={"Landing"} /> */}
      <Redirect href={"/(tabs)/Home"} />

    </View>
  )
}