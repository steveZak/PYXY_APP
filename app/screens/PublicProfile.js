import React from 'react';
import {
  Dimensions,
  View,
  ScrollView,
  Image,
  Linking,
  Text,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import Modal from 'react-native-modal';
// import * as Permissions from 'expo-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialIndicator} from 'react-native-indicators';
import * as firebase from 'firebase';
import {TouchableOpacity} from 'react-native-gesture-handler';
import 'firebase/firestore';
import SwipeButton from 'rn-swipe-button';
import SegmentedRoundDisplay from 'react-native-segmented-round-display';
import * as Localization from 'expo-localization';
// import Recording from "react-native-recording";
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import normalize from 'react-native-normalize';
import { SERVER_ADDR, PRIMARY, SECONDARY, COLOR0, COLOR1, COLOR2, COLOR3 } from '../settings.js';
import iconNames from '../assets/icons.json';
import * as map_data from "../assets/map_styles.json";
import MapView, {PROVIDER_GOOGLE, Marker} from 'react-native-maps';
import { SharedElement } from 'react-native-shared-element';
import avgCats from '../assets/avg_cats.json';

let cityData = require('../assets/city_data.json');
const { height, width } = Dimensions.get('window');
names = ["Keep calm and travel on", "A mile at a time", "The great escape", "Hand luggage only", "Buckle your seatbelt"]

const colors = [PRIMARY, SECONDARY, COLOR0, COLOR1, COLOR2, COLOR3];

icon = {'private': 'lock', 'limited': 'account-group-outline', 'public': 'earth'}

export default class Profile extends React.Component {

  state = {
    uid: null,
    combinedTrips: [],
    loading: false,
    tripMode: false,
    picture: null,
    userName: "Anonymous",
  };

  async componentDidMount() {
    const uid = await AsyncStorage.getItem('uid');
    // const name = await AsyncStorage.getItem('name');
    this.loadTrips(uid);
  }

  async loadTrips(uid) { // make some pagination in the future
    this.setState({loading: true});
    var st = [];
    await firebase.firestore().collection("users").doc(uid).get()
          .then(snapshot => {
            var user_data = snapshot.data();
            st = user_data.saved_trips
            // cats: user_data.cat_params
            this.setState({uid: uid,
                           picture: user_data.profile_pic,
                           userName: (user_data.first_name == "")?"Anonymous":user_data.first_name,
                          });
            // this.getPreferences(user_data.cat_params);
          })
    var qSnap = await firebase.firestore().collection("trips").where("user_id", "==", uid).where('tag', '==', 'created').get()
    var combinedTrips = []
    var saved_trips_ids = []
    qSnap.forEach((doc) => {
      const trip_data = doc.data();
      var author = "";
      if (trip_data.user_id==uid) {
        author = "Created by you";
      } else {
        author = "By Anonymous"; // This is never true, always in saved?
      }
      var description = trip_data.description;
      if (description.length==0) {
        description="From the "+trip_data.sights[0].name + " to the " + trip_data.sights[trip_data.sights.length-1].name
      }
      combinedTrips.push({user_id: trip_data.user_id, places: trip_data.sights, distance: trip_data.walk_dist, duration: trip_data.duration, color: colors[Math.round(Math.random()*(colors.length-1))], author: author, uid: doc.id, type: 'created', tag: 'created', city: cityData[trip_data.city_id].name, city_id: trip_data.city_id, label: trip_data.name, likes: trip_data.likes, description: description, privacy: trip_data.privacy});
    });
    saved_trips_ids = {}
    for (var i in st) {
      saved_trips_ids[st[i].trip_id] = st[i].privacy
    }
    if (Object.keys(saved_trips_ids).length > 0) {
      qSnap = await firebase.firestore().collection("trips").where(firebase.firestore.FieldPath.documentId(), 'in', Object.keys(saved_trips_ids).slice(0,10)).get()
      qSnap.forEach((doc, index) => {
        const trip_data = doc.data();
        var label = ""
        var description = ""
        var author = ""
        if (trip_data.tag=='created') {
          label = trip_data.name
          description = trip_data.description
          if (trip_data.user_id==uid) {
            author = "Created by you";
          } else {
            author = "By Anonymous";
          }
        } else if (trip_data.tag=='yours') {
          description = "From the " + trip_data.sights[0].name + " to the " + trip_data.sights[trip_data.sights.length-1].name
          label = "Your " + cityData[trip_data.city_id].name
          author = "For you"
        } else {
          description="From the "+trip_data.sights[0].name + " to the " + trip_data.sights[trip_data.sights.length-1].name
          const elts = doc.id.split('_')
          author = "From the Pyxys"
          label = elts[elts.length-2]=="T"?' ' + cityData[trip_data.city_id].name + ' ' + elts[elts.length-1]:elts[elts.length-1] + ' ' + cityData[trip_data.city_id].name
        }
        combinedTrips.push({user_id: trip_data.user_id, places: trip_data.sights, distance: trip_data.walk_dist, duration: trip_data.duration, color: colors[Math.round(Math.random()*(colors.length-1))], author: author, description: description, uid: doc.id, type: 'saved', tag: trip_data.tag, city: cityData[trip_data.city_id].name, city_id: trip_data.city_id, label: label, likes: trip_data.likes, privacy: saved_trips_ids[doc.id]});
      });
    }
    // icons: this.getIcons(trip_data.global_cat_params), 
    this.setState({combinedTrips: combinedTrips, loading: false, saved_trips_ids: saved_trips_ids});
    this.getImageURLs(combinedTrips, uid);
  }

  async loadExtra() {
    this.setState({loading: true});
    var combinedTrips = []
    if (Object.keys(this.state.saved_trips_ids).length > this.state.combinedTrips.length) {
      var qSnap = await firebase.firestore().collection("trips").where(firebase.firestore.FieldPath.documentId(), 'in', Object.keys(this.state.saved_trips_ids).slice(this.state.combinedTrips.length, this.state.combinedTrips.length+10)).get()
      qSnap.forEach((doc, index) => {
        const trip_data = doc.data();
        var label = ""
        var description = ""
        var author = ""
        if (trip_data.tag=='created') {
          label = trip_data.name
          description = trip_data.description
          if (trip_data.user_id==uid) {
            author = "Created by you";
          } else {
            author = "By Anonymous";
          }
        } else if (trip_data.tag=='yours') {
          description = "From the " + trip_data.sights[0].name + " to the " + trip_data.sights[trip_data.sights.length-1].name
          label = "Your " + cityData[trip_data.city_id].name
          author = "For you"
        } else {
          description="From the "+trip_data.sights[0].name + " to the " + trip_data.sights[trip_data.sights.length-1].name
          const elts = doc.id.split('_')
          author = "From the Pyxys"
          label = elts[elts.length-2]=="T"?' ' + cityData[trip_data.city_id].name + ' ' + elts[elts.length-1]:elts[elts.length-1] + ' ' + cityData[trip_data.city_id].name
        }
        combinedTrips.push({user_id: trip_data.user_id, places: trip_data.sights, distance: trip_data.walk_dist, duration: trip_data.duration, color: colors[Math.round(Math.random()*(colors.length-1))], author: author, description: description, uid: doc.id, type: 'saved', tag: trip_data.tag, city: cityData[trip_data.city_id].name, city_id: trip_data.city_id, label: label, likes: trip_data.likes, privacy: this.state.saved_trips_ids[doc.id]});
      });
      var combined = this.state.combinedTrips;
      combined.push(...combinedTrips);
      this.setState({combinedTrips: combined, loading: false});
      this.getImageURLs(combined, this.state.uid);
    }
  }

  getIcons(cats) {
    var topCats = [];
    for(var i = 0; i<4; i++) {
      const maxIdx = cats.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
      topCats.push(avgCats["cat_names"][maxIdx]);
      cats[maxIdx] = -100;
    }
    return topCats
  }

  async getImageURLs(combinedTrips, uid) {
    for (var i in combinedTrips) {
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
    this.setState({combinedTrips: combinedTrips});
    for (var i in combinedTrips) {
      await fetch(SERVER_ADDR+"/get_name?uid="+combinedTrips[i].user_id)
                  .catch(error => {})
                  .then(response => response.json())
                  .then(responseJson => {if(combinedTrips.user_id==this.state.uid && responseJson.name.length > 0){combinedTrips[i].author = "By " + responseJson.name}});
      await fetch(SERVER_ADDR+"/get_match?city_id="+combinedTrips[i].city_id+"&trip_id="+combinedTrips[i].uid+"&id="+uid, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }}).then(response => response.json()).then(responseJson => combinedTrips[i].match = Math.round(responseJson.mc*100))
    }
    this.setState({combinedTrips: combinedTrips});
  }

  renderDuration(duration){
    var botDuration = (Math.floor(duration*2)/2).toFixed(1).toString();
    var topDuration = (Math.ceil(duration*2)/2).toFixed(1).toString();
    botDuration=botDuration.charAt(botDuration.length-1)=='0'?botDuration.slice(0, botDuration.length-2):botDuration;
    topDuration=topDuration.charAt(topDuration.length-1)=='0'?topDuration.slice(0, topDuration.length-2):topDuration;
    return botDuration + " - " + topDuration + " hr";
  }

  render() {
    const offsets = this.state.combinedTrips==null?[0]:this.state.combinedTrips.map((_,index)=>index*(width*1.45)+height*0.2+width*0.35-(height-width*1.45)/2);
    return (<SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
              {(!this.state.loading && this.state.combinedTrips.length==0)?
              <ScrollView
                  refreshControl={<RefreshControl tintColor={PRIMARY} 
                  onRefresh={()=>this.loadTrips(this.state.uid)} 
                  refreshing={this.state.loading} />}>
                <View style={{height: width*0.2, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, marginBottom: width*0.05}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                    {(this.state.picture==null)?
                        (<View style={{height: width*0.15, width: width*0.15, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY, borderRadius: 1000, overflow: 'hidden'}}>
                          <Text style={{color: 'white', fontFamily: 'Montserrat-Light', fontSize: normalize(30)}}>
                            {this.state.userName[0]}
                          </Text>
                        </View>):
                        (<Image style={{height: width*0.15, width: width*0.15, borderRadius: 1000}}
                                source={{uri: this.state.picture}}/>)}
                    <View style={{width: width*0.7, height: width*0.15, justifyContent: 'center'}}>
                      <Text style={{marginLeft: width*0.05, fontFamily: 'Montserrat-Light', fontSize: normalize(30)}}>
                        {this.state.userName}
                      </Text>
                    </View>
                  </View>
                </View>
                <View>
                  <Text style={{width: width, height: height*0.05, fontFamily: 'Montserrat-Light', alignSelf: 'center', textAlign: 'center', fontSize: width*0.04}}>{"Nothing here yet, save or make some trips!"}</Text>
                </View>
                <TouchableOpacity onPress={()=>this.props.navigation.push("Search")}>
                  <View style={{width: width*0.8, height: width*0.3, backgroundColor: PRIMARY, borderRadius: 15, overflow: 'hidden', alignSelf: 'center'}}>
                    <View style={{position: 'absolute', width: width*0.25, aspectRatio: 1, alignSelf: 'center'}}>
                      <SpecialIcon style={{marginTop: width*0.025}} color={'white'} size={width*0.25} name={"plus"}/>
                    </View>
                    <Text style={{color: 'white', fontSize: width*0.04, fontFamily: "Montserrat-Regular"}}>{"  Create a trip"}</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>:
              <FlatList data={this.state.combinedTrips}
                        style={{flex: 1, height: height}}
                        showsVerticalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onScroll={(event) => {if (this.state.combinedTrips.length>9 && this.state.combinedTrips.length-(event.nativeEvent.contentOffset.y/(width*1.45))<2 && !this.state.loading){
                            this.loadExtra();
                        }}}
                        refreshControl={
                          <RefreshControl tintColor={PRIMARY} 
                                          onRefresh={()=>this.loadTrips(this.state.uid)} 
                                          refreshing={this.state.loading} />}
                        ListHeaderComponent={()=>
                          {return(<View><View style={{height: width*0.2, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, marginBottom: width*0.05}}>
                          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                            <TouchableOpacity onPress={()=> this.setState({settings: true})}
                                              style={{borderRadius: 1000, marginHorizontal: width*0.02, overflow: 'hidden', borderWidth: 1}}>
                              <SpecialIcon size={width*0.1} name={'cog-outline'}/>
                            </TouchableOpacity>
                            {(this.state.picture==null)?
                                (<View style={{height: width*0.15, width: width*0.15, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY, borderRadius: 1000, overflow: 'hidden'}}>
                                  <Text style={{color: 'white', fontFamily: 'Montserrat-Light', fontSize: normalize(30)}}>
                                    {this.state.userName[0]}
                                  </Text>
                                </View>):
                                (<Image style={{height: width*0.15, width: width*0.15, borderRadius: 1000}}
                                        source={{uri: this.state.picture}}/>)}
                            <View style={{width: width*0.7, height: width*0.15, justifyContent: 'center'}}>
                              <Text style={{marginLeft: width*0.05, fontFamily: 'Montserrat-Light', fontSize: normalize(30)}}>
                                {this.state.userName}
                              </Text>
                            </View>
                          </View>
                          </View>
                          <TouchableOpacity onPress={()=>this.props.navigation.push("Search")}>
                              <View style={{width: width*0.8, height: width*0.3, backgroundColor: PRIMARY, borderRadius: 15, overflow: 'hidden', alignSelf: 'center', marginBottom: width*0.05}}>
                                <View style={{position: 'absolute', width: width*0.25, aspectRatio: 1, alignSelf: 'center'}}>
                                  <SpecialIcon style={{marginTop: width*0.025}} color={'white'} size={width*0.25} name={"plus"}/>
                                </View>
                                <Text style={{color: 'white', fontSize: width*0.04, fontFamily: "Montserrat-Regular"}}>{"  Create a trip"}</Text>
                              </View>
                            </TouchableOpacity>
                        </View>
                        )}
                        }
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={1}
                        snapToAlignment={'start'}
                        snapToOffsets={offsets}
                        decelerationRate={'fast'}
                        key={(_, index) => "trip"+index}
                        keyExtractor={(_, index)=> "trip"+index}
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
                          const tag = item.tag;
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
                          <View style={{position: 'absolute',
                                        overflow: 'hidden',
                                        alignSelf: 'flex-end',
                                        marginTop: width*0.02,
                                        right: width*0.02}}>
                            <TouchableOpacity onPress={()=>this.setState({removeCity: item.city_id, privacyModal: true, removeTrip: item.uid, removeIdx: index, privacyChange: item.privacy})}>
                              <View style={{overflow: 'hidden'}}>
                              <SpecialIcon style={{color: 'white'}} size={width*0.1} name={icon[item.privacy]}/> 
                              </View>
                            </TouchableOpacity>
                          </View>
                          <View style={{position: 'absolute',
                                        overflow: 'hidden',
                                        alignSelf: 'flex-end',
                                        marginTop: width*0.02,
                                        right: width*0.13}}>
                            <TouchableOpacity onPress={()=>{this.props.navigation.push("Edit", {item})}}>
                              <View style={{overflow: 'hidden'}}>
                              <SpecialIcon style={{color: 'white'}} size={width*0.1} name={"square-edit-outline"}/> 
                              </View>
                            </TouchableOpacity>
                          </View>
                          {item.tag=='created'?
                          <View style={{position: 'absolute',
                                        alignSelf: 'flex-end',
                                        marginTop: width*0.02,
                                        right: width*0.24}}>
                            <TouchableOpacity onPress={()=>this.setState({removeCity: item.city_id, removeTrip: item.uid, removeIdx: index, removeModal: true})}>
                              <View style={{overflow: 'hidden'}}>
                                <SpecialIcon style={{color: 'white'}} size={width*0.1} name={"trash-can-outline"}/>  
                              </View>
                            </TouchableOpacity>
                          </View>:
                          <View style={{position: 'absolute',
                                        alignSelf: 'flex-end',
                                        marginTop: width*0.02,
                                        right: width*0.24}}>
                            <TouchableOpacity onPress={()=>this.setState({removeCity: item.city_id, removeTrip: item.uid, removeIdx: index, unsaveModal: true})}>
                              <View style={{overflow: 'hidden'}}>
                                <SpecialIcon style={{color: 'white'}} size={width*0.1} name={"bookmark-off"}/>  
                              </View>
                            </TouchableOpacity>
                          </View>
                          }
                          <View style={{position: 'absolute', justifyContent: 'center', alignItems: 'center', height: height*0.02, width: width, marginTop: width*0.09}}>
                              <View style={{alignItems: 'center', flexDirection: 'row'}}>
                              {places.map((item, index)=>{
                                return(<View key={"dot"+item.place_id}
                                              style={{aspectRatio: 1,
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
                                              rotateEnabled={false}
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
                                            {tag=='created'?
                                            <View style={{flexDirection: 'row',
                                                          alignItems: 'center'}}>
                                                  <SpecialIcon style={{textAlign: 'left',
                                                                      color: 'white',
                                                                      fontSize: normalize(30),
                                                                      fontFamily: 'Montserrat-Regular'}}
                                                              name={"heart"}/>
                                                    <Text style={{textAlign: 'left',
                                                                  color: 'white',
                                                                  fontSize: normalize(16),
                                                                  fontFamily: 'Montserrat-Regular'}}>
                                                      {likes}
                                                    </Text>
                                              </View>:<View/>}
                                            </View>
                                          </View>
                                          <View style={{position: 'absolute', height: width*1.2, width: width}}>
                                            <TouchableOpacity style={{height: width*1.2, width: width}}
                                                            onPress={()=>this.props.navigation.push('TripView', {item: {uid: uid}})} activeOpacity={1}/>
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
                                                          marginLeft: width*0.01,
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
                                              fontSize: item.author.length>18?normalize(15):normalize(20),
                                              fontFamily: 'Montserrat-Regular'}}>{item.author}
                                          </Text>
                          </View>
                        </View>
                          </View>);
                      }}/>}
      </SafeAreaView>);
    }
  }
