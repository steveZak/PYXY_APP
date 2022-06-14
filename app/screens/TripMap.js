import React from 'react';
import {
  FlatList,
  Image,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import * as firebase from 'firebase';
import 'firebase/firestore';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from "react-native-maps";
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SharedElement } from 'react-navigation-shared-element';
import {MaterialIndicator} from 'react-native-indicators';
import SegmentedRoundDisplay from 'react-native-segmented-round-display';
import normalize from 'react-native-normalize';
import iconNames from '../assets/icons.json';
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SERVER_ADDR, PRIMARY, SECONDARY } from '../settings.js';
let cityData = require('../assets/city_data.json');
import * as map_data from "../assets/map_styles.json";
const { height, width } = Dimensions.get('window');

class TripMap extends React.Component {

  static sharedElements=(navigation, otherNavigation, showing)=>{
    // if (otherNavigation.state.routeName === 'TripView' && showing) {
    //   const item = navigation.getParam('item');
    //   console.log(item);
    //   return [{id: `trip.${item.uid}.view`, animation: 'move'}, {id: `trip.${item.uid}.icon`, animation: 'move'}, {id: `trip.${item.uid}.viewMap`, animation: 'move'}];
    // }
    if (otherNavigation.state.routeName === 'CityMap' && showing) {
      // const item = navigation.getParam('item');
      const item = navigation.getParam('item');
      const city_id = navigation.getParam('city_id');
      return [{id: `trip.${item.uid}.icon`, animation: 'move'}, {id: `trip.${item.uid}.viewMap`, animation: 'move'}, {id: `city.${city_id}.cityView`}];
    }
  }

    state = {
        uid: null,
        city_id: this.props.route.params.city_id,
        liked: false,
        saved: false,
        yours: false,
        selected_trip: this.props.route.params.item.uid,
        selected_trip_info: null,
        mc: null,
    }

    mapView = null;
    flatListPlaces = null;

    async componentDidMount() {
        const uid = await AsyncStorage.getItem('uid');
        if (this.props.route.params.selected_trip_info == null) {
            firebase.firestore().collection("users").doc(uid).get()
                                        .then(snapshot => {
                                        var user_data = snapshot.data();
                                        var isLiked = user_data.liked_trips.includes(this.props.route.params.item.uid);
                                        var isSaved = user_data.saved_trips.includes(this.props.route.params.item.uid);
                                        this.setState({uid: uid, liked: isLiked, saved: isSaved});
                                        });
            this.getTripInfo(this.props.route.params.item.uid, uid);
            firebase.firestore().collection("users").doc(uid).update({looked_trips: firebase.firestore.FieldValue.arrayUnion({trip_id: this.props.route.params.item.uid, city_id: this.props.route.params.city_id}), needs_update: Math.random()<0.5?true:false});
        } else {
            this.setState({uid: uid,
                          selected_trip_info: this.props.route.params.selected_trip_info,
                          liked: this.props.route.params.liked,
                          saved: this.props.route.params.saved,
                          yours: this.props.route.params.yours,
                          mc: this.props.route.params.mc});
            this.getImageURLs(this.props.route.params.city_id, this.props.route.params.selected_trip_info.sights, uid, this.props.route.params.item.uid);
        }
    }
    
