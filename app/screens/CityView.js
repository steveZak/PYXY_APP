import React from 'react';
import {
  Animated,
  FlatList,
  Image,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import * as firebase from 'firebase';
import 'firebase/firestore';
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";
import * as Localization from 'expo-localization';
import { BlurView } from 'expo-blur';
import Modal from 'react-native-modal';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MaterialIndicator} from 'react-native-indicators';
import SegmentedRoundDisplay from 'react-native-segmented-round-display';
import { SharedElement } from 'react-navigation-shared-element';
import normalize from 'react-native-normalize';
import * as cityPics from '../assets/city_pics.json';
import * as map_data from "../assets/map_styles.json";
import iconNames from '../assets/icons.json';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SERVER_ADDR, PRIMARY, SECONDARY, COLOR2, COLOR3} from '../settings.js';

let cityData = require('../assets/city_data.json');
const colors = [PRIMARY, SECONDARY, COLOR2, COLOR3];
const { height, width } = Dimensions.get('window');

class CityView extends React.Component {

  static sharedElements=(navigation, otherNavigation, showing)=>{
    if ((otherNavigation.state.routeName === 'Home') && showing) {
      const item = navigation.getParam('item');
      // var uid = ""
      // if (otherRoute.params.item != null) {
      //   uid = otherRoute.params.item["uid"];
      // }
      return [{id: `city.${item.city_id}.cityView`, animation: 'move'}, {id: `city.${item.city_id}.countryName`, animation: 'move'}, {id: `city.${item.city_id}.cityName`, animation: 'move'},  {id: `city.${item.city_id}.title`, animation: 'move'}];
    }
  }

  // static sharedElements = (navigation, otherNavigation, showing) => {
  //   if ((otherNavigation.state.routeName === 'List') && showing) {
  //     const item = navigation.getParam('item');
  //     return [`item.${item.id}.photo`];
  //   }
  // }

  state = {
    uid: null,
    scrollY: new Animated.Value(0),
    advisory: null,
    advVisible: false,
    cityMatch: null,
    liked: false,
    saved: false,
    loading: false,
    scoreModal: false,
    selected_city: this.props.route.params.item.city_id,
    selected_city_info: null,
    combinedTrips: [],
    trips: [],
    liked_trips: []
  }

  async componentDidMount() {
    const uid = await AsyncStorage.getItem('uid');
    firebase.firestore().collection("users").doc(uid).get()
                                .then(snapshot => {
                                  var user_data = snapshot.data();
                                  var isLiked = user_data.liked_cities.includes(this.state.selected_city);
                                  var isSaved = user_data.saved_cities.includes(this.state.selected_city);
                                  this.setState({uid: uid, liked: isLiked, saved: isSaved});
                                });
    this.getCityInfo(this.state.selected_city, uid);
    this.getCityMatch(this.state.selected_city, uid);
    this.checkAdvisory(this.state.selected_city);
    this.loadData(uid);
    firebase.firestore().collection("users").doc(uid).update({looked_cities: firebase.firestore.FieldValue.arrayUnion({city_id: this.state.selected_city}), needs_update: Math.random()<0.5?true:false});
  }

  async loadData(uid){
    await firebase.firestore().collection("users").doc(uid).get()
          .then(snapshot => {
            var user_data = snapshot.data();
            this.setState({liked_trips: user_data.liked_trips,
             }, () => {
              this.loadTrips();
            })
          })
  }

