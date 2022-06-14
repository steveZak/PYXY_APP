import React from 'react';
import {
  Dimensions,
  View,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import Modal from 'react-native-modal';
import * as firebase from 'firebase';
import 'firebase/firestore';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SharedElement } from 'react-navigation-shared-element';
import * as Animatable from 'react-native-animatable';
// import Recording from "react-native-recording";
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import normalize from 'react-native-normalize';
// import ActionButton from 'react-native-action-button';

import { SERVER_ADDR, DEV, PRIMARY, SECONDARY, COLOR0, COLOR1, COLOR2, COLOR3 } from '../settings.js';
import iconNames from '../assets/icons.json';

const colors = [PRIMARY, SECONDARY, COLOR0, COLOR1, COLOR2, COLOR3];

let cityData = require('../assets/city_data.json');

const { height, width } = Dimensions.get('window');

function getRandom(arr, n) {
    var result = new Array(n),
      len = arr.length,
      taken = new Array(len);
    if (n > len) {
      return arr
    }
    while (n--) {
      var x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

const questions = ["Where's your dream?", "Where are you going?", "Where next?", "Where's on your mind?"]

export default class Home extends React.Component {

  // static sharedElements=(navigation, otherNavigation, showing)=>{
  //   if ((otherNavigation.state.routeName === 'CityView') && showing) {
  //     const item = otherNavigation.getParam('item');
  //     console.log(item);
  //     return [{id: `city.${item.city_id}.cityView`, animation: 'move'}, {id: `city.${item.city_id}.countryName`, animation: 'move'}, {id: `city.${item.city_id}.cityName`, animation: 'move'},  {id: `city.${item.city_id}.title`, animation: 'move'}];
  //   }
  //   if ((otherNavigation.state.routeName === 'TripView') && showing) {
  //     const item = otherNavigation.getParam('item');
  //     console.log(item);
  //     return [{id: `trip.${item.uid}.view`, animation: 'move'}, {id: `trip.${item.uid}.icon`, animation: 'move'}, {id: `trip.${item.uid}.tripName`, animation: 'move'}];
  //   }
  // }

  state = {
    uid: null,
    suggestedCities: [],
    suggestedTrips: [],
    yourTrips: [],
    popularTrips: [],
    lookedCities: [],
    likedCities: [],
    savedCities: [],
    lookedTrips: [],
    likedTrips: [],
    savedTrips: [],
    lookedSights: [],
    likedSights: [],
    savedSights: [],
    current_cities: [],
    question: questions[Math.round(Math.random()*(questions.length-1))],
    loading: false,
    loggedIn: false,
    yourModal: false
  };

  // Recording.init({
  //   bufferSize: 4096,
  //   sampleRate: 44100,
  //   bitsPerChannel: 16,
  //   channelsPerFrame: 1,
  // });

  async componentDidMount() {
    AsyncStorage.getItem('uid').then(uid => {
                      this.setState({uid: uid});
                      if (this.state.suggestedCities.length == 0) {
                        this.loadHome(uid);
                      }
                    });
  }

  async loadHome(uid) {
    this.setState({loading: true});
    var stop = firebase.firestore().collection("users").doc(uid).onSnapshot(snapshot => { // onSnapshot
                            const user_data = snapshot.data();
                            var suggested_cities = []
                            if (typeof user_data === 'object' && user_data !== null && "suggested_cities" in user_data) {
                              for(var i=0; i<user_data.suggested_cities.length; i++) {
                                var id = user_data.suggested_cities[i] 
                                const country = cityData[id].full_name.split(", ")
                                suggested_cities.push({name: cityData[id].name, country: country[country.length-1], city_id: id})
                              }
                              var suggested_trips = []
                              for(var i=0; i<user_data.suggested_trips.length; i++) {
                                var id = user_data.suggested_trips[i]
                                const idx = id.lastIndexOf("_")
                                var city_id = id.slice(0, idx-2)
                                suggested_trips.push({uid: id, name: cityData[city_id].name, city_id: city_id, label: id.slice(idx+1, id.length)})
                              }
                              this.setState({suggestedCities: getRandom(suggested_cities, 12), suggestedTrips: getRandom(suggested_trips, 10)});
                            }
                            if (suggested_cities.length>0) {
                              stop();
                            }
                          });
    const qSnap = await firebase.firestore().collection("trips").where('user_id', '==', uid).where('tag', '==', 'yours').get();
    var your_trips = []
    qSnap.forEach((doc) => {
                            const user_data = doc.data();
                            const city_id = user_data.city_id
                            your_trips.push({uid: doc.id, name: cityData[city_id].name, city_id: city_id})
    });
    this.setState({yourTrips: getRandom(your_trips, your_trips.length), loading: false});
  }

  checkAdvisory = async (selectedCity) => {
    var country = selectedCity.slice(-2)
    var advisory = "";
    fetch("http://www.travel-advisory.info/api?countrycode=" + country, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  })
                                  .then(response => response.json())
                                  .then(responseJson => {
                                    var score = responseJson.data[country].advisory.score;
                                    if (score > 3.5) {
                                      advisory = require('../assets/warning_female.png');
                                      if (score > 4.5) {
                                        advisory = require('../assets/stop_female.png');
                                      }
                                    }
                                    this.setState({advisory: advisory});
           });
  }

  loadCityImages = (selectedCity) => {
    fetch(SERVER_ADDR + '/city_images?city_dir=' + selectedCity, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              },
              }).then(response => response.json())
              .then(responseJson => {
                this.setState({city_images: responseJson.images});
            });
  }


  getYourModal = () => {
    return(
    <View style={{height: height*0.2, width: width*0.8,
                   alignSelf: 'center', backgroundColor: 'white', padding: normalize(5),
                   borderRadius: normalize(10), justifyContent: 'center'}}>
        <View style={{alignItems: 'center',
                     justifyContent:'space-evenly', flexDirection: 'row'}}>
          <Text style={{fontFamily: 'Montserrat-Regular', fontSize: width*0.05}}>
            {"As you explore the world, we will create trips just for you!"}
          </Text>
        </View>
      </View>
    );
  }

  // checkMicPermissions = async () => {
  //   const {status} = Permissions.getAsync(Permissions.AUDIO_RECORDING);
  //   if (status !== 'granted') {
  //     const { status, permissions } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
  //     (status !== 'granted') ?
  //                 this.setState({audio_permission: false}) :
  //                 this.setState({audio_permission: true});
  //   }
  // }

  // startRecording = () => {
  //   if (this.state.audio_permission) {
  //     // Recording.start();
  //   }
  // }

  render() {
      // mode="margin" 
      return (<SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
                <ScrollView style={{flex: 1}}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                              <RefreshControl tintColor={PRIMARY} 
                                              onRefresh={()=>this.loadHome(this.state.uid)} 
                                              refreshing={this.state.loading} />}
                            scrollEventThrottle={16}>
                    <View style={{alignSelf: 'center',
                                  width: Math.round(width*0.8),
                                  height: Math.round(height*0.05),
                                  borderWidth: 1,
                                  borderColor: 'black',
                                  borderRadius: 1000,
                                  alignItems: 'center'}}>
                      <TouchableOpacity style={{height: Math.round(height*0.05), justifyContent: 'center'}}
                        onPress={()=>this.props.navigation.push("Search")}>
                        <Text style={{width: Math.round(width*0.75),
                                      textAlign: 'center',
                                      fontFamily: 'Montserrat-Medium',
                                      color: 'black',
                                      marginTop: height*0.005,
                                      fontSize: normalize(17)}}
                        >{this.state.question}</Text>
                      </TouchableOpacity>
                      </View>
                  <View>
                    <Text style={{marginLeft: width*0.01,
                                  fontSize: normalize(30),
                                  fontFamily: 'Montserrat-Medium'}}>
                          {"Explore"}
                    </Text>
                  </View>
                  <View>
                  <FlatList
                      data={this.state.suggestedCities}
                      pagingEnabled={true}
                      initialNumToRender={2}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      snapToAlignment={"start"}
                      decelerationRate={"fast"}
                      snapToInterval={Math.round(width*0.93)+normalize(5)}
                      renderItem={({item, index}) => {const color = colors[Math.round(Math.random()*colors.length-0.5)];
                      return(<View>
                      <SharedElement id={`city.${item.city_id}.cityView`}>
                      <View style={{
                                    height: width*0.515,
                                    width: width*0.93,
                                    marginRight: normalize(5),
                                    marginLeft: index==0?normalize(5):0,
                                    backgroundColor: color,
                                    borderRadius: normalize(15)}}/>
                      </SharedElement>
                      <View style={{position: 'absolute',
                                    height: width*0.515,
                                    width: width*0.93,
                                    marginRight: normalize(5),
                                    marginLeft: index==0?normalize(5):0,
                                    borderRadius: normalize(15)}}>
                        <TouchableOpacity style={{flex: 1,
                                                  justifyContent: 'flex-start'}}   
                                          activeOpacity={1}
                                          onPress={()=>{this.props.navigation.push('CityView', {item, color: color})}}>
                          <View style={{flexDirection: "row"}}>
                            <SharedElement id={`city.${item.city_id}.title`}>
                              <Image style={{width: width*0.495,
                                            borderWidth: 1,
                                            borderColor: 'white',
                                            borderRadius: normalize(15),
                                            aspectRatio: 1,
                                            marginLeft: Math.round(height*0.005),
                                            marginTop: Math.round(height*0.005),
                                            marginBottom: Math.round(height*0.005)}}
                                      source={{uri: "https://storage.googleapis.com/pyxy_place_images/title_images/"+item.city_id+".png"}}/>
                            </SharedElement>
                            <View style={{flexDirection: "column"}}>
                              <SharedElement id={`city.${item.city_id}.cityName`}>
                                <Text style={{width: width*0.41,
                                              color: 'white',
                                              alignSelf: 'flex-end',
                                              textAlign: "right",
                                              fontFamily: 'Montserrat-Light',
                                              fontSize: normalize(21),
                                              marginRight: '1%',
                                              marginTop: '2%',
                                              marginBottom: '2%'}}>
                                  {item.name}
                                </Text>
                              </SharedElement>
                              <SharedElement id={`city.${item.city_id}.countryName`}>
                                <Text style={{width: width*0.41,
                                              color: 'white',
                                              alignSelf: 'flex-end',
                                              textAlign: "right",
                                              fontFamily: 'Montserrat-Light',
                                              fontSize: normalize(23),
                                              marginRight: '1%',
                                              marginTop: '2%',
                                              marginBottom: '2%'}}>
                                  {item.country}
                                </Text>
                              </SharedElement>
                            </View>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>)}}
                      keyExtractor={item => item.city_id}
                  />
                  </View>
                  <View>
                  <Text style={{marginLeft: width*0.01,
                                fontSize: normalize(30),
                                fontFamily: 'Montserrat-Medium'}}>
                    {"For you"}
                  </Text>
                  </View>
                  <View>
                  <FlatList
                      data={this.state.yourTrips.length>0?this.state.yourTrips.slice(0, 5):[{uid: '0'},{uid: '1'}]}
                      pagingEnabled={true}
                      initialNumToRender={3}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      snapToAlignment={"start"}
                      decelerationRate={"fast"}
                      snapToInterval={Math.round(width*0.46)+normalize(5)}
                      renderItem={({item, index}) => {const color=colors[Math.round(Math.random()*colors.length-0.5)];
                                                      return(<Animatable.View animation={"fadeIn"} duration={250} delay={150+index*100}>
                      {(item.uid!='0'&&item.uid!='1')?
                      <View>
                        <SharedElement id={`trip.${item.uid}.view`}>
                        <View style={{
                                      height: Math.round(height*0.2),
                                      width: Math.round(width*0.46),
                                      marginRight: normalize(5),
                                      marginLeft: index==0?normalize(5):0,
                                      backgroundColor: color,
                                      borderRadius: normalize(15)}}/>
                        </SharedElement>
                        <View style={{position: 'absolute',
                                      height: Math.round(height*0.2),
                                      width: Math.round(width*0.46),
                                      marginRight: normalize(5),
                                      marginLeft: index==0?normalize(5):0,
                                      borderRadius: normalize(15)}}>
                          <TouchableOpacity style={{flex: 1,
                                                    justifyContent: 'flex-start'}}
                                            activeOpacity={1}
                                            onPress={()=>{this.props.navigation.push('TripView', {item, color: color})}}>
                            <SharedElement id={`trip.${item.uid}.label`}>
                              <Text style={{color: 'white',
                                            textAlign: 'center',
                                            fontFamily: 'Montserrat-Light',
                                            fontSize: normalize(20),
                                            marginTop: '2%',
                                            marginBottom: '1%'}}>
                                {"Your"}
                              </Text>
                            </SharedElement>
                            <SharedElement id={`trip.${item.trip_id}.icon`}>
                              <SpecialIcon style={{color: 'white',
                                            alignSelf: 'center',
                                            marginTop: '2%',
                                            marginBottom: '2%'}}
                                            name={"heart"}
                                            size={normalize(60)}/>
                            </SharedElement>
                              <Text style={{color: 'white',
                                            alignSelf: 'center',
                                            textAlign: 'center',
                                            fontFamily: 'Montserrat-Light',
                                            fontSize: normalize(21),
                                            marginTop: '2%',
                                            marginBottom: '4%'}}>
                                {item.name}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          </View>:
                          <View>
                            <View style={{height: Math.round(height*0.2),
                                          width: Math.round(width*0.46),
                                          marginRight: normalize(5),
                                          marginLeft: index==0?normalize(5):0,
                                          backgroundColor: color,
                                          borderRadius: normalize(15)}}/>
                            <View style={{position: 'absolute',
                                          height: Math.round(height*0.2),
                                          width: Math.round(width*0.46),
                                          marginRight: normalize(5),
                                          marginLeft: index==0?normalize(5):0,
                                          borderRadius: normalize(15),
                                          backgroundColor: 'rgb(170, 170, 170)',
                                          justifyContent: 'center',
                                          alignItems: 'center'}}>
                              <SpecialIcon color={'white'}
                                          size={width*0.08}
                                          name={'information-outline'}
                                          onPress={() => {this.setState({yourModal: true})}}/>
                            </View>
                          </View>}
                      </Animatable.View>)}}
                      keyExtractor={item => item.uid}
                  />
                  </View>
                  <View>
                  <Text style={{marginLeft: width*0.01,
                                fontSize: normalize(30),
                                fontFamily: 'Montserrat-Medium'}}>
                    {"Suggested"}
                  </Text>
                  </View>
                  <View>
                  <FlatList
                      data={this.state.suggestedTrips.slice(0, 10)}
                      pagingEnabled={true}
                      initialNumToRender={3}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      snapToAlignment={"start"}
                      decelerationRate={"fast"}
                      snapToInterval={Math.round(width*0.46)+normalize(5)}
                      renderItem={({item, index}) => {const color=colors[Math.round(Math.random()*colors.length-0.5)];
                                                      return(<Animatable.View animation={"fadeIn"} duration={250} delay={150+index*100}>
                      <SharedElement id={`trip.${item.uid}.view`}>
                      <View style={{
                                    height: height*0.2,
                                    width: width*0.46,
                                    marginRight: normalize(5),
                                    marginLeft: index==0?normalize(5):0,
                                    backgroundColor: color,
                                    borderRadius: normalize(15)}}/>
                      </SharedElement>
                      <View style={{position: 'absolute',
                                    height: height*0.2,
                                    width: width*0.46,
                                    marginRight: normalize(5),
                                    marginLeft: index==0?normalize(5):0,
                                    borderRadius: normalize(15)}}>
                        <TouchableOpacity style={{flex: 1,
                                                  justifyContent: 'flex-start'}}   
                                          activeOpacity={1}
                                          onPress={()=>{this.props.navigation.push('TripView', {item, color: color})}}>
                          <SharedElement id={`trip.${item.uid}.label`}>
                            <Text style={{color: 'white',
                                          textAlign: 'center',
                                          fontFamily: 'Montserrat-Light',
                                          fontSize: normalize(20),
                                          marginTop: '2%',
                                          marginBottom: '1%'}}>
                              {item.label}
                            </Text>
                          </SharedElement>
                          <SharedElement id={`trip.${item.uid}.icon`}>
                            <SpecialIcon style={{color: 'white',
                                          alignSelf: 'center',
                                          marginTop: '2%',
                                          marginBottom: '2%'}}
                                          name={iconNames.iconNames[item.label]}
                                          size={normalize(60)}/>
                          </SharedElement>
                          <SharedElement id={`trip.${item.uid}.tripName`}>
                            <Text style={{color: 'white',
                                          alignSelf: 'center',
                                          textAlign: 'center',
                                          fontFamily: 'Montserrat-Light',
                                          fontSize: normalize(21),
                                          marginTop: '2%',
                                          marginBottom: '4%'}}>
                              {item.name}
                            </Text>
                          </SharedElement>
                          </TouchableOpacity>
                        </View>
                      </Animatable.View>)}}
                      keyExtractor={item => item.uid}
                  />
                  </View>
                </ScrollView>
                <Modal isVisible={this.state.yourModal}
                      onBackdropPress={() => this.setState({yourModal: false})}
                      deviceWidth={width} deviceHeight={height}>
                  {this.getYourModal()}
                </Modal>
        </SafeAreaView>);
      }
    }
