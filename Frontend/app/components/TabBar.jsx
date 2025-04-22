import { View, Text, TouchableOpacity,StyleSheet } from 'react-native'
import React from 'react'
import { FontAwesome5,Entypo,Ionicons } from '@expo/vector-icons';


const TabBar = ({ state, descriptors, navigation }) => {

    const icons = {
        Home : (props)=> <Entypo name="home" size={24} color={greyColor} {...props} />,
        Library : (props)=> <Ionicons name='library' size={26} color={greyColor} {...props}/>,
        BookStore : (props)=> <FontAwesome5 name='shopping-bag' size={26} color={greyColor} {...props}/>,
        Search : (props)=> <FontAwesome5 name='search' size={26} color={greyColor} {...props}/>,
        Profile : (props)=> <FontAwesome5 name='user-alt' size={24} color={greyColor} {...props}/>
    }

    const primaryColor ='#0891b2';
    const greyColor = '#737373';


  return (
    <View style={styles.tabbar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        {/* console.log('router name',route.name); */}
        if(['_sitemap' , '+not-found'].includes(route.name)) return null;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
          key={route.name}
          style={styles.tabbarItem}
            accessibilityRole='button'
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
          >
          {
            icons[route.name]({
                color: isFocused ? primaryColor : greyColor,
            })
          }
            <Text style={{
                 color: isFocused ? primaryColor : greyColor, 
                 fontSize: 11,
                 marginTop:3            }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  )
}

const styles = StyleSheet.create({
    tabbar:{
        position :'absolute',
        bottom:25,
        flexDirection:'row',
        justifyContent:'space-between',
        alignItems:'center',
        backgroundColor:'white',
        marginHorizontal:20,
        paddingVertical:15,
        borderRadius:25,
        borderCurve:"continuous",
        shadowOffset:{width :5,height:10},
        shadowRadius:10,
        shadowColor:'black',
        shadowOpacity:0.2
    },
    tabbarItem:{
        flex:1,
        justifyContent:"center",
        alignItems:'center',
        

    }
})

export default TabBar