import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

const SectionHeader = ({ title, showSeeAll = true, type }) => {
  const router = useRouter();

  const handleSeeAll = () => {
    router.push({
      pathname: "/AllDocuments",
      params: { type },
    });
  };

  return (
    <View className="flex-row justify-between items-center mb-4 mt-6 px-4">
      <Text className="text-[22px] font-bold">{title}</Text>
      {showSeeAll && (
        <TouchableOpacity onPress={handleSeeAll}>
          <Text className="text-blue-500 text-base">Xem Thêm..</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SectionHeader;
