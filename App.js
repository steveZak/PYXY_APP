import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {enableScreens} from 'react-native-screens';

import HomeScreen from './app/screens/Home.js';
import ProfileScreen from './app/screens/Profile.js';
import CityView from './app/screens/CityView.js';
import TripView from './app/screens/TripView.js';
import SightView from './app/screens/SightView.js';
import CityMap from './app/screens/CityMap.js';
import TripMap from './app/screens/TripMap.js';
import FeedScreen from './app/screens/Feed.js';
import Login from './app/screens/Login.js';
import Create from './app/screens/Create.js';
import Search from './app/screens/Search.js';
import Edit from './app/screens/Edit.js';
import * as firebase from 'firebase';
import 'firebase/firestore';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import * as Font from 'expo-font';
import { PRIMARY } from './app/settings.js';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Platform, YellowBox } from 'react-native';

// console.ignoredYellowBox = ['Animated:'];
// console.ignoredYellowBox = ['Virtualized'];
// console.ignoredYellowBox = ['Warning'];
YellowBox.ignoreWarnings(['Animated:', 'Virtualized', 'Warning']);
enableScreens();

Font.loadAsync({
  'Montserrat-Light': require('./app/assets/fonts/Montserrat-Light.ttf'),
  'Montserrat-Regular': require('./app/assets/fonts/Montserrat-Regular.ttf'),
  'Montserrat-Medium': require('./app/assets/fonts/Montserrat-Medium.ttf')
});


const FeedStack = createSharedElementStackNavigator();
const FeedNav = () => {
  return (
    <FeedStack.Navigator headerMode="none">
      <FeedStack.Screen name="Feed" component={FeedScreen} />
    </FeedStack.Navigator>
  );
};

const ProfileStack = createSharedElementStackNavigator();
const ProfileNav = () => {
  return (
    <ProfileStack.Navigator headerMode="none">
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
};

const HomeStack = createSharedElementStackNavigator();
const HomeNav = () => {
  return (
    <HomeStack.Navigator headerMode="none">
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
};

const Stack = createSharedElementStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator initialRouteName='Home'
                   screenOptions={({ route }) => ({
                     tabBarIcon: ({ focused, color, size }) => {
                       let iconName;
                       if (route.name === 'Feed') {
                         iconName = 'newspaper';
                       } else if (route.name === 'Home') {
                         iconName = focused? 'home' : 'home-outline';
                       } else if (route.name === 'Profile') {
                         iconName = focused ? 'heart' : 'heart-outline';
                       }
                       return <Icon name={iconName} size={!focused ? Math.round(size*1.2) : Math.round(size*1.45)} color={color} />;
                      }})}
                    tabBarOptions={{activeTintColor: PRIMARY, tabBarVisible: false, keyboardHidesTabBar: true, inactiveTintColor: 'gray', showLabel: false}}
    >
      <Tab.Screen name="Feed" component={FeedNav}/>
      <Tab.Screen name="Home" component={HomeNav}/>
      <Tab.Screen name="Profile" component={ProfileNav}/>
    </Tab.Navigator>
  );
}

