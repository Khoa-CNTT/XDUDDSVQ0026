import { View, Text, Image, SafeAreaView, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

const Landing = () => {
  const router = useRouter();
  const [text, setText] = useState('');
  const fullText = "DTUBOOK";
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const typingSpeed = 100;  // Tốc độ gõ từng chữ
  const deleteSpeed = 50;   // Tốc độ xoá từng chữ
  const delayBetweenLoops = 1000; // Dừng trước khi lặp lại

  useEffect(() => {
    let timeout;

    const typeEffect = () => {
      if (!isDeleting && charIndex <= fullText.length) {
        // Gõ từng chữ cái
        setText(fullText.slice(0, charIndex));
        setCharIndex(charIndex + 1);
        timeout = setTimeout(typeEffect, typingSpeed);
      } else if (isDeleting && charIndex >= 0) {
        // Xóa từng chữ cái
        setText(fullText.slice(0, charIndex));
        setCharIndex(charIndex - 1);
        timeout = setTimeout(typeEffect, deleteSpeed);
      } else {
        // Chuyển trạng thái giữa gõ và xóa
        setIsDeleting((prev) => !prev);
        setCharIndex(isDeleting ? 0 : fullText.length);
        timeout = setTimeout(typeEffect, delayBetweenLoops);
      }
    };

    timeout = setTimeout(typeEffect, typingSpeed);
    return () => clearTimeout(timeout);
  }, [isDeleting, charIndex]);

  return (
    <SafeAreaView className='flex-1' style={{ backgroundColor: '#4169e1' }}>
      <View className='flex-1 flex justify-around my-4'>
        <Text className="text-white font-bold text-5xl text-center">
          {text}
        </Text>
        <View className="items-center justify-center">
          <Image source={require('../assets/images/landing.png')} 
            style={{ width: 330, height: 330 }}
          />
        </View>
        <View className="space-y-4">
          <TouchableOpacity className="py-3 bg-yellow-400 mx-7 rounded-xl"
            onPress={() => router.push('/(auth)/SignUp')}
          >
            <Text className="text-4xl font-bold text-center text-gray-700">
              Đăng Ký
            </Text>
          </TouchableOpacity>
          <View className="flex-row justify-center mt-10">
            <Text className="text-white font-semibold text-xl">Bạn đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/LogIn')}>
              <Text className="font-semibold text-yellow-400 text-xl">
                Đăng Nhập
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Landing;
