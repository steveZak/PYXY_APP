import React from 'react';
import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import * as firebase from 'firebase';
import 'firebase/firestore';
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";
import {SafeAreaView} from 'react-native-safe-area-context';
import SegmentedRoundDisplay from 'react-native-segmented-round-display';
import { SharedElement } from 'react-navigation-shared-element';
import normalize from 'react-native-normalize';
import iconNames from '../assets/icons.json';
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SERVER_ADDR, PRIMARY, SECONDARY } from '../settings.js';
let cityData = require('../assets/city_data.json');
import * as map_data from "../assets/map_styles.json";
let avgCats = require('../assets/avg_cats.json');
const { height, width } = Dimensions.get('window');

class CityMap extends React.Component {

    static sharedElements=(navigation, otherNavigation, showing)=>{
        if (otherNavigation.state.routeName === 'CityView' && showing) {
          const item = navigation.getParam('item');
          return [{id: `city.${item.city_id}.cityView`, animation: 'move'}];
        }
    }

    // sharedElements={(route, otherRoute, showing)=>{
    //     const {item} = route.params;
    //     return [{id: `map`}, {id: `city.${item.city_id}.cityView`}];
    //   }}
    
    state={
        city_id: this.props.route.params.item.city_id,
        liked: false,
        saved: false,
        mapView: null
    }

    componentDidMount() {
        this.setState({liked: this.props.route.params.liked, saved: this.props.route.params.saved})
    }

    render() {
        const {item, uid, trips, advisory, cityMatch} = this.props.route.params;
        return (<SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
                    <MapView
                        ref = {(mapView) => {() => this.setState({mapView: mapView})}}
                        style={{ flex: 1 }}
                        initialRegion={{
                            latitude: cityData[item.city_id]['coordinates']['lat'],
                            longitude: cityData[item.city_id]['coordinates']['lng'],
                        latitudeDelta: 0.17,
                        longitudeDelta: 0.17*width/height
                        }}
                        provider={PROVIDER_GOOGLE}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        customMapStyle={map_data['mapStyle']}
                    >
                    </MapView>
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
                                        height: Math.round(height*0.07),
                                        width: Math.round(width*0.59),
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
                        <View>
                            <SharedElement id={`city.${this.state.city_id}.cityName`}>
                                <Text style={{color: 'white',
                                            width: width*0.59,
                                            textAlign: 'center',
                                            fontFamily: 'Montserrat-Light',
                                            fontSize: normalize(21)}}>
                                {item.name}
                                </Text>
                            </SharedElement>
                        </View>
                    </View>
                    <View style={{position: 'absolute', alignItems: 'center', flexDirection: 'column', width: width*0.1, backgroundColor: PRIMARY, borderRadius: normalize(15), overflow: 'hidden', alignSelf: 'flex-end', marginTop: Math.round(height*0.12), right: Math.round(height*0.01)}}>
                        {(advisory != null)?(
                        <View style={{width: width*0.09, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: normalize(width*0.01)}}>
                        <TouchableOpacity onPress={() => this.setState({advVisible: true})}>
                            <SpecialIcon style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 15, color: 'white'}}
                                name={'alert-octagon-outline'}
                                size={width*0.065}/>
                        </TouchableOpacity></View>):(<View/>)
                        }
                        <View style={{width: width*0.09, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: normalize(width*0.01)}}>
                        <TouchableOpacity onPress={() => {if (this.state.liked) {
                                                            firebase.firestore().collection("users").doc(uid).update({liked_cities: firebase.firestore.FieldValue.arrayRemove(this.state.city_id)});
                                                            this.setState({liked: false});
                                                            } else {
                                                            firebase.firestore().collection("users").doc(uid).update({liked_cities: firebase.firestore.FieldValue.arrayUnion(this.state.city_id)});
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
                                                            firebase.firestore().collection("users").doc(uid).update({saved_cities: firebase.firestore.FieldValue.arrayRemove(this.state.city_id)});
                                                            this.setState({saved: false});
                                                            } else {
                                                            firebase.firestore().collection("users").doc(uid).update({saved_cities: firebase.firestore.FieldValue.arrayUnion(this.state.city_id)});
                                                            this.setState({saved: true});}}}>
                        {(this.state.saved)?(<SpecialIcon style={{borderWidth: 1, padding: 3, backgroundColor: 'white', overflow: 'hidden', borderColor: PRIMARY, borderRadius: 15, color: PRIMARY}}
                            name={'book-outline'}
                            size={width*0.065}/>):
                        (<SpecialIcon style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 15, color: 'white'}}
                            name={'book-outline'}
                            size={width*0.065}/>)}
                        </TouchableOpacity>
                        </View>
                        <View style={{justifyContent: 'center', width: width*0.09, aspectRatio: 1}}>
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
                                            filled: cityMatch,
                                        }]}/>
                            <Text style={{color: 'white',
                                        textAlign: 'center',
                                        fontFamily: 'Montserrat-Light',
                                        fontSize: normalize(18)}}>{cityMatch}</Text></View>
                    </View>
                    </View>
                    <FlatList contentContainerStyle={{justifyContent: 'center'}}
                              style={{position: 'absolute', marginTop: height*0.83, width: width}}
                              horizontal={true}
                              data={trips}
                              snapToAlignment={"start"}
                              snapToInterval={Math.round(width*0.18)+normalize(5)}
                              showsHorizontalScrollIndicator={false}
                              decelerationRate={"fast"}
                              renderItem={({item, index}) => {
                                return (<View style={{flexDirection: "row",
                                                      alignItems: "center",
                                                      marginRight: normalize(width*0.03),
                                                      marginLeft: index==0?normalize(5):0}}>
                                            <TouchableOpacity style={{flex: 1, justifyContent: 'flex-end'}}
                                                            onPress={()=>{this.props.navigation.push('TripMap', {item: {uid: item.uid}, city_id: this.state.city_id})}}>
                                            <View style={{position: 'absolute' , width: normalize(width*0.15), aspectRatio: 1, backgroundColor: PRIMARY, borderRadius: 1000, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'}}/>
                                            <View style={{width: normalize(width*0.15), aspectRatio: 1, backgroundColor: PRIMARY, borderRadius: 1000, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'}}>
                                                <View style={{position: 'absolute'}}>
                                                <SharedElement id={`trip.${item.uid}.viewMap`}>
                                                    <View style={{width: normalize(width*0.15), aspectRatio: 1, backgroundColor: PRIMARY, borderRadius: 1000, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'}}/>
                                                </SharedElement>
                                                </View>
                                                <SharedElement id={`trip.${item.uid}.icon`}>
                                                    <SpecialIcon color={'white'}
                                                                name={iconNames.iconNames[item.uid.split('_').pop()]}
                                                                size={normalize(width*0.1)}/>
                                                </SharedElement>
                                            </View>
                                            </TouchableOpacity>
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

export default CityMap;