const StackNavigator = () => {

  return(
  <Stack.Navigator initialRouteName="Login" headerMode="none">
      <Stack.Screen
        name='Login'
        component={Login}
        options={{ header: () => null}}
      />
      <Stack.Screen name="App" component={TabNavigator} options={{
          gestureEnabled: false,
          header: () => null
        }}/>
      <Stack.Screen name="Home" component={HomeScreen} options={{
          gestureEnabled: false,
          header: () => null,
          transitionSpec: {
            open: { animation: 'timing', config: {duration: 200}},
            close: { animation: 'timing', config: {duration: 200}}
          },
          cardStyleInterpolator: ({current: {progress}}) => {
            return {
              cardStyle: {
                opacity: progress
              }
            }
          }
        }}
        />
        <Stack.Screen name="CityView" component={CityView} options={{
          gestureEnabled: false,
          header: () => null,
          transitionSpec: {
            open: { animation: 'timing', config: {duration: 200}},
            close: { animation: 'timing', config: {duration: 200}}
          },
          cardStyleInterpolator: ({current: {progress}}) => {
            return {
              cardStyle: {
                opacity: progress
              }
            }
          }
        }}
        />
      <Stack.Screen name="TripView" component={TripView} options={{
          gestureEnabled: false,
          transitionSpec: {
            open: { animation: 'timing', config: {duration: 200}},
            close: { animation: 'timing', config: {duration: 200}}
          },
          cardStyleInterpolator: ({current: {progress}}) => {
            return {
              cardStyle: {
                opacity: progress
              }
            }
          }
        }}
      />
      <Stack.Screen name="Create" component={Create} options={{
          gestureEnabled: false,
          transitionSpec: {
            open: { animation: 'timing', config: {duration: 200}},
            close: { animation: 'timing', config: {duration: 200}}
          },
          cardStyleInterpolator: ({current: {progress}}) => {
            return {
              cardStyle: {
                opacity: progress
              }
            }
          }
        }}
      />
      <Stack.Screen name="SightView" component={SightView} options={{
          gestureEnabled: false,
          transitionSpec: {
            open: { animation: 'timing', config: {duration: 200}},
            close: { animation: 'timing', config: {duration: 200}}
          },
          cardStyleInterpolator: ({current: {progress}}) => {
            return {
              cardStyle: {
                opacity: progress
              }
            }
          }
        }}/>
      <Stack.Screen name="CityMap" component={CityMap} options={{
          gestureEnabled: false,
          transitionSpec: {
            open: { animation: 'timing', config: {duration: 200}},
            close: { animation: 'timing', config: {duration: 200}}
          },
          cardStyleInterpolator: ({current: {progress}}) => {
            return {
              cardStyle: {
                opacity: progress
              }
            }
          }
        }}
        />
      <Stack.Screen name="TripMap" component={TripMap} options={{
          gestureEnabled: false,
          transitionSpec: {
            open: { animation: 'timing', config: {duration: 200}},
            close: { animation: 'timing', config: {duration: 200}}
          },
          cardStyleInterpolator: ({current: {progress}}) => {
            return {
              cardStyle: {
                opacity: progress
              }
            }
          }
        }}
        // sharedElements={(route, otherRoute, showing)=>{
        //   const {item} = route.params;
        //   // var uid = ""
        //   // if (otherRoute.params.item.uid != null) {
        //   //   uid = otherRoute.params.item.uid
        //   // }
        //   return [{id: `map`}, {id: `trip.${item.city_id}.tripView`}, {id: `tripMap.${item.uid}.icon`}, {id: `city.${item.city_id}.countryName`}, {id: `city.${item.city_id}.cityName`}];
        // }}
        />
        <Stack.Screen name="Search" component={Search} options={{
          gestureEnabled: false,
          transitionSpec: {
            open: { animation: 'timing', config: {duration: 200}},
            close: { animation: 'timing', config: {duration: 200}}
          },
          cardStyleInterpolator: ({current: {progress}}) => {
            return {
              cardStyle: {
                opacity: progress
              }
            }
          }
        }}
        />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{
          gestureEnabled: false,
          transitionSpec: {
            open: { animation: 'timing', config: {duration: 200}},
            close: { animation: 'timing', config: {duration: 200}}
          },
          cardStyleInterpolator: ({current: {progress}}) => {
            return {
              cardStyle: {
                opacity: progress
              }
            }
          }
        }}
        />
        <Stack.Screen name="Edit" component={Edit} options={{
          gestureEnabled: false,
          transitionSpec: {
            open: { animation: 'timing', config: {duration: 200}},
            close: { animation: 'timing', config: {duration: 200}}
          },
          cardStyleInterpolator: ({current: {progress}}) => {
            return {
              cardStyle: {
                opacity: progress
              }
            }
          }
        }}/>
  </Stack.Navigator>
  )
}

// sharedElements={(route, otherRoute, showing)=>{
//   const {item} = route.params;
//   // var uid = ""
//   // if (otherRoute.params.item != null) {
//   //   uid = otherRoute.params.item["uid"];
//   // }
//   return [{id: `city.${item.city_id}.cityView`}, {id: `city.${item.city_id}.countryName`}, {id: `city.${item.city_id}.cityName`},  {id: `city.${item.city_id}.title`}, {id: `trip.${otherRoute.params.item.uid}.view`}, {id: `trip.${otherRoute.params.item.uid}.icon`}, {id: `trip.${otherRoute.params.item.uid}.tripName`}];
// }}
// <Stack.Screen name="Auth" component={AuthNavigator} options={{
//   gestureEnabled: false,
// }}/>

export default function App() {
  return (
    <SafeAreaProvider style={{paddingTop: getStatusBarHeight()}}>
        <NavigationContainer>
          <StackNavigator/>
        </NavigationContainer>
    </SafeAreaProvider>
  );
}

// export default class App extends React.Component {
//   state = {
//     isReady: false,
//   };

//   async componentDidMount() {
//     await SplashScreen.preventAutoHideAsync();
//     await this._cacheResourcesAsync();
//   }

//   render() {
//     if (!this.state.isReady) {
//       return (
//         <SafeAreaProvider style={{justifyContent: 'center', paddingTop: getStatusBarHeight()}}>
//           <Loader/>
//         </SafeAreaProvider>
//       );
//     }

//     return (
//       <SafeAreaProvider style={{paddingTop: getStatusBarHeight()}}>
//           <NavigationContainer>
//             <StackNavigator/>
//           </NavigationContainer>
//       </SafeAreaProvider>
//     );
//   }

//   _cacheSplashResourcesAsync = async () => {
//     const gif = require('./app/assets/animations/Loader.js');
//     return Asset.fromModule(gif).downloadAsync();
//   };

//   _cacheResourcesAsync = async () => {
//     SplashScreen.hideAsync();
//     Font.loadAsync({
//       'Montserrat-Light': require('./app/assets/fonts/Montserrat-Light.ttf'),
//       'Montserrat-Regular': require('./app/assets/fonts/Montserrat-Regular.ttf'),
//       'Montserrat-Medium': require('./app/assets/fonts/Montserrat-Medium.ttf')
//     });
//     await delay(750);
//     this.setState({ isReady: true });
//   };
// }