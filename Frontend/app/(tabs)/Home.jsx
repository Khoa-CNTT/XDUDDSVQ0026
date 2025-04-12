import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import booksData from "../../assets/booksData";
import HeaderHome from "../components/Home/HeaderHome";
import RenderBookItem from "../components/Home/RenderBookItem";
import RenderReadingNowItem from "../components/Home/RenderReadingNowItem";
import SectionHeader from "../components/SectionHeader";
const screenWidth = Dimensions.get('window').width;

const SPACING = 16;


export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  



  // Define all sections for the main FlatList
  const sections = [
    { id: 'reading', type: 'reading', title: 'Đang Đọc' },
    { id: 'trending', type: 'trending', title: 'Mới & Xu Hướng' },
    { id: 'categories', type: 'categories', title: 'Danh Mục' },
    { id: 'free', type: 'free', title: 'Sách Miễn Phí' },
    { id: 'topcharts', type: 'topcharts', title: 'Bảng Xếp Hạng' },
  ];


  // Render different section types for the main FlatList
  const renderSection = ({ item }) => {
    switch (item.type) {
      case 'reading':
        return (
          <View>
            <SectionHeader title={item.title} />
            <View className="flex-row flex-wrap justify-between mt-4 px-4">
              {booksData.featuredBooks.slice(0, 4).map(book => (
                <View key={book.id} style={{ width: (screenWidth - SPACING * 3) / 2 }}>
                  {RenderReadingNowItem({ item: book })}
                </View>
              ))}
            </View>
          </View>
        );
      case 'trending':
        return (
          <View >
            <SectionHeader title={item.title} />
            <FlatList
              data={booksData.bestSellers}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={RenderBookItem}
              keyExtractor={book => book.id}
              contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING * 2 }}
            />
          </View>
        );
     
      case 'categories':
        return (
          <View className="mb-2">
            <SectionHeader title={item.title} />
            <View className="flex-row flex-wrap justify-between px-4">
              {['Tiểu Thuyết', 'Giáo Dục', 'Kinh Doanh', 'Tâm Lý Học', 'Khoa Học', 'Lịch Sử'].map((category, index) => (
                <TouchableOpacity
                  key={index}
                  className="bg-white rounded-xl p-4 mb-4 shadow"
                  style={{ width: (screenWidth - SPACING * 3) / 2 }}
                >
                  <Text className="text-base font-semibold">{category}</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    {Math.floor(Math.random() * 100) + 50} sách
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
     
      case 'free':
        return (
          <View>
            <SectionHeader title={item.title} />
            <FlatList
              data={booksData.freeBooks}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={RenderBookItem}
              keyExtractor={book => book.id}
              contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING * 2 }}
            />
          </View>
        );
     
      case 'topcharts':
        return (
          <View>
            <SectionHeader title={item.title} />
            <FlatList
              data={[...booksData.bestSellers].sort(() => Math.random() - 0.5)}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View
                  className="w-[120px] mr-4 relative"
                >
                  {/* Ranking Badge */}
                  <View
                    className="absolute top-0 left-0 z-10 bg-blue-500 w-[30px] h-[30px] rounded-full justify-center items-center shadow-md"
                  >
                    <Text className="text-white font-bold">
                      {index + 1}
                    </Text>
                  </View>


                  {/* Book Item */}
                  <TouchableOpacity
                    className="mt-[15px]"
                    onPress={() => router.push(`/Books/${item.id}`)}
                  >
                    {item.image ? (
                      <Image
                        source={item.image}
                        className="w-[120px] h-[180px] rounded-lg mb-2 shadow-sm"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-[120px] h-[180px] rounded-lg mb-2 shadow-sm bg-gray-300 justify-center items-center">
                        <Text className="text-gray-500">No Image</Text>
                      </View>
                    )}
                    <Text
                      className="font-semibold text-sm mb-0.5 "
                      numberOfLines={3}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-gray-500 text-xs">{item.author}</Text>
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={item => `top-${item.id}`}
              contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING * 2, paddingTop: 10 }}
            />
          </View>
        );
     
      default:
        return null;
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-gray-50">

      <FlatList
        data={sections}
        keyExtractor={item => item.id}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
              <View className="flex-1">
                <HeaderHome />
              </View>
            }
        contentContainerStyle={{ paddingBottom: SPACING * 7 }}
      />
    </SafeAreaView>
  );
}



