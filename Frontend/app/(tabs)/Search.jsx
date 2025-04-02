import { View, Text, TextInput, FlatList, TouchableOpacity ,SafeAreaView} from 'react-native'
import React from 'react'
import { Feather } from '@expo/vector-icons';


const nameData=[
  {
    id: 1,
    name: 'Nguyen Van A',
  },
  {
    id: 2,
    name: 'Nguyen Van B',
  },
  {
    id: 3,
    name: 'Nguyen Van C',
  },
  {
    id: 4,
    name: 'Nguyen Van D',
  },
  {
    id: 5,
    name: 'Nguyen Van E',
  }
]

const ItemSeparatorView = () => {
  return (
    <View
      style={{
        height: 1,
        width: '100%',
        backgroundColor: '#CED0CE',
      }}
    />
  );
}
export default function Search() {
  return (
    
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 px-4">
      
      <FlatList
        data={nameData}
        renderItem={({ item }) => (
          <TouchableOpacity className="flex-row items-center p-4">
            <Feather name="search" size={24} className="me-3"/>
            <Text className="text-lg font-light">{item.name}</Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={<View className="flex-1">
          <Text className="text-4xl font-bold mb-8">Tìm Kiếm</Text>
          <View className="flex-row h-12 bg-gray-300 rounded-2xl items-center mb-4">
            <Feather name="search" size={24} className="ms-3"/>
            <TextInput
                  className="p-4 text-gray-700"
                  placeholder="Tìm kiếm sách, tác giả..."
                  placeholderTextColor="black" // Màu đen
                />

          </View>
          
      <Text className="text-3xl font-bold">Xu Hướng</Text>
        </View>}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={ItemSeparatorView}
      />
      </View>
    </SafeAreaView>
  )
}