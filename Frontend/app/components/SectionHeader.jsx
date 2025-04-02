import {View,Text,TouchableOpacity} from "react-native"
const SectionHeader = ({ title, showSeeAll = true }) => (
    <View className="flex-row justify-between items-center mb-4 mt-6 px-4">
      <Text className="text-[22px] font-bold">{title}</Text>
      {showSeeAll && (
        <TouchableOpacity>
          <Text className="text-blue-500 text-base">Xem Thêm..</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  export default SectionHeader;