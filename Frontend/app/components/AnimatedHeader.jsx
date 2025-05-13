import React from "react";
import {
  View,
  Text,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";

const screenWidth = Dimensions.get("window").width;
const HEADER_HEIGHT = 60;

const AnimatedHeader = ({
  title,
  scrollY,
  leftActions,
  rightActions,
  onTitlePress,
}) => {
  // Animation cho độ mờ của header chính
  const mainHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 30, 60],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  // Animation cho trượt của header chính
  const mainHeaderTranslate = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: "clamp",
  });

  // Animation cho opacity của header trung tâm
  const centerHeaderOpacity = scrollY.interpolate({
    inputRange: [30, 70],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Animation cho scale của header trung tâm
  const centerHeaderScale = scrollY.interpolate({
    inputRange: [30, 70],
    outputRange: [0.8, 1],
    extrapolate: "clamp",
  });

  // Animation cho tiêu đề
  const titleScale = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 1.1, 1.2],
    extrapolate: "clamp",
  });

  // Animation cho độ mờ của tiêu đề
  const titleOpacity = scrollY.interpolate({
    inputRange: [-20, 0, 30],
    outputRange: [0, 1, 1],
    extrapolate: "clamp",
  });

  return (
    <>
      {/* Backdrop blur effect base */}
      <Animated.View
        className="absolute top-0 left-0 right-0 z-40"
        style={{ height: HEADER_HEIGHT }}
      >
        <View className="absolute inset-0 bg-white/25 backdrop-blur-md" />
      </Animated.View>

      {/* Main header với tiêu đề tại vị trí thẳng hàng hơn */}
      <Animated.View
        className="absolute top-0 left-0 right-0 z-50"
        style={{
          opacity: mainHeaderOpacity,
          transform: [{ translateY: mainHeaderTranslate }],
          height: HEADER_HEIGHT,
        }}
      >
        {/* Title container - Điều chỉnh vị trí thẳng hàng hơn */}
        <View className="absolute left-4 top-0 h-full justify-center">
          <Animated.Text
            numberOfLines={1}
            className="text-3xl font-bold"
            style={{
              transform: [{ scale: titleScale }],
              opacity: titleOpacity,
            }}
          >
            {title}
          </Animated.Text>
        </View>

        {/* Actions container - đặt phía góc phải */}
        <View className="absolute right-4 top-0 h-full justify-center flex-row items-center">
          {rightActions ? (
            rightActions
          ) : (
            <View className="flex-row items-center">
              <TouchableOpacity className="ml-2 w-8 h-8 items-center justify-center rounded-full bg-blue-100">
                <Text className="text-blue-500 font-bold">+</Text>
              </TouchableOpacity>
              <TouchableOpacity className="ml-2 w-8 h-8 items-center justify-center rounded-full bg-blue-500">
                <Text className="text-white font-bold">👤</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Left actions nếu có */}
        {leftActions && (
          <View className="absolute left-4 bottom-0 h-1/2 justify-center">
            {leftActions}
          </View>
        )}
      </Animated.View>

      {/* Header trung tâm */}
      <Animated.View
        className="absolute top-0 left-0 right-0 z-45"
        style={{
          opacity: centerHeaderOpacity,
          transform: [{ scale: centerHeaderScale }],
          height: HEADER_HEIGHT,
          pointerEvents: "none",
        }}
      >
        <View className="flex-row justify-center items-center h-full">
          <View className="bg-white/50 backdrop-blur-md px-4 py-1 rounded-full">
            <Animated.Text
              className="text-base font-semibold"
              style={{
                transform: [
                  {
                    scale: scrollY.interpolate({
                      inputRange: [30, 70, 120],
                      outputRange: [1, 1.05, 1.1],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              }}
            >
              {title}
            </Animated.Text>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

export default AnimatedHeader;
