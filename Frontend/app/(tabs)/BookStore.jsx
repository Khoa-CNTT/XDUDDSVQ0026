import { View, Text, ScrollView, Image, TouchableOpacity, FlatList, Dimensions, Animated, SafeAreaView } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import RenderBookItem from "../components/Library/RenderBookItem"
import SectionHeader from '../components/SectionHeader';
const SPACING = 16;
const { width } = Dimensions.get('window');



// Carousel Component
const Carousel = ({ data, autoPlay = true, interval = 3000 }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);


  // Auto play functionality
  useEffect(() => {
    let timerId;
    if (autoPlay) {
      timerId = setInterval(() => {
        if (activeIndex === data.length - 1) {
          flatListRef.current.scrollToIndex({ index: 0, animated: true });
        } else {
          flatListRef.current.scrollToIndex({ index: activeIndex + 1, animated: true });
        }
      }, interval);
    }


    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [activeIndex, autoPlay, data.length, interval]);


  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );


  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;


  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;


  // Renders the pagination dots
  const renderDots = () => {
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 10,
        alignSelf: 'center'
      }}>
        {data.map((_, idx) => {
          const inputRange = [(idx - 1) * width, idx * width, (idx + 1) * width];
         
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 16, 8],
            extrapolate: 'clamp'
          });
         
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp'
          });
         
          return (
            <Animated.View
              key={`dot-${idx}`}
              style={{
                width: dotWidth,
                height: 8,
                borderRadius: 4,
                backgroundColor: 'white',
                marginHorizontal: 4,
                opacity
              }}
            />
          );
        })}
      </View>
    );
  };


  // Render banner item
  const renderBannerItem = ({ item }) => (
    <TouchableOpacity style={{ width: width - 32, marginHorizontal: 16 }} activeOpacity={0.9}>
      <View className="rounded-xl overflow-hidden" style={{ height: 160 }}>
        <Image
          source={item.image}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        {item.badge && (
          <View className="absolute top-2 left-2 bg-yellow-400 px-2 py-1 rounded-full">
            <Text className="text-xs font-bold">{item.badge}</Text>
          </View>
        )}
       
        {item.title && (
          <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-3">
            <Text className="text-white font-bold text-lg">{item.title}</Text>
            {item.subtitle && (
              <Text className="text-white text-sm">{item.subtitle}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={{ height: 180 }}>
      <Animated.FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderBannerItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToInterval={width}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 0 }}
      />
      {renderDots()}
    </View>
  );
};


export default function BookStore() {
  
  // Banner data for carousel
  const bannerData = [
    {
      id: 1,
      title: 'Sách Mới Tháng 7',
      subtitle: 'Khám phá bộ sưu tập mới nhất',
      image: require('../../assets/images/bia1.png'),
      badge: 'HOT',
    },
    {
      id: 2,
      title: 'Khuyến mãi mùa hè',
      subtitle: 'Giảm giá lên đến 50%',
      image: require('../../assets/images/bia2.png'),
      badge: 'SALE',
    },
    {
      id: 3,
      title: 'Tác giả nổi bật',
      subtitle: 'Gặp gỡ các tác giả hàng đầu',
      image: require('../../assets/images/bia3.png'),
      badge: 'NEW',
    }
  ];


  // Sample book data
  const bestSellingBooks = [
    {
      id: 1,
      title: 'Displacement',
      author: 'Kiku Hughes',
      price: '$16.55',
      rating: 4,
      image: require('../../assets/images/bia1.png'),
    },
    {
      id: 2,
      title: "I'm a Wild Seed",
      author: 'Sharon Lee de la Cruz',
      price: '$11.95',
      rating: 4,
      image: require('../../assets/images/bia2.png'),
    },
    {
      id: 3,
      title: 'Bionic',
      author: 'Koren Shadmi',
      price: '$18.38',
      rating: 4,
      image: require('../../assets/images/bia1.png'),
    },
  ]


  const trendingBooks = [
    {
      id: 1,
      title: 'Young Mungo',
      author: 'Douglas Stuart',
      price: '$15.99',
      rating: 5,
      image: require('../../assets/images/bia3.png'),
    },
    {
      id: 2,
      title: 'The Green Mile',
      author: 'Stephen King',
      price: '$12.50',
      rating: 4,
      image: require('../../assets/images/bia2.png'),
    },
    {
      id: 3,
      title: 'The Gun',
      author: 'Fuminori Nakamura',
      price: '$14.75',
      rating: 3,
      image: require('../../assets/images/bia1.png'),
    },
  ]


  // Categories
  const categories = ['Fantasy', 'Lịch Sử', 'Kinh Dị', 'Hài Hước']


  // Render item functions
  const sections = [
    { id: 'bestselling', type: 'bestselling', title: 'Sách Bán Chạy' },
    { id: 'trending', type: 'trending', title: 'Mới & Xu Hướng' },
  ];
  const renderSection = ({item}) =>{
    switch(item.type){
      case 'bestselling':
        return(
          <View>
          <SectionHeader title={item.title} />
          <FlatList
              data={bestSellingBooks}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={RenderBookItem}
              keyExtractor={book => book.id}
              contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING * 2 }}
            />
        </View>
        );
      case 'trending':
        return(
          <View>
          <SectionHeader title={item.title} />
          <FlatList
              data={bestSellingBooks}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={RenderBookItem}
              keyExtractor={book => book.id}
              contentContainerStyle={{ paddingLeft: SPACING, paddingRight: SPACING * 2 }}
            />
        </View>
        )
        default :
          return null;   
    }
  }
  const HeaderHome = () => (
    <View className="flex-1 px-4">
          <Text className="text-4xl font-bold mb-8">Book Store</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
  
    <FlatList
    data={[{ id: "banner", type: "banner" }, ...sections]} // Chèn banner vào đầu danh sách
    keyExtractor={item => item.id}
    renderItem={({ item }) => {
      if (item.type === "banner") {
        return (
          <View className="mb-4">
            <Carousel data={bannerData} autoPlay={true} interval={4000} />
          </View>
        );
      }
      return renderSection({ item });
    }}
    showsVerticalScrollIndicator={false}
    ListHeaderComponent={
      <View className="bg-gray-50 z-10 ">
        <HeaderHome />
      </View>
    }
    contentContainerStyle={{ paddingBottom: SPACING * 7 }}
  />
  </SafeAreaView>

  )
}



