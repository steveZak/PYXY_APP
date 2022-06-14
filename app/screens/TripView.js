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
import Modal from 'react-native-modal';
import * as firebase from 'firebase';
import 'firebase/firestore';
import * as Animatable from 'react-native-animatable';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SegmentedRoundDisplay from 'react-native-segmented-round-display';
import * as Localization from 'expo-localization';
import {MaterialIndicator} from 'react-native-indicators';
import { SharedElement } from 'react-navigation-shared-element';
import normalize from 'react-native-normalize';
import iconNames from '../assets/icons.json';
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SERVER_ADDR, PRIMARY, SECONDARY, COLOR2, COLOR3} from '../settings.js';

let cityData = require('../assets/city_data.json');
const { height, width } = Dimensions.get('window');

const colors = [PRIMARY, SECONDARY, COLOR2, COLOR3];

class TripView extends React.Component {

  static sharedElements=(navigation, otherNavigation, showing)=>{
    if ((otherNavigation.state.routeName === 'CityView' || otherNavigation.state.routeName === 'Home' || otherNavigation.state.routeName === 'Feed' || otherNavigation.state.routeName === 'Profile') && showing) {
        const item = navigation.getParam('item');
          return [{id: `trip.${item.uid}.view`, animation: 'move'}, {id: `trip.${item.uid}.icon`, animation: 'move'}, {id: `trip.${item.uid}.tripName`, animation: 'move'}];
    }
  }

  state = {
    uid: null,
    city_id: null,
    liked: false,
    saved: false,
    yours: this.props.route.params.yours,
    created: false,
    label: "",
    loading: false,
    selected_trip: this.props.route.params.item.uid,
    selected_trip_info: null,
    mc: null,
    privacy: 'private',
    scrollY: new Animated.Value(0),
    scoreModal: false
  }

  async componentDidMount() {
    const uid = await AsyncStorage.getItem('uid');
    this.setState({loading: true});
    this.getTripInfo(this.state.selected_trip, uid);
    firebase.firestore().collection("users").doc(uid).get()
                                .then(snapshot => {
                                  var user_data = snapshot.data();
                                  var isLiked = false;
                                  var isSaved = false;
                                  var privacy = 'private';
                                  for (var i in user_data.liked_trips) {
                                    if (this.state.selected_trip == user_data.liked_trips[i].trip_id) {
                                      isLiked = true;
                                    }
                                  }
                                  for (var i in user_data.saved_trips) {
                                    if (this.state.selected_trip == user_data.saved_trips[i].trip_id) {
                                      isSaved = true;
                                      privacy = user_data.saved_trips[i].privacy;
                                    }
                                  }
                                  this.setState({uid: uid, liked: isLiked, saved: isSaved, privacy: privacy});
                                });
  }

  async getTripInfo(trip, uid) {
    var trip_info;
    var city_id = "";
    var stop = firebase.firestore().collection("trips").doc(trip).onSnapshot(snapshot => {
                            trip_info = snapshot.data();
                            // const idx = this.state.selected_trip.lastIndexOf("_");
                            // var city_id = this.state.selected_trip.slice(0, idx-2);
                            if (typeof trip_info === 'object' && trip_info !== null) {
                              var city_id = trip_info.city_id;
                              var label;
                              if (trip_info.tag=="yours") {
                                label = "For you"
                              } else if (trip_info.tag=="created") {
                                label = trip_info.name
                              } else {
                                label = this.props.route.params.item['uid'].split("_").pop();
                              }
                              this.setState({selected_trip_info: trip_info, city_id: city_id, yours: trip_info.tag=="yours"?true:false, created: trip_info.tag=="created"?true:false, label: label});
                              this.getImageURLs(city_id, trip_info.sights, uid, trip);
                              stop();
                              firebase.firestore().collection("users").doc(uid).update({looked_trips: firebase.firestore.FieldValue.arrayUnion({trip_id: this.state.selected_trip, city_id: city_id}), needs_update: Math.random()<0.5?true:false})
                            }
                          })
  }