      async getTripInfo(trip, uid) {
        var trip_info;
        firebase.firestore().collection("trips").doc(trip).get()
                            .then(snapshot => {
                                trip_info = snapshot.data();
                                // const idx = this.props.route.params.item.uid.lastIndexOf("_");
                                // var city_id = this.props.route.params.item.uid.slice(0, idx-2);
                                this.setState({selected_trip_info: trip_info, yours: trip_info.tag=="yours"?true:false});
                                this.getImageURLs(this.state.city_id, trip_info.sights, uid, trip);
                              });
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
            }}).then(response => response.json()).then(responseJson => places[i].mc= Math.round(100*responseJson.mc))
        }
        await fetch(SERVER_ADDR+"/get_match?city_id="+city_id+"&trip_id="+trip+"&id="+uid, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }}).then(response => response.json()).then(responseJson => this.setState({mc: Math.round(responseJson.mc*100)}))
        var new_trip_info = this.state.selected_trip_info
        new_trip_info.places = places
        this.setState({selected_trip_info: new_trip_info, uid: uid});
      }

    render() {
        return (<SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
                        <MapView
                            ref = {(mapView) => this.mapView = mapView}
                            style={{flex: 1 }}
                            initialRegion={{
                                latitude: cityData[this.state.city_id]['coordinates']['lat'],
                                longitude: cityData[this.state.city_id]['coordinates']['lng'],
                            latitudeDelta: 0.17,
                            longitudeDelta: 0.17*width/height
                            }}
                            provider={PROVIDER_GOOGLE}
                            pitchEnabled={false}
                            rotateEnabled={false}
                            customMapStyle={map_data['mapStyle']}
                        >
                          {(this.state.selected_trip_info==null)?<View/>:
                          this.state.selected_trip_info.sights.map((item1, index) => {return <Marker
                            key={"marker"+index}
                            onPress={() => { this.mapView.animateToRegion({
                                                latitude: item1['coordinates']['lat'],
                                                longitude: item1['coordinates']['lng'],
                                                latitudeDelta: 0.1,
                                                longitudeDelta: 0.1
                                              }, 200);
                                            this.flatListPlaces.scrollToIndex({animated: true, index: index})
                                              }}
                            coordinate={{latitude: item1['coordinates']['lat'],
                                        longitude: item1['coordinates']['lng']}}
                            anchor={{x: 0.5, y: 0.5}}>
                              <View style={{borderRadius: 1000, overflow: 'hidden'}}><View style={{backgroundColor: PRIMARY, height: normalize(width*0.08), width: normalize(width*0.08), alignItems: 'center', justifyContent: 'center'}}><Text style={{color: 'white',
                                                  textAlign: 'center',
                                                  fontFamily: 'Montserrat-Light',
                                                  fontSize: normalize(16)}}>{index + 1}
                                    </Text></View></View>
                            </Marker>})}
                            {(this.state.selected_trip_info==null)?<View/>:
                            <Polyline
                              strokeColor={PRIMARY}
                              coordinates={this.state.selected_trip_info.sights.map((item1, index)=>
                                {return({latitude: item1['coordinates']['lat'],
                                         longitude: item1['coordinates']['lng']})})}
                              strokeWidth={3}/>}
                        </MapView>
                    <View style={{position: 'absolute', width: width*0.15, aspectRatio: 1, marginLeft: width*0.2, marginTop: height*0.03, alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{position: 'absolute'}}>
                            <SharedElement id={`trip.${this.state.selected_trip}.viewMap`}>
                                <View style={{width: width*0.15, aspectRatio: 1, backgroundColor: PRIMARY, borderRadius: 1000, overflow: 'hidden'}}/>
                            </SharedElement>
                          </View>
                          <SharedElement id={`trip.${this.state.selected_trip}.icon`}>
                              <SpecialIcon color={'white'}
                                          name={this.state.selected_trip.includes('_')?iconNames.iconNames[this.state.selected_trip.split('_').pop()]:'heart'}
                                          size={width*0.1}/>
                          </SharedElement>
                    </View>
                    <View style={{position: 'absolute',
                            marginLeft: Math.round(width*0.4),
                            marginTop: Math.round(height*0.04),
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: height*0.07,
                            width: width*0.59,
                            borderRadius: normalize(15)}}>
                      <SharedElement id={`trip.${this.state.city_id}.view`}>
                          <View style={{backgroundColor: PRIMARY,
                                      height: height*0.07,
                                      width: width*0.59,
                                      borderRadius: normalize(15)}}/>
                      </SharedElement>
                    </View>
                    <View style={{position: 'absolute',
                                marginLeft: Math.round(width*0.4),
                                marginTop: Math.round(height*0.04),
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: Math.round(height*0.07),
                                width: Math.round(width*0.59),
                                borderRadius: normalize(15)}}>
                        <SharedElement id={`city.${this.state.city_id}.cityView`}>
                            <View style={{backgroundColor: PRIMARY,
                                        height: height*0.07,
                                        width: width*0.59,
                                        borderRadius: normalize(15)}}/>
                        </SharedElement>
                    </View>
                    <View style={{position: 'absolute',
                                marginTop: height*0.04,
                                marginLeft: width*0.4,
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: height*0.07,
                                width: width*0.59,
                                borderRadius: normalize(15)}}>
                            <SharedElement id={`city.${this.state.city_id}.cityName`}>
                                <Text style={{color: 'white',
                                            width: width*0.59,
                                            alignSelf: 'flex-end',
                                            textAlign: 'center',
                                            fontFamily: 'Montserrat-Light',
                                            fontSize: normalize(21)}}>
                                {cityData[this.state.city_id].name}
                                </Text>
                            </SharedElement>
                    </View>
                    <View style={{position: 'absolute', flexDirection: 'column', alignItems: 'center', width: Math.round(width*0.1), backgroundColor: PRIMARY, borderRadius: normalize(15), overflow: 'hidden', alignSelf: 'flex-end', marginTop: Math.round(height*0.12),  right: Math.round(height*0.01)}}>
                        <View style={{width: width*0.09, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: normalize(width*0.01)}}>
                        <TouchableOpacity onPress={() => {if (this.state.liked) {
                                                            firebase.firestore().collection("users").doc(this.state.uid).update({liked_cities: firebase.firestore.FieldValue.arrayRemove(this.state.city_id)});
                                                            this.setState({liked: false});
                                                            } else {
                                                            firebase.firestore().collection("users").doc(this.state.uid).update({liked_cities: firebase.firestore.FieldValue.arrayUnion(this.state.city_id)});
                                                            this.setState({liked: true});}}}>
                        {(this.state.liked)?(<SpecialIcon style={{borderWidth: 1, padding: 3, backgroundColor: 'white', overflow: 'hidden', borderColor: PRIMARY, borderRadius: 15, color: PRIMARY}}
                            name={'heart-outline'}
                            size={width*0.065}/>):
                        (<SpecialIcon style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 15, color: 'white'}}
                            name={'heart-outline'}
                            size={width*0.065}/>)}
                        </TouchableOpacity>
                        </View>
                        <View style={{width: width*0.09, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: normalize(width*0.01)}}>
                        <TouchableOpacity onPress={() => {if (this.state.saved) {
                                                            firebase.firestore().collection("users").doc(this.state.uid).update({saved_cities: firebase.firestore.FieldValue.arrayRemove(this.state.city_id)});
                                                            this.setState({saved: false});
                                                            } else {
                                                            firebase.firestore().collection("users").doc(this.state.uid).update({saved_cities: firebase.firestore.FieldValue.arrayUnion(this.state.city_id)});
                                                            this.setState({saved: true});}}}>
                        {(this.state.saved)?(<SpecialIcon style={{borderWidth: 1, padding: 3, backgroundColor: 'white', overflow: 'hidden', borderColor: PRIMARY, borderRadius: 15, color: PRIMARY}}
                            name={'book-outline'}
                            size={width*0.065}/>):
                        (<SpecialIcon style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 15, color: 'white'}}
                            name={'book-outline'}
                            size={width*0.065}/>)}
                        </TouchableOpacity>
                        </View>
                        <View style={{justifyContent: 'center',  width: width*0.09, aspectRatio: 1}}>
                        <View style={{justifyContent: 'center', alignItems: 'center'}}>
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
                                        fontSize: normalize(18)}}>{this.state.mc}</Text></View>
                          </View>
                    </View>
                    <FlatList ref={ref => this.flatListPlaces = ref}
                              contentContainerStyle={{justifyContent: 'center'}}
                              style={{position: 'absolute', marginTop: height*0.8, width: width}}
                              horizontal={true}
                              data={(this.state.selected_trip_info==null)?[]:this.state.selected_trip_info.sights}
                              snapToAlignment={"start"}
                              snapToInterval={width*0.85}
                              showsHorizontalScrollIndicator={false}
                              onMomentumScrollEnd={(event) => {const place = this.state.selected_trip_info.sights[Math.round((event.nativeEvent.contentOffset.x+width/2)/width)];
                                this.mapView.animateToRegion({
                                                            latitude: place['coordinates']['lat'],
                                                            longitude: place['coordinates']['lng'],
                                                            latitudeDelta: 0.09,
                                                            longitudeDelta: 0.09
                                                          }, 200)}}
                              decelerationRate={"fast"}
                              renderItem={({item, index}) => {
                                return (<View style={{flexDirection: "row",
                                                      justifyContent: "center",
                                                      alignContent: "center",
                                                      marginLeft: index==0?width*0.05:0,
                                                      marginRight: width*0.05,
                                                      alignItems: "center"}}>
                                            <View style={{height: 0.2*width,
                                                          width: 0.8*width,
                                                          justifyContent: 'center',
                                                          borderRadius: normalize(15)}}>
                                            <TouchableOpacity style={{flex: 1, justifyContent: 'flex-end'}}
                                                                onPress={()=>{this.props.navigation.navigate('SightView', {item, city_id: this.state.city_id})}}>
                                                <View style={{flexDirection: "row", borderRadius: normalize(15), backgroundColor: PRIMARY, overflow: 'hidden'}}>
                                                <SharedElement id={`place.${item.place_id}.icon`}>
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
                                                <SharedElement id={`place.${item.place_id}.placeName`}>
                                                    <Text style={{width: Math.round(0.5*width),
                                                                textAlign: "center",
                                                                color: 'white',
                                                                fontSize: normalize(17),
                                                                fontFamily: 'Montserrat-Regular'}}>
                                                    {item.name}
                                                    </Text>
                                                </SharedElement>
                                                {item.mc==null?(<MaterialIndicator color={'white'} animating={true}/>):
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
                                                                    filled: item.mc,
                                                                  }]}/>
                                                    <Text style={{color: 'white',
                                                                  textAlign: 'center',
                                                                  fontFamily: 'Montserrat-Light',
                                                                  fontSize: normalize(18)}}>{item.mc}</Text>
                                              </View>}
                                                </View>
                                                </TouchableOpacity>
                                            </View>
                                            </View>);}}
                                    keyExtractor={(item, idx) => item.uid}
                    />
                    <View style={{position: 'absolute', marginLeft: height*0.01, marginTop: height*0.01}}>
                      <TouchableOpacity onPress={() => {this.props.navigation.goBack()}}>
                        <View style={{width: normalize(40), backgroundColor: SECONDARY, aspectRatio: 1, justifyContent: 'center', alignItems: 'center',borderRadius: 1000, overflow: 'hidden'}}>
                          <SpecialIcon style={{color: 'white'}}
                              name={'arrow-left'}
                              size={normalize(30)}/>
                        </View>
                      </TouchableOpacity>
                    </View>
                </SafeAreaView>
        );
    }
}

export default TripMap;