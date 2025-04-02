import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StatusBar, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import booksData from '../../assets/booksData';




export default function BookDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
 
  // Find the book in our data
  const bookId = String(id);
  let book = null;
 
  // Search through all book collections
  const allBooks = [
    ...booksData.featuredBooks,
    ...booksData.bestSellers,
    ...booksData.freeBooks
  ];
 
  book = allBooks.find(b => b.id === bookId);
 
  if (!book) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <Text  className="text-lg">Không tìm thấy sách</Text>
        <TouchableOpacity
          className="mt-4 px-4 py-2 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }




  return (
    <SafeAreaView className="flex-1" >
      <Stack.Screen
        options={{
          title: 'Chi tiết sách',
          headerBackTitle: 'Quay lại',
        }}
      />
     
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center pt-6 pb-8">
          <Image
            source={book.image}
            className="w-[180px] h-[270px] rounded-xl shadow-lg"
            resizeMode="cover"
          />
        </View>
       
        <View className="px-6 ">
          <Text className="text-2xl font-bold text-center mb-2">{book.title}</Text>
          <Text className="text-base text-center mb-4">{book.author}</Text>
         
          <View className="flex-row justify-center items-center mb-8  ">
              <TouchableOpacity className="items-center mx-4 w-20 ">
                <Ionicons name="bookmark-outline" size={30} />
                <Text className="text-sm mt-1">Lưu</Text>
              </TouchableOpacity>

              <TouchableOpacity className="items-center mx-4 w-20">
                <Ionicons name="share-outline" size={30} />
                <Text className="text-sm mt-1">Chia sẻ</Text>
              </TouchableOpacity>

              <TouchableOpacity className="items-center mx-4 w-20">
                <Ionicons name="heart-outline" size={30} />
                <Text className="text-sm mt-1">Yêu thích</Text>
              </TouchableOpacity>
          </View>

         
          <TouchableOpacity className="py-3 rounded-xl mb-6 border-black border-2" >
            <Text className="text-black font-extrabold text-center text-xl">Đọc mẫu</Text>
          </TouchableOpacity>
         
          <View className="p-4 rounded-xl shadow-sm mb-6" >
            <Text className="text-xl font-bold mb-2" >Giới thiệu sách</Text>
            <Text className="text-base leading-6" >
              {book.description || 'Đây là một cuốn sách tuyệt vời với nội dung phong phú và hấp dẫn. Tác giả đã mang đến cho người đọc một góc nhìn độc đáo về cuộc sống và con người.'}
            </Text>
          </View>
         
          <View className="p-4 rounded-xl shadow-sm mb-6" >
            <Text className="text-lg font-bold mb-2" >Thông tin</Text>
            <View className="flex-row justify-between py-2 border-b" >
              <Text >Thể loại</Text>
              <Text className="font-semibold">{book.genre || 'Tiểu thuyết'}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b" >
              <Text >Số trang</Text>
              <Text className="font-semibold">{book.pages || '256'}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b" >
              <Text >Nhà xuất bản</Text>
              <Text className="font-semibold">{book.publisher || 'NXB Trẻ'}</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text >Năm xuất bản</Text>
              <Text className="font-semibold">{book.year || '2023'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}