  checkAdvisory = async (selectedCity) => {
    var country = selectedCity.slice(-2)
    var advisory = null;
    fetch("http://www.travel-advisory.info/api?countrycode=" + country, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json'
                  }})
                    .then(response => response.json())
                    .then(responseJson => {
                      var score = responseJson.data[country].advisory.score;
                      if (score > 3.5) {
                        advisory = { 'score': score,
                            'status': "yellow",
                            'img': require('../assets/warning_female.png')}
                        if (score > 4.5) {
                          advisory = { 'score': score,
                            'status': "red",
                            'img': require('../assets/stop_female.png')}
                      }
                      this.setState({advisory: advisory});
                    }
           });
  }

  getAdvContent = (item) => {
    return(
    (this.state.advisory!=null)?(
      <View style={{height: height*0.25, width: width*0.9,
                   alignSelf: 'center', backgroundColor: 'white', padding: normalize(5),
                   borderRadius: normalize(10), justifyContent: 'center'}}>
        <View style={{alignItems: 'center',
                     justifyContent:'space-evenly', flexDirection: 'row'}}>
         <Image
          style={{ width: normalize(84), height: normalize(112), marginRight: normalize(10) }}
          source={this.state.advisory['img']}
         />
         <View style={{width: normalize(width*0.5), height: normalize(114), justifyContent: 'space-between'}}>
           <Icon
             name='highlight-off'
             style={{alignSelf: 'flex-end'}}
             size={normalize(25)}
             color='#422680'
             onPress={() => this.setState({advVisible: false})}/>
           <Text style={{fontFamily: 'Montserrat-Regular'}}>
              {(this.state.advisory['status']=='yellow')?
                  "It is not advisable to travel to " + item.name + " at this time\n\nCan't say we haven't told you so\n":
                  "It is unsafe to travel to " + item.name + " at this time\n\nCan't say we haven't told you so\n"}
           </Text>
          </View>
        </View>
      </View>
    ):(<View/>));
  }

  getCityInfo = async (city, uid) => {
    var city_info;
    firebase.firestore().collection("cities").doc(city).get()
                        .then(snapshot => {
                            city_info = snapshot.data();
                            this.setState({selected_city_info: city_info});
                            var trips = city_info.cat_trips.slice(0, 6)
                            trips.push(...city_info.mood_trips.slice(0, 2))
                            Math.random()>0.5?trips.push({"uid": city + "_P_Popular"}):trips.push({"uid": city+"_P_Rare"})
                            this.setState({trips: trips});
                            this.getImageURLs(this.state.selected_city, city_info.sights, uid);
                          });
  }

  async getImageURLs(city_id, places, uid) {
    await fetch(SERVER_ADDR + "/get_images?city_id=" + city_id, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json'
                  }})
                    .then(response => response.json())
                    .then(responseJson => {
                      for(var i in places) {
                        places[i].img = responseJson.imgs[places[i].uid];
                      }
                    });
    // this.setState({places: places});
    for(var i=0; i<places.length; i++) {
      await fetch(SERVER_ADDR+"/get_match?city_id="+city_id+"&place_id="+places[i].uid+"&id="+uid, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }}).then(response => response.json()).then(responseJson => places[i].mc=responseJson.mc)
    }
    var new_city_info = this.state.selected_city_info
    new_city_info.sights = places
    this.setState({selected_city_info: new_city_info, uid: uid});
  }

  async loadTrips() { // make some pagination in the future
    this.setState({loading: true});
    var combinedTrips = []
    var qSnap = await firebase.firestore().collection("trips").where("privacy", "==", "public").where("city_id", "==", this.state.selected_city).orderBy('timestamp', 'desc').limit(5).get()
    qSnap.forEach((doc) => {
      const trip_data = doc.data();
      var author = "";
      if (trip_data.user_id==this.state.uid) {
        author = "Created by you";
      } else {
        author = "By Anonymous";
      }
      var liked = false;
      for (var i in this.state.liked_trips) {
        if (doc.id== this.state.liked_trips[i].trip_id) {
          liked = true
        }
      }
      combinedTrips.push({liked: liked, user_id: trip_data.user_id, places: trip_data.sights, distance: trip_data.walk_dist, duration: trip_data.duration, color: colors[Math.round(Math.random()*(colors.length-1))], author: author, uid: doc.id, type: 'created', tag: 'created', city: cityData[trip_data.city_id].name, city_id: trip_data.city_id, label: trip_data.name, likes: trip_data.likes, description: trip_data.description, privacy: trip_data.privacy});
    });
    this.setState({combinedTrips: combinedTrips, loading: false});
    this.getTripImageURLs(combinedTrips);
  }

  async getTripImageURLs(combinedTrips) {
    for (var i in combinedTrips) {
      if (combinedTrips[i].places[0].img == null) {
        await fetch(SERVER_ADDR + "/get_trip_images?city_id=" + combinedTrips[i].city_id + "&trip_id=" + combinedTrips[i].uid, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json'
                      }})
                        .then(response => response.json())
                        .then(responseJson => {
                          var trip = combinedTrips[i]
                          var places = trip.places
                          for(var j in places) {
                            places[j].img = responseJson.imgs[places[j].place_id];
                          }
                          trip.places = places
                          combinedTrips[i] = trip
                        });
      }
    }
    this.setState({combinedTrips: combinedTrips});
    for (var i in combinedTrips) {
      await fetch(SERVER_ADDR+"/get_name?uid="+combinedTrips[i].user_id)
                  .catch(error => {})
                  .then(response => response.json())
                  .then(responseJson => {if(combinedTrips[i].user_id != this.state.uid && responseJson.name.length > 0){combinedTrips[i].author = "By " + responseJson.name}});
      await fetch(SERVER_ADDR+"/get_match?city_id="+combinedTrips[i].city_id+"&trip_id="+combinedTrips[i].uid+"&id="+this.state.uid, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }}).then(response => response.json()).then(responseJson => combinedTrips[i].match = Math.round(responseJson.mc*100))
    }
    this.setState({combinedTrips: combinedTrips});
  }

  getCityMatch = async (city, uid) => {
    fetch(SERVER_ADDR + "/get_match?city_id=" + city + "&id=" + uid, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json'
                  }})
                    .then(response => response.json())
                    .then(responseJson => {
                            this.setState({cityMatch: Math.round(100*responseJson.mc)});
                          });
  }

  getScoreModal() {
    return(<View style={{backgroundColor: 'white',
                         height: height*0.2,
                         width: width*0.9,
                         alignSelf: 'center',
                         alignItems: 'center',
                         borderRadius: width*0.03}}>
        <View style={{height: height*0.05, width: width*0.9}}>
          <Text style={{fontSize: width*0.05,
                        fontFamily: 'Montserrat-Regular',
                        textAlign: 'center'}}>{"Pyxy score"}</Text>
        </View>
        <View style={{alignSelf: 'flex-start',
                      alignItems: 'center',
                      flexDirection: 'row',
                      height: height*0.15,
                      width: width*0.9}}>
          <View style={{flexDirection: 'row',
                        height: height*0.1,
                        width: height*0.1,
                        marginLeft: width*0.02,
                        justifyContent: 'center'}}>
            <Image style={{flex: 1,
                          width: null,
                          height: null,
                          resizeMode: 'contain'}}
                  source={require("../assets/animations/icon500.png")}/>
          </View>
          <Text style={{height: height*0.1,
                        textAlign: 'center',
                        width: width*0.65,
                        fontSize: width*0.04,
                        fontFamily: 'Montserrat-Regular'}}>
            {"How much our Pyxys think you're going to like cities, places and trips"}
          </Text>
        </View>
        <View style={{position: 'absolute',
                      alignSelf: 'flex-end',
                      marginTop: width*0.01,
                      right: width*0.01}}>
          <TouchableOpacity onPress={()=>{this.setState({scoreModal: false})}}>
            <SpecialIcon size={width*0.06}
                         color={COLOR2}
                         name={"close-circle-outline"}/>
          </TouchableOpacity>
        </View>
      </View>)
  }

  async getYours() {
    fetch(SERVER_ADDR + "/make_your_trip?city_id=" + this.state.selected_city + "&id=" + this.state.uid, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }})
        .then(response => response.json())
        .then(responseJson => {this.props.navigation.navigate('TripView', {item: {uid: responseJson.trip_id}, yours: true})});
  }
  
  renderDuration(duration){
    var botDuration = (Math.floor(duration*2)/2).toFixed(1).toString();
    var topDuration = (Math.ceil(duration*2)/2).toFixed(1).toString();
    botDuration=botDuration.charAt(botDuration.length-1)=='0'?botDuration.slice(0, botDuration.length-2):botDuration;
    topDuration=topDuration.charAt(topDuration.length-1)=='0'?topDuration.slice(0, topDuration.length-2):topDuration;
    return botDuration + " - " + topDuration + " hr";
  }

  render() {
    const {item} = this.props.route.params;
    // mode="margin"
    return (<SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
            <Image style={{height, width}} resizeMode={"cover"} source={{uri: cityPics[item.city_id]}}/>
            {/* <Animated.View
                        style={{position: 'absolute',
                                alignSelf: 'center',
                                transform: [{
                                  translateY: this.state.scrollY.interpolate({inputRange: [0, 100], outputRange: [0, -300]})
                                }]
                        }}>
              <SharedElement id={`city.${item.city_id}.cityView`}>
                <View style={{backgroundColor: this.props.route.params.color==null?PRIMARY:this.props.route.params.color,
                              marginTop: normalize(50),
                              height: Math.round(height*0.22),
                              width: Math.round(width*0.83),
                              borderRadius: normalize(15)}}/>
              </SharedElement>
            </Animated.View> */}
            <Animated.ScrollView showsVerticalScrollIndicator={false}
                              onScroll={Animated.event([{nativeEvent: { contentOffset: { y: this.state.scrollY}}}], {useNativeDriver: true})}
                        style={{height: height, width: width, position: 'absolute'}}>
                {(this.state.selected_city_info==null)?
                  (<BlurView style={{backgroundColor: 'white', marginTop: Math.round(height*0.7), borderRadius: normalize(10)}} intensity={80}>
                    <Text style={{color: 'white',
                                  fontFamily: 'Montserrat-Regular',
                                  fontSize: normalize(24)}}>{' Trips'}</Text>
                    <FlatList contentContainerStyle={{justifyContent: 'center', marginLeft: '1%'}}
                              data={[0,0,0,0,0,0,0,0]}
                              numColumns={3}
                              scrollEnabled={false}
                              renderItem={({item, index}) => {return (
                        <View style={{height: Math.round(0.32*width),
                                       width: Math.round(0.32*width),
                                       marginLeft: '1%',
                                       marginTop: '3%',
                                       backgroundColor: '#AAAAAA',
                                       borderRadius: normalize(15),
                                       position: 'absolute'}}/>
                        );}}
                      keyExtractor={(item, idx) => "trip"+idx}
                  /></BlurView>):
                  (<BlurView style={{backgroundColor: 'white', marginTop: Math.round(height*0.7), borderRadius: normalize(15)}} intensity={80}>
                    <Text style={{color: 'white',
                                  fontFamily: 'Montserrat-Regular',
                                  fontSize: normalize(28)}}>{" Trips"}</Text>
                    <View style={{flexDirection: "row"}}>
                      <View>
                          <SharedElement id={`trip.yours.view`}>
                            <View style={{height: Math.round(0.32*width),
                                          width: Math.round(0.64*width),
                                          marginLeft: '2%',
                                          marginTop: '3%',
                                          backgroundColor: PRIMARY,
                                          borderRadius: normalize(15)}}/>
                          </SharedElement>
                          <View style={{height: Math.round(0.32*width),
                                        width: Math.round(0.64*width),
                                        marginLeft: '2%',
                                        marginTop: '3%',
                                        borderRadius: normalize(15),
                                        position: 'absolute'}}>
                          <TouchableOpacity style={{flex: 1, justifyContent: 'center'}}
                                            onPress={()=>this.getYours()}>
                            <SharedElement style={{position: 'absolute', alignSelf: 'center'}} id={`trip.yours.icon`}>
                              <SpecialIcon style={{color: 'white', alignSelf: 'center'}}
                                          name={"heart"}
                                          size={normalize(60)}/>
                            </SharedElement>
                            <SharedElement id={`trip.yours.tripName`}>
                              <Text style={{color: 'white',
                                            alignSelf: 'flex-end',
                                            fontSize: normalize(14),
                                            marginTop: '38%',
                                            fontFamily: 'Montserrat-Regular'}}>
                                {"Yours "}
                              </Text>
                            </SharedElement>
                            </TouchableOpacity>
                          </View>
                      </View>
                      <View>
                          <SharedElement id={`trip.yours.view`}>
                            <View style={{height: Math.round(0.24*width),
                                          width: Math.round(0.24*width),
                                          marginLeft: '15%',
                                          marginTop: '17%',
                                          backgroundColor: SECONDARY,
                                          borderRadius: normalize(15)}}/>
                          </SharedElement>
                          <View style={{height: Math.round(0.24*width),
                                        width: Math.round(0.24*width),
                                        marginLeft: '15%',
                                        marginTop: '17%',
                                        borderRadius: normalize(15),
                                        position: 'absolute'}}>
                          <TouchableOpacity style={{flex: 1, justifyContent: 'center'}}
                                            onPress={()=>{this.props.navigation.navigate('Create', {item, city_id: this.state.selected_city})}}>
                            <SharedElement style={{position: 'absolute', alignSelf: 'center'}} id={`trip.create.icon`}>
                              <SpecialIcon style={{color: 'white',
                                                   alignSelf: 'center'}}
                                          name={"plus"}
                                          size={normalize(60)}/>
                            </SharedElement>
                            </TouchableOpacity>
                          </View>
                      </View>
                    </View>
                    <FlatList contentContainerStyle={{justifyContent: 'center', marginLeft: '1%'}}
                              data={this.state.trips}
                              numColumns={3}
                              showsVerticalScrollIndicator={false}
                              scrollEnabled={false}
                              renderItem={({item, index}) => {const cat = item['uid'].split("_").pop();
                                                              const trip = cat.charAt(0) + cat.slice(1).toLowerCase();
                                                              return (<View>
                        <SharedElement id={`trip.${item.uid}.view`}>
                          <View style={{height: Math.round(0.32*width),
                                        width: Math.round(0.32*width),
                                        marginLeft: '1%',
                                        marginTop: '3%',
                                        backgroundColor: PRIMARY,
                                        borderRadius: normalize(15)}}/>
                        </SharedElement>
                        <View style={{height: Math.round(0.32*width),
                                      width: Math.round(0.32*width),
                                      marginLeft: '1%',
                                      marginTop: '3%',
                                      borderRadius: normalize(15),
                                      position: 'absolute'}}>
                        <TouchableOpacity style={{flex: 1, justifyContent: 'flex-end'}}
                                          onPress={()=>{this.props.navigation.push('TripView', {item})}}>
                          <SharedElement id={`trip.${item.uid}.icon`}>
                            <SpecialIcon style={{color: 'white', alignSelf: 'center'}}
                                         name={iconNames.iconNames[trip]}
                                         size={normalize(60)}/>
                          </SharedElement>
                          <SharedElement id={`trip.${item.uid}.tripName`}>
                            <Text style={{color: 'white',
                                          alignSelf: 'flex-end',
                                          fontSize: normalize(14),
                                          marginTop: '9%',
                                          marginBottom: '2%',
                                          fontFamily: 'Montserrat-Regular'}}>
                              {trip + " "}
                            </Text>
                          </SharedElement>
                          </TouchableOpacity>
                        </View>
                        </View>);}}
                      keyExtractor={(item, idx) => "trip"+idx}
                  />
                  <Text style={{color: 'white',
                                fontFamily: 'Montserrat-Regular',
                                fontSize: normalize(28)}}>{" Places"}</Text>
                  <FlatList contentContainerStyle={{justifyContent: 'center'}}
                            style={{marginTop: width*0.02, width: width}}
                            horizontal={true}
                            data={(this.state.selected_city_info==null)?[]:this.state.selected_city_info.sights}
                            initialNumToRender={2}
                            snapToAlignment={"start"}
                            snapToInterval={width*0.85}
                            showsHorizontalScrollIndicator={false}
                            decelerationRate={"fast"}
                            renderItem={({item, index}) => {
                              return (<View style={{flexDirection: "row",
                                                    justifyContent: "center",
                                                    alignContent: "center",
                                                    marginLeft: index==0?width*0.05:0,
                                                    marginRight: width*0.05,
                                                    alignItems: "center"}}>
                                          <SharedElement id={`sight.${item.place_id}.view`}>
                                          <View style={{height: Math.round(0.2*width),
                                                        width: Math.round(0.8*width),
                                                        borderRadius: normalize(15),
                                                        position: 'absolute'}}></View>
                                          </SharedElement>
                                          <View style={{height: Math.round(0.2*width),
                                                        width: Math.round(0.8*width),
                                                        borderRadius: normalize(15)}}>
                                          <TouchableOpacity style={{flex: 1, justifyContent: 'flex-end'}}
                                                              onPress={()=>{this.props.navigation.navigate('SightView', {item: {place_id: item.uid, name: item.name}, city_id: this.state.selected_city})}}>
                                              <View style={{flexDirection: "row", borderRadius: normalize(15), backgroundColor: PRIMARY, overflow: 'hidden'}}>
                                              <SharedElement id={`sight.${item.place_id}.icon`}>
                                                  {(item.img!="")?(<View style={{width: Math.round(0.2*width),
                                                                                  height: Math.round(0.2*width)}}>
                                                                    <Image source={{uri: item.img}}
                                                                          style={{position: 'absolute',
                                                                                  width: Math.round(0.2*width),
                                                                                  height: Math.round(0.2*width)}}/>
                                                                    <View style={{marginTop: Math.round(0.01*width),
                                                                                  marginLeft: Math.round(0.01*width),
                                                                                  height: Math.round(0.05*width),
                                                                                  aspectRatio: 1,
                                                                                  overflow: 'hidden',
                                                                                  borderRadius: 1000,
                                                                                  backgroundColor: PRIMARY}}>
                                                                      <Text style={{textAlign: "center",
                                                                                    color: 'white',
                                                                                    fontSize: normalize(16),
                                                                                    fontFamily: 'Montserrat-Regular'}}>
                                                                                      {index+1}
                                                                      </Text>
                                                                    </View>
                                                                    </View>):(<View style={{backgroundColor: 'rgb(175, 175, 175)', width: Math.round(0.2*width), height: Math.round(0.2*width)}}/>)}
                                              </SharedElement>
                                              <View style={{width: 0.5*width,
                                                            height: 0.2*width, justifyContent: 'center'}}>
                                                <SharedElement id={`sight.${item.place_id}.placeName`}>
                                                    <Text style={{
                                                                textAlign: "center",
                                                                color: 'white',
                                                                fontSize: normalize(17),
                                                                fontFamily: 'Montserrat-Regular'}}>
                                                    {item.name}
                                                    </Text>
                                                </SharedElement>
                                              </View>
                                              <View>
                                                  {item.mc==null?
                                                  (<MaterialIndicator color={'white'} animating={true}/>):
                                                  (<View style={{marginLeft: 0.05*width, marginTop: 0.1*width, justifyContent: 'center', alignItems: 'center'}}>
                                                    <TouchableOpacity style={{position: 'absolute', justifyContent: 'center', alignItems: 'center'}} onPress={()=>this.setState({scoreModal: true})}>
                                                      <SegmentedRoundDisplay
                                                        style={{aspectRatio: 1, position: 'absolute'}}
                                                        filledArcWidth={2}
                                                        emptyArcWidth={1}
                                                        radius={width*0.04}
                                                        animated={false}
                                                        emptyArcColor={'white'}
                                                        incompleteArcColor={'white'}
                                                        totalArcSize={360}
                                                        displayValue={false}
                                                        segments={[{
                                                                    total: 100,
                                                                    filled: Math.round(item.mc*100),
                                                                  }]}/>
                                                      <Text style={{
                                                              textAlign: "center",
                                                              color: 'white',
                                                              fontSize: normalize(17),
                                                              fontFamily: 'Montserrat-Regular'}}>{Math.round(item.mc*100)}</Text>
                                                    </TouchableOpacity></View>)
                                                  }
                                                </View>
                                              </View>
                                              </TouchableOpacity>
                                          </View>
                                          </View>);}}
                                  keyExtractor={(item, idx) => item.uid}
                    />
                    <Text style={{color: 'white',
                                  fontFamily: 'Montserrat-Regular',
                                  fontSize: normalize(28)}}>{" Top Trips"}</Text>
                    <FlatList
                      initialNumToRender={1}
                      showsVerticalScrollIndicator={false}
                      key={(_, index) => "trip"+index}
                      keyExtractor={(_, index)=> "trip"+index}
                      data={this.state.combinedTrips}
                      renderItem={({item, index}) => {
                        const city_id = item.city_id;
                        const uid = item.uid;
                        var scrollX = new Animated.Value(0);
                        var places = [...item.places];
                        const orig_places = item.places.map((x) => x);
                        const description = item.description;
                        const color = item.color;
                        const match = item.match;
                        const distance = item.distance;
                        const duration = item.duration;
                        const idx = index;
                        var likes = "0";
                        if (item.likes != null) {
                          likes = item.likes.toString();
                          if (item.likes > 1000) {
                            likes = (likes/1000).toFixed(2).toString()+ 'K';
                          }
                        }
                        places.unshift({"item":0});
                        return(
                          <View>
                          <SharedElement id={`trip.${uid}.view`}>
                            <View style={{height: width*1.4,
                                          width: width,
                                          backgroundColor: PRIMARY,
                                          marginBottom: width*0.05,
                                          borderRadius: normalize(15),
                                          }}/>
                          </SharedElement>
                      <View style={{position: 'absolute',
                                    height: width*1.4,
                                    width: width,
                                    backgroundColor: color,
                                    marginBottom: width*0.05,
                                    borderRadius: normalize(15),
                                    overflow: 'hidden',
                                    alignItems: 'center'}}>
                        <View style={{position: 'absolute',
                                      alignSelf: 'flex-start',
                                      marginTop: height*0.01,
                                      marginLeft: height*0.01}}>
                                        <Text style={{textAlign: 'left',
                                            color: 'white',
                                            fontSize: normalize(18),
                                            fontFamily: 'Montserrat-Regular'}}>{item.label}</Text></View>
                        <View style={{position: 'absolute', justifyContent: 'center', alignItems: 'center', height: height*0.02, width: width, marginTop: width*0.09}}>
                            <View style={{alignItems: 'center', flexDirection: 'row'}}>
                            {places.map(()=>{
                              return(<View style={{aspectRatio: 1,
                                                    borderRadius: 100,
                                                    width: height*0.01,
                                                    marginLeft: height*0.01,
                                                    backgroundColor: 'white'}}/>)})
                            }
                            <Animated.View style={{aspectRatio: 1,
                                                    borderRadius: 100,
                                                    position: 'absolute',
                                                    backgroundColor: 'white',
                                                    width: height*0.02,
                                                    marginLeft: height*0.005,
                                                    transform:[{translateX: Animated.divide(scrollX, width).interpolate({
                                                      inputRange:[0,1],
                                                      outputRange: [0, height*0.02]
                                                    })}]
                                                    }}/>
                            </View>
                        </View>
                        <Animated.FlatList style={{top: width*0.15, height: height*0.4}}
                                  data={places}
                                  horizontal
                                  showsHorizontalScrollIndicator={false}
                                  initialNumToRender={2}
                                  snapToInterval={width}
                                  keyExtractor={(item)=> "place"+uid+item.place_id}
                                  decelerationRate='fast'
                                  onScroll={Animated.event([{nativeEvent: {contentOffset:{x: scrollX}}}], {useNativeDriver: true})}
                                  renderItem={({item, index}) => {
                                    const inputRange = [(index-1)*width, index*width, (index+1)*width]
                                    const translateX = scrollX.interpolate({inputRange, outputRange: [width/1.5, 0, -width/1.5]})
                                    if (index == 0) {
                                      return(<View style={{height: width, width: width}}>
                                        <MapView
                                            style={{height: width*0.75, width: width*0.75, alignSelf: 'center', borderRadius: normalize(15), overflow: 'hidden'}}
                                            region={{
                                                latitude: cityData[city_id]['coordinates']['lat'],
                                                longitude: cityData[city_id]['coordinates']['lng'],
                                            latitudeDelta: 0.2,
                                            longitudeDelta: 0.2
                                            }}
                                            scrollEnabled={false}
                                            pitchEnabled={false}
                                            zoomEnabled={false}
                                            provider={PROVIDER_GOOGLE}
                                            customMapStyle={map_data['dark']}
                                        >
                                          {orig_places.map((item1, index) => {
                                          return <Marker
                                            key={"marker"+index}
                                            tracksViewChanges={false}
                                            coordinate={{latitude: item1['coordinates']['lat'],
                                                        longitude: item1['coordinates']['lng']}}
                                            anchor={{x: 0.5, y: 0.5}}>
                                              <View style={{borderRadius: 1000, overflow: 'hidden'}}>
                                                <View style={{backgroundColor: color, height: normalize(width*0.08), width: normalize(width*0.08), alignItems: 'center', justifyContent: 'center'}}>
                                                  <Text style={{color: 'white',
                                                                textAlign: 'center',
                                                                fontFamily: 'Montserrat-Light',
                                                                fontSize: normalize(16)}}>{index + 1}
                                                    </Text>
                                                  </View>
                                                </View>
                                            </Marker>})}
                                        </MapView>
                                        {<View style={{position: 'absolute', marginTop: width*0.02, marginLeft: width*0.795}}>
                                                  {match==null?<View/>:
                                                  <View style={{justifyContent: 'center', alignItems: 'center'}}>
                                                      <SegmentedRoundDisplay
                                                        style={{justifyContent: 'center', alignItems: 'center', position: 'absolute'}}
                                                        filledArcWidth={2}
                                                        emptyArcWidth={1}
                                                        radius={width*0.04}
                                                        animated={false}
                                                        emptyArcColor={'white'}
                                                        incompleteArcColor={'white'}
                                                        totalArcSize={360}
                                                        displayValue={false}
                                                        segments={[{
                                                                    total: 100,
                                                                    filled: match,
                                                                  }]}/>
                                                    <Text style={{color: 'white',
                                                                  textAlign: 'center',
                                                                  fontFamily: 'Montserrat-Light',
                                                                  fontSize: normalize(18)}}>{match}</Text>
                                              </View>}
                                              </View>}
                                        <View style={{flexDirection: 'row'}}>{description==null?
                                          <View style={{alignSelf: 'flex-start',
                                          marginTop: height*0.01,
                                          height: width*0.34,
                                          width: width*0.7,
                                          marginLeft: height*0.01}}></View>:
                                          <View style={{alignSelf: 'flex-start',
                                                        marginTop: height*0.01,
                                                        height: width*0.34,
                                                        width: width*0.7,
                                                        marginLeft: height*0.01}}>
                                            <Animated.Text style={{textAlign: 'left',
                                                          color: 'white',
                                                          fontSize: height*0.03,
                                                          fontFamily: 'Montserrat-Light',
                                                          transform: [{translateX}]}}>
                                                {description}
                                            </Animated.Text>
                                          </View>}
                                          <View style={{flexDirection: 'column'}}>
                                          <View>
                                            <View style={{flexDirection: 'row', marginTop: height*0.01, alignItems: 'center'}}>
                                            <SpecialIcon style={{color: 'white'}}
                                                        name={"walk"}
                                                        size={normalize(30)}/>
                                            <Text style={{color: 'white',
                                                          fontSize: normalize(16),
                                                          fontFamily: 'Montserrat-Regular'}}>
                                              {Localization.locale=='en-US'||'en-GB'?Math.round(distance/1.609)+" mi":Math.round(distance)+" km"}
                                            </Text>
                                          </View>
                                          <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            <SpecialIcon style={{color: 'white'}}
                                                        name={"clock-outline"}
                                                        size={normalize(30)}/>
                                            <Text style={{color: 'white',
                                                          fontSize: normalize(16),
                                                          fontFamily: 'Montserrat-Regular'}}>
                                              {this.renderDuration(duration)}
                                            </Text>
                                            </View>
                                          </View>
                                          </View>
                                        </View>
                                        <View style={{position: 'absolute', height: width*1.2, width: width}}>
                                          <TouchableOpacity style={{height: width*1.2, width: width}}
                                                          onPress={()=>this.props.navigation.push('TripView', {item: {uid: uid}})} activeOpacity={1}/>
                                        </View>
                                        <View style={{position: 'absolute',
                                                      alignItems: 'center',
                                                      marginTop: width*0.92,
                                                      marginLeft: width*0.72,
                                                      flexDirection: 'row'}}>
                                            <TouchableOpacity onPress={()=>{if (this.state.combinedTrips[idx].liked) {
                                                                                  firebase.firestore().collection("users").doc(this.state.uid).update({liked_trips: firebase.firestore.FieldValue.arrayRemove({"trip_id": this.state.combinedTrips[idx].uid, "city_id": this.state.combinedTrips[idx].city_id})});
                                                                                  firebase.firestore().collection("trips").doc(uid).update({likes: firebase.firestore.FieldValue.increment(-1)});
                                                                                  this.setState(({combinedTrips}) => ({
                                                                                    combinedTrips: [
                                                                                        ...combinedTrips.slice(0, idx),
                                                                                        {
                                                                                          ...combinedTrips[idx],
                                                                                          likes: combinedTrips[idx].likes-1,
                                                                                          liked: false,
                                                                                        },
                                                                                        ...combinedTrips.slice(idx+1),
                                                                                      ]
                                                                                  })); 
                                                                                } else {
                                                                                  firebase.firestore().collection("users").doc(this.state.uid).update({liked_trips: firebase.firestore.FieldValue.arrayUnion({"trip_id": this.state.combinedTrips[idx].uid, "city_id": this.state.combinedTrips[idx].city_id})});
                                                                                  firebase.firestore().collection("trips").doc(uid).update({likes: firebase.firestore.FieldValue.increment(1)});
                                                                                  this.setState(({combinedTrips}) => ({
                                                                                    combinedTrips: [
                                                                                        ...combinedTrips.slice(0, idx),
                                                                                        {
                                                                                          ...combinedTrips[idx],
                                                                                          likes: combinedTrips[idx].likes+1,
                                                                                          liked: true,
                                                                                        },
                                                                                        ...combinedTrips.slice(idx+1),
                                                                                      ]
                                                                                  }));  
                                                                                }
                                                                                }}>
                                              <SpecialIcon style={{color: 'white'}}
                                                          size={normalize(30)}
                                                          name={this.state.combinedTrips[idx].liked?"heart":"heart-outline"}/>
                                            </TouchableOpacity>
                                              <Text style={{textAlign: 'left',
                                                      color: 'white',
                                                      fontSize: normalize(16),
                                                      fontFamily: 'Montserrat-Regular'}}>
                                                {likes}
                                              </Text>
                                        </View>
                                      </View>)
                                    }
                                    return(
                                      <View style={{height: width, width: width}}>
                                        <View style={{height: width, width: width}}>
                                          <Image style={{resizeMode: 'cover', height: width, width: width}}
                                                source={{uri: item.img}}/>
                                          <View style={{alignSelf: 'auto', marginLeft: normalize(10), marginTop: normalize(10), position: 'absolute', overflow: 'hidden', borderRadius: 1000}}>
                                            <TouchableOpacity onPress={() => {const elts = item.img.split('%7C');
                                                                              Linking.openURL("https://www.google.com/maps/contrib/"+elts[elts.length-1].split("?")[0]);}}>
                                              <SpecialIcon style={{color: color, backgroundColor: 'white'}}
                                                            name={'google'}
                                                            size={normalize(26)}/>
                                            </TouchableOpacity>
                                          </View>
                                        </View>
                                        <View style={{width: width, height: width*0.2, overflow: 'hidden'}}>
                                          <Animated.Text style={{color: 'white',
                                                        fontSize: normalize(22),
                                                        fontFamily: 'Montserrat-Regular',
                                                        transform: [{translateX}]}}>
                                            {item.name}
                                          </Animated.Text>
                                        </View>
                                      </View>)
                                  }}/>
                        <View style={{position: 'absolute',
                                      alignSelf: 'flex-end',
                                      marginTop: width*1.3,
                                      flexDirection: 'row',
                                      alignContent: 'space-between'}}>
                                        <Text style={{textAlign: 'center',
                                                    color: 'white',
                                                    width: width*0.5,
                                                    fontSize: normalize(20),
                                                    fontFamily: 'Montserrat-Regular'}}>{cityData[city_id].name}
                                        </Text>
                                        <Text style={{textAlign: 'center',
                                            color: 'white',
                                            width: width*0.5,
                                            fontSize: normalize(20),
                                            fontFamily: 'Montserrat-Regular'}}>{item.author}
                                        </Text>
                        </View>
                      </View>
                        </View>);
                    }}
                    />
                    <View style={{height: height*0.05}}/>
                  </BlurView>)}
            </Animated.ScrollView>
            <Animated.View style={{alignSelf: 'center',
                                  marginTop: normalize(50),
                                  height: width*0.4,
                                  width: width*0.83,
                                  position: 'absolute',
                                  flexDirection: 'row',
                                  transform: [{
                                    translateY: this.state.scrollY.interpolate({inputRange: [0, 100], outputRange: [0, -300]})
                                  }]}}>
              <SharedElement id={`city.${item.city_id}.cityView`}>
                <View style={{position: 'absolute',
                              backgroundColor: this.props.route.params.color==null?PRIMARY:this.props.route.params.color,
                              height: width*0.4,
                              width: width*0.83,
                              borderRadius: normalize(15)}}/>
              </SharedElement>
              <View style={{position: 'absolute', width: width*0.83}}/>
                <View style={{justifyContent: 'space-between', flex: 1}}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <SharedElement id={`city.${item.city_id}.title`}>
                      <Image style={{height: width*0.37,
                                    borderWidth: 1,
                                    borderColor: 'white',
                                    borderRadius: normalize(15),
                                    aspectRatio: 1,
                                    marginLeft: Math.round(height*0.005),
                                    marginTop: Math.round(height*0.005),
                                    marginBottom: Math.round(height*0.005)}}
                              source={{uri: "https://storage.googleapis.com/pyxy_place_images/title_images/"+item.city_id+".png"}}/>
                    </SharedElement>
                    <View style={{height: height*0.1, flexDirection: 'column', right: width*0.01}}>
                      <SharedElement id={`city.${item.city_id}.cityName`}>
                        <Text style={{color: 'white',
                                      width: width*0.41,
                                      alignSelf: 'flex-end',
                                      textAlign: 'right',
                                      fontFamily: 'Montserrat-Light',
                                      fontSize: normalize(21)}}>
                          {item.name}
                        </Text>
                      </SharedElement>
                      <SharedElement id={`city.${item.city_id}.countryName`}>
                        <Text style={{color: 'white',
                                      width: width*0.41,
                                      alignSelf: 'flex-end',
                                      textAlign: 'right',
                                      fontFamily: 'Montserrat-Light',
                                      fontSize: normalize(23)}}>
                          {item.country}
                        </Text>
                      </SharedElement>
                    </View>
                  </View>
                  <View style={{width: width*0.48, alignSelf: 'flex-end',
                                position: 'absolute', justifyContent: 'flex-end',
                                flexDirection: 'row', top: '70%', right: Math.round(width*0.01)}}>
                    {(this.state.advisory != null)?(
                      <View style={{width: width*0.09, aspectRatio: 1, justifyContent: 'flex-end', alignItems: 'center', marginRight: normalize(width*0.01)}}>
                      <TouchableOpacity onPress={() => this.setState({advVisible: true})}>
                        <SpecialIcon style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 15, color: 'white'}}
                            name={'alert-octagon-outline'}
                            size={width*0.065}/>
                      </TouchableOpacity></View>):(<View/>)
                    }
                    <View style={{width: width*0.09, aspectRatio: 1, justifyContent: 'flex-end', alignItems: 'center', marginRight: normalize(width*0.01)}}>
                      <TouchableOpacity onPress={() => {if (this.state.liked) {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({liked_cities: firebase.firestore.FieldValue.arrayRemove(this.state.selected_city)});
                                                          this.setState({liked: false});
                                                        } else {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({liked_cities: firebase.firestore.FieldValue.arrayUnion(this.state.selected_city)});
                                                          this.setState({liked: true});}}}>
                      {(this.state.liked)?(<SpecialIcon style={{borderWidth: 1, padding: 3, backgroundColor: 'white', overflow: 'hidden', borderColor: PRIMARY, borderRadius: 15, color: PRIMARY}}
                          name={'heart-outline'}
                          size={width*0.065}/>):
                      (<SpecialIcon style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 15, color: 'white'}}
                          name={'heart-outline'}
                          size={width*0.065}/>)}
                      </TouchableOpacity>
                    </View>
                    <View style={{width: width*0.09, aspectRatio: 1, justifyContent: 'flex-end', alignItems: 'center', marginRight: normalize(width*0.01)}}>
                      <TouchableOpacity onPress={() => {if (this.state.saved) {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({saved_cities: firebase.firestore.FieldValue.arrayRemove(this.state.selected_city)});
                                                          this.setState({saved: false});
                                                        } else {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({saved_cities: firebase.firestore.FieldValue.arrayUnion(this.state.selected_city)});
                                                          this.setState({saved: true});}}}>
                      {(this.state.saved)?(<SpecialIcon style={{borderWidth: 1, padding: 3, backgroundColor: 'white', overflow: 'hidden', borderColor: PRIMARY, borderRadius: 15, color: PRIMARY}}
                          name={'book-outline'}
                          size={width*0.065}/>):
                      (<SpecialIcon style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 15, color: 'white'}}
                          name={'book-outline'}
                          size={width*0.065}/>)}
                      </TouchableOpacity>
                    </View>
                    <View style={{justifyContent: 'center',aspectRatio: 1}}>
                      {this.state.cityMatch==null?
                        (<MaterialIndicator color={'white'} animating={this.state.loading}/>):
                        (<View style={{justifyContent: 'center', alignItems: 'center'}}>
                          <TouchableOpacity style={{position: 'absolute', justifyContent: 'center', alignItems: 'center'}} onPress={()=>this.setState({scoreModal: true})}>
                            <SegmentedRoundDisplay
                              style={{aspectRatio: 1, position: 'absolute'}}
                              filledArcWidth={2}
                              emptyArcWidth={1}
                              radius={width*0.04}
                              animated={false}
                              emptyArcColor={'white'}
                              incompleteArcColor={'white'}
                              totalArcSize={360}
                              displayValue={false}
                              segments={[{
                                          total: 100,
                                          filled: this.state.cityMatch,
                                        }]}/>
                            <Text style={{color: 'white',
                                          textAlign: 'center',
                                          fontFamily: 'Montserrat-Light',
                                          fontSize: normalize(18)}}>{this.state.cityMatch}</Text>
                          </TouchableOpacity></View>)}
                    </View>
                  </View>
                </View>
            </Animated.View>
            <View style={{position: 'absolute', marginLeft: height*0.01, marginTop: height*0.01}}>
              <TouchableOpacity onPress={() => {this.props.navigation.goBack()}}>
                <View style={{width: normalize(40), backgroundColor: SECONDARY, aspectRatio: 1, justifyContent: 'center', alignItems: 'center',borderRadius: 1000, overflow: 'hidden'}}>
                  <SpecialIcon style={{color: 'white'}}
                      name={'arrow-left'}
                      size={normalize(30)}/>
                </View>
              </TouchableOpacity>
            </View>
            <View style={{position: 'absolute', alignSelf: "flex-end", right: height*0.01, marginTop: height*0.01}}>
              <TouchableOpacity onPress={()=>{this.props.navigation.push('CityMap', {item, uid: this.state.uid, trips: this.state.trips, advisory: this.state.advisory, liked: this.state.liked, saved: this.state.saved, cityMatch: this.state.cityMatch})}}>
                <View style={{width: normalize(40), backgroundColor: SECONDARY, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 1000, overflow: 'hidden'}}>
                  <SpecialIcon style={{color: 'white'}}
                      name={'map-marker'}
                      size={normalize(30)}/>
                </View>
              </TouchableOpacity>
            </View>
      <Modal isVisible={this.state.advVisible}
             onBackdropPress={() => this.setState({advVisible: false})}
             deviceWidth={width} deviceHeight={height}>
        {this.getAdvContent(item)}
      </Modal>
      <Modal isVisible={this.state.scoreModal}
             onBackdropPress={() => this.setState({scoreModal: false})}
             deviceWidth={width} deviceHeight={height}>
        {this.getScoreModal()}
      </Modal>
    </SafeAreaView>);
  }
}

export default CityView;