  async getImageURLs(city_id, places, uid, trip) {
    await fetch(SERVER_ADDR + "/get_trip_images?city_id=" + city_id + "&trip_id=" + trip, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json'
                  }})
                    .then(response => response.json())
                    .then(responseJson => {
                      var i = 0;
                      for(var img in responseJson.imgs) {
                        places[i].img = responseJson.imgs[places[i].place_id];
                        i++;
                      }
                    });
    // this.setState({places: places});
    for(var i=0; i<places.length; i++) {
      await fetch(SERVER_ADDR+"/get_match?city_id="+city_id+"&place_id="+places[i].place_id+"&id="+uid, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }}).then(response => response.json()).then(responseJson => places[i].mc=responseJson.mc)
    }
    await fetch(SERVER_ADDR+"/get_match?city_id="+city_id+"&trip_id="+trip+"&id="+uid, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }}).then(response => response.json()).then(responseJson => this.setState({mc: Math.round(responseJson.mc*100)}))
    this.setState({loading: false});
    var new_trip_info = this.state.selected_trip_info
    new_trip_info.places = places
    this.setState({selected_trip_info: new_trip_info, uid: uid});
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

  renderDuration(duration){
    var botDuration = (Math.floor(duration*2)/2).toFixed(1).toString();
    var topDuration = (Math.ceil(duration*2)/2).toFixed(1).toString();
    botDuration=botDuration.charAt(botDuration.length-1)=='0'?botDuration.slice(0, botDuration.length-2):botDuration;
    topDuration=topDuration.charAt(topDuration.length-1)=='0'?topDuration.slice(0, topDuration.length-2):topDuration;
    return botDuration + " - " + topDuration + " hr";
  }

  render() {
    // const {item} = this.props.route.params;
    return (<SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
              <Animated.ScrollView showsVerticalScrollIndicator={false}
                              onScroll={Animated.event([{nativeEvent: { contentOffset: { y: this.state.scrollY}}}], {useNativeDriver: true})}
                        style={{height: height, width: width, position: 'absolute'}}>
                <View style={{marginTop: Math.round(height*0.35)}}>
                  <Text style={{color: PRIMARY,
                                fontFamily: 'Montserrat-Regular',
                                fontSize: normalize(24)}}>{' Places'}
                  </Text>
                  {this.state.yours&&this.state.selected_trip_info==null?<View style={{alignSelf: 'center'}}><Text style={{textAlign: 'center', fontFamily: 'Montserrat-Regular', fontSize: width*0.04}}>{"Please wait, our pyxys are making a trip just for you!\nThis usually takes about 5 seconds"}</Text></View>:<View/>}
                  {(this.state.selected_trip_info==null)?
                  (<FlatList contentContainerStyle={{justifyContent: 'center', marginLeft: '1%'}}
                              data={[0,0,0,0,0,0,0,0]}
                              pagingEnabled={true}
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
                  />):(
                  <FlatList contentContainerStyle={{justifyContent: 'center'}}
                              style={{marginTop: '4%'}}
                              data={this.state.selected_trip_info.sights}
                              pagingEnabled={false}
                              scrollEnabled={false}
                              showsVerticalScrollIndicator={false}
                              snapToAlignment={"start"}
                              decelerationRate={"fast"}
                              renderItem={({item, index}) => {return (<View style={{flexDirection: "row",
                              marginTop: '4%', justifyContent: "center",
                              alignContent: "center",
                              alignItems: "center",}}>
                        <Animatable.View animation={"fadeIn"} duration={250} delay={150+index*100}
                              style={{height: Math.round(0.2*width),
                                      width: Math.round(0.9*width),
                                      borderRadius: normalize(15)}}>
                        <TouchableOpacity style={{flex: 1, justifyContent: 'flex-end'}}
                                          onPress={()=>{this.props.navigation.push('SightView', {item, city_id:this.state.city_id})}}>
                          <SharedElement id={`sight.${item.place_id}.view`}>
                            <View style={{height: 0.2*width,
                                          width: 0.9*width,
                                          flexDirection: "row", borderRadius: normalize(15), backgroundColor: PRIMARY, overflow: 'hidden'}}/>
                          </SharedElement>
                          <View style={{flexDirection: "row", position: 'absolute', borderRadius: normalize(15), backgroundColor: PRIMARY, overflow: 'hidden'}}>
                            {(item.img!="")?<Image source={{uri: item.img}} style={{width: 0.2*width, height: 0.2*width, marginRight: 0.01*width}}/>:<View style={{backgroundColor: 'rgb(175, 175, 175)', marginRight: 0.01*width, width: Math.round(0.2*width), height: Math.round(0.2*width)}}/>}
                            <SharedElement id={`sight.${item.place_id}.placeName`}>
                              <View style={{width: 0.6*width,
                                            height: 0.2*width,
                                            justifyContent: 'center'}}>
                                <Text style={{textAlign: 'left',
                                              color: 'white',
                                              fontSize: normalize(18),
                                              fontFamily: 'Montserrat-Regular'}}>
                                  {item.name}
                                </Text>
                              </View>
                            </SharedElement>
                            <View style={{alignItems: 'center', width: width*0.1, justifyContent: 'center'}}>
                              {item.mc==null?
                              (<MaterialIndicator color={'white'} animating={true}/>):
                              (<TouchableOpacity style={{ justifyContent: 'center', alignItems: 'center'}} onPress={()=>this.setState({scoreModal: true})}>
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
                                </TouchableOpacity>)
                              }
                            </View>
                          </View>
                          </TouchableOpacity>
                        </Animatable.View>
                        </View>);}}
                      keyExtractor={(_, idx) => 'idx'+idx}
                  />)}
                </View>
                <View style={{height: height*0.1}}/>
              </Animated.ScrollView>
              <Animated.View
                        style={{position: 'absolute',
                                alignSelf: 'center',
                                transform: [{
                                  translateY: this.state.scrollY.interpolate({inputRange: [0, 100], outputRange: [0, -200]}, {useNativeDriver: true})
                                }]
                        }}>
                <SharedElement id={`trip.${this.state.selected_trip}.view`}>
                  <View style={{backgroundColor: this.props.route.params.color==null?PRIMARY:this.props.route.params.color,
                                marginTop: normalize(50),
                                height: Math.round(height*0.22),
                                width: Math.round(width*0.83),
                                borderRadius: normalize(15)}}/>
                </SharedElement>
                <View style={{
                              marginTop: normalize(50),
                              height: Math.round(height*0.22),
                              width: Math.round(width*0.83),
                              position: 'absolute'}}>
                  <View style={{flexDirection: 'column', marginLeft: width*0.01}}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <SharedElement id={`trip.${this.state.selected_trip}.icon`}>
                        <SpecialIcon style={{color: 'white'}}
                            name={this.state.label=="For you"?"heart":iconNames.iconNames[this.state.label]}
                            size={normalize(35)}/>
                      </SharedElement>
                      <SharedElement id={`trip.${this.state.selected_trip}.tripName`}>
                        <Text style={{color: 'white',
                                      alignSelf: 'center',
                                      fontSize: normalize(18),
                                      fontFamily: 'Montserrat-Regular'}}>
                          {this.state.label}
                        </Text>
                      </SharedElement>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <SpecialIcon style={{color: 'white'}}
                                  name={"walk"}
                                  size={normalize(35)}/>
                      <Text style={{color: 'white',
                                    fontSize: normalize(18),
                                    fontFamily: 'Montserrat-Regular'}}>
                        {this.state.selected_trip_info==null?"":Localization.locale=='en-US'||'en-GB'?Math.round(this.state.selected_trip_info.walk_dist/1.609)+" mi":Math.round(this.state.selected_trip_info.walk_dist)+" km"}
                      </Text>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <SpecialIcon style={{color: 'white'}}
                                  name={"clock-outline"}
                                  size={normalize(35)}/>
                      <Text style={{color: 'white',
                                    fontSize: normalize(18),
                                    fontFamily: 'Montserrat-Regular'}}>
                        {this.state.selected_trip_info==null?"- hr":this.renderDuration(this.state.selected_trip_info.duration)}
                      </Text>
                    </View>
                  </View>
                  <View style={{position: 'absolute',
                                marginTop: normalize(32),
                                alignSelf: 'flex-end'}}>
                    <TouchableOpacity onPress={() => {const country = cityData[this.state.city_id].full_name.split(", ");
                                                      this.props.navigation.push('CityView', {item: {name: cityData[this.state.city_id].name, country: country[country.length-1], city_id: this.state.city_id}})}}>
                      <Text style={{alignSelf: 'flex-end',
                                    textAlign: 'right',
                                    color: 'white',
                                    fontSize: normalize(26),
                                    fontFamily: 'Montserrat-Regular'}}>{this.state.city_id==null?"":cityData[this.state.city_id].name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{width: Math.round(width*0.5), alignSelf: 'flex-end',
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
                    {this.state.selected_trip_info==null?<View/>:<View style={{width: width*0.09, aspectRatio: 1, justifyContent: 'flex-end', alignItems: 'center', marginRight: normalize(width*0.01)}}>
                      <TouchableOpacity onPress={() => {if (this.state.liked) {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({liked_trips: firebase.firestore.FieldValue.arrayRemove({"trip_id": this.state.selected_trip, "city_id": this.state.city_id})});
                                                          if (this.state.created || this.state.yours) {
                                                            firebase.firestore().collection("trips").doc(uid).update({likes: firebase.firestore.FieldValue.increment(-1)});
                                                          }
                                                          this.setState({liked: false});
                                                        } else {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({liked_trips: firebase.firestore.FieldValue.arrayUnion({"trip_id": this.state.selected_trip, "city_id": this.state.city_id})});
                                                          if (this.state.created || this.state.yours) {
                                                            firebase.firestore().collection("trips").doc(uid).update({likes: firebase.firestore.FieldValue.increment(1)});
                                                          }
                                                          this.setState({liked: true});}}}>
                      {(this.state.liked)?(<SpecialIcon style={{borderWidth: 1, padding: 3, backgroundColor: 'white', overflow: 'hidden', borderColor: PRIMARY, borderRadius: 15, color: PRIMARY}}
                          name={'heart-outline'}
                          size={width*0.065}/>):
                      (<SpecialIcon style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 15, color: 'white'}}
                          name={'heart-outline'}
                          size={width*0.065}/>)}
                      </TouchableOpacity>
                    </View>}
                    {this.state.selected_trip_info==null?<View/>:<View style={{width: width*0.09, aspectRatio: 1, justifyContent: 'flex-end', alignItems: 'center', marginRight: normalize(width*0.01)}}>
                      <TouchableOpacity onPress={() => {if (this.state.saved) {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({saved_trips: firebase.firestore.FieldValue.arrayRemove({"trip_id": this.state.selected_trip, "city_id": this.state.city_id, "privacy": this.state.privacy})});
                                                          this.setState({saved: false});
                                                        } else {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({saved_trips: firebase.firestore.FieldValue.arrayUnion({"trip_id": this.state.selected_trip, "city_id": this.state.city_id, "privacy": 'private'})});
                                                          this.setState({saved: true});}}}>
                      {(this.state.saved)?(<SpecialIcon style={{borderWidth: 1, padding: 3, backgroundColor: 'white', overflow: 'hidden', borderColor: PRIMARY, borderRadius: 15, color: PRIMARY}}
                          name={'book-outline'}
                          size={width*0.065}/>):
                      (<SpecialIcon style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 15, color: 'white'}}
                          name={'book-outline'}
                          size={width*0.065}/>)}
                      </TouchableOpacity>
                    </View>}
                    <View style={{justifyContent: 'center',aspectRatio: 1}}>
                      {this.state.mc==null?
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
                                          filled: this.state.mc,
                                        }]}/>
                            <Text style={{color: 'white',
                                          textAlign: 'center',
                                          fontFamily: 'Montserrat-Light',
                                          fontSize: normalize(18)}}>{this.state.mc}</Text>
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
                <TouchableOpacity onPress={()=>{this.props.navigation.push('TripMap', {item: this.props.route.params.item, city_id: this.state.city_id, selected_trip: this.state.selected_trip, liked: this.state.liked, saved: this.state.saved, mc: this.state.cityMatch, yours: this.state.cityMatch})}}>
                  <View style={{width: normalize(40), backgroundColor: SECONDARY, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 1000, overflow: 'hidden'}}>
                    <SpecialIcon style={{color: 'white'}}
                        name={'map-marker'}
                        size={normalize(30)}/>
                  </View>
                </TouchableOpacity>
              </View>
              <Modal isVisible={this.state.scoreModal}
                     onBackdropPress={() => this.setState({scoreModal: false})}
                     deviceWidth={width} deviceHeight={height}>
                {this.getScoreModal()}
              </Modal>
            </SafeAreaView>);
  }
}

export default TripView;
