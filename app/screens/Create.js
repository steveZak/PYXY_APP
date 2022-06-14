import React from 'react';
import {
  Animated,
  FlatList,
  Image,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Keyboard
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firebase from 'firebase';
import {MaterialIndicator} from 'react-native-indicators';
import SegmentedRoundDisplay from 'react-native-segmented-round-display';
import 'firebase/firestore';
import * as Animatable from 'react-native-animatable';
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SharedElement } from 'react-navigation-shared-element';
import normalize from 'react-native-normalize';
import { SERVER_ADDR, PRIMARY, SECONDARY } from '../settings.js';
import { TextInput, TouchableWithoutFeedback } from 'react-native-gesture-handler';

const { height, width } = Dimensions.get('window');
names = ["Keep calm and travel on", "A mile at a time", "The great escape", "Hand luggage only", "Buckle your seatbelt"]

class Create extends React.Component {
    state ={
        uid: null,
        places: [],
        count: 0,
        city_id: "",
        name: "",
        description: "",
        leftName: 30,
        leftDescription: 100,
        privacy: 'limited',
        placeholder: "",
        placesVisible: true,
        nametitleVisible: false,
        picktitleX: new Animated.Value(300),
        picktitleOpacity: new Animated.Value(0),
        pickplacesX: new Animated.Value(0),
        pickplacesOpacity: new Animated.Value(1),
        nametitleX: new Animated.Value(300),
        nametitleOpacity: new Animated.Value(0),
        privacyX: new Animated.Value(300),
        privacyOpacity: new Animated.Value(0)
    }  

    async componentDidMount() {
      const uid = await AsyncStorage.getItem('uid');
      const {item} = this.props.route.params;
      this.loadPlaces(item.city_id, uid);
      Animated.timing(this.state.picktitleX, {
        toValue: 0,
        delay: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
      Animated.timing(this.state.picktitleOpacity, {
        toValue: 1,
        delay: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
      this.setState({placeholder: Math.random()>0.6?"A day in "+item.name:names[Math.floor(Math.random()*names.length)]});
    }

    async loadPlaces(city_id, uid) {
      // const qSnap = await firebase.firestore().collection("sights").where('city_id', '==', city_id).get();
      var places = []
      firebase.firestore().collection("cities").doc(city_id).get()
                          .then(snapshot => {
                            var city_data = snapshot.data();
                            city_data.sights.forEach(place => {
                              places.push({name: place.name, place_id: place.uid, selected: false, img: "", mc: null})
                            })
                          });
      this.setState({places: places, city_id: city_id});
      this.getImageURLs(city_id, places, uid);
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
                          places[i].img = responseJson.imgs[places[i].place_id];
                        }
                      });
      this.setState({places: places});
                      for(var i in places) {
        await fetch(SERVER_ADDR+"/get_match?city_id="+city_id+"&place_id="+places[i].place_id+"&id="+uid, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }}).then(response => response.json()).then(responseJson => places[i].mc=responseJson.mc)
      }
      this.setState({places: places, uid: uid});
    }

    next() {
      Keyboard.dismiss();
      if(this.state.count==0) {
        return
      }
      if(this.state.placesVisible){
        Animated.timing(this.state.pickplacesX, {
          toValue: -300,
          delay: 0,
          duration: 200,
          useNativeDriver: true
        }).start();
        Animated.timing(this.state.pickplacesOpacity, {
          toValue: 0,
          delay: 0,
          duration: 200,
          useNativeDriver: true
        }).start(()=>{this.setState({placesVisible: false, nametitleVisible: true});
          Animated.timing(this.state.nametitleX, {
            toValue: 0,
            delay: 200,
            duration: 200,
            useNativeDriver: true
          }).start();
          Animated.timing(this.state.nametitleOpacity, {
            toValue: 1,
            delay: 200,
            duration: 200,
            useNativeDriver: true
          }).start();});
        return
      }
      if (this.state.nametitleVisible) {
        this.setState({nametitleVisible: false})
        Animated.timing(this.state.privacyX, {
          toValue: 0,
          delay: 200,
          duration: 200,
          useNativeDriver: true
        }).start();
        Animated.timing(this.state.privacyOpacity, {
          toValue: 1,
          delay: 200,
          duration: 200,
          useNativeDriver: true
        }).start();
        return
      }
      this.getTripID();
      Animated.timing(this.state.privacyX, {
        toValue: -300,
        delay: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
      Animated.timing(this.state.privacyOpacity, {
        toValue: 0,
        delay: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }

    async getTripID() {
      var place_ids = ""
      for (var i in this.state.places) {
        if (this.state.places[i].selected) {
          place_ids= place_ids+"&place_ids[]="+this.state.places[i].place_id
        }
      }
      await fetch(SERVER_ADDR+"/create_trip?city_id="+this.state.city_id+"&uid="+this.state.uid+"&privacy="+this.state.privacy+"&name="+encodeURIComponent(this.state.name)+"&description="+encodeURIComponent(this.state.description)+place_ids, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }}).then(response => response.json()).then(responseJson => this.props.navigation.navigate('TripView', {item: {uid: responseJson.trip_id}, city_id: this.state.city_id}))
    }

    render() {
        const {item} = this.props.route.params;
        return(<SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
                <View style={{justifyContent: 'center', alignContent: 'center'}}>
                    <View style={{height: Math.round(height*0.08), width: Math.round(width*0.9), marginLeft: normalize(45)}}>
                      <Text style={{color: 'black',
                                    fontFamily: 'Montserrat-Light',
                                    fontSize: normalize(25)}}>{"Plan your trip"}</Text>
                    </View>
                </View>
                <View style={{backgroundColor: PRIMARY,
                            marginLeft: width*0.02,
                            marginTop: height*0.12,
                            position: 'absolute',
                            height: height*0.06,
                            width: width*0.26,
                            borderRadius: normalize(15),
                            }}>
                  <TouchableOpacity style={{flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row'}}
                                onPress={() => this.props.navigation.push("CityView", {item, color: PRIMARY})}>
                    <SpecialIcon style={{color: 'white'}}
                                  name={"fullscreen"}
                                  size={normalize(30)}/>
                    <Text style={{color: 'white',
                                  fontFamily: 'Montserrat-Light',
                                  fontSize: normalize(16)}}>{"Expand"}</Text>
                  </TouchableOpacity>
                </View>
                <SharedElement id={`city.${item.city_id}.cityView`}>
                <View style={{backgroundColor: PRIMARY,
                              marginRight: height*0.02,
                              alignSelf: 'flex-end',
                              position: 'absolute',
                              height: height*0.15,
                              width: width*0.65,
                              borderRadius: normalize(15)}}/>
                </SharedElement>
                <View style={{backgroundColor: PRIMARY,
                              alignSelf: 'flex-end',
                              marginRight: height*0.02,
                              height: height*0.15,
                              width: width*0.65,
                              borderRadius: normalize(15)}}>
                    <SharedElement id={`city.${item.city_id}.cityName`}>
                      <Text style={{color: 'white',
                                  width: width*0.41,
                                  alignSelf: 'flex-end',
                                  textAlign: 'right',
                                  fontFamily: 'Montserrat-Light',
                                  fontSize: normalize(23)}}>
                      {item.name}
                      </Text>
                  </SharedElement>
                  <SharedElement id={`city.${item.city_id}.countryName`}>
                      <Text style={{color: 'white',
                                  width: Math.round(width*0.41),
                                  alignSelf: 'flex-end',
                                  textAlign: 'right',
                                  fontFamily: 'Montserrat-Light',
                                  fontSize: normalize(23)}}>
                      {item.country}
                      </Text>
                  </SharedElement>
                </View>
                <Animated.View style={[{opacity: this.state.picktitleOpacity}, {transform: [{translateX: this.state.picktitleX}]}]}>
                  <View style={{width: width, flexDirection: 'row'}}>
                      <Text style={{textAlign: "center",
                                    color: 'black',
                                    fontSize: width*0.05,
                                    fontFamily: 'Montserrat-Regular'}}>{" First, pick your places (max 12)"}</Text>
                  </View>
                </Animated.View>
                <View>
                {this.state.placesVisible?(
                <Animated.View style={[{opacity: this.state.pickplacesOpacity}, {transform: [{translateX: this.state.pickplacesX}]}]}>
                  <FlatList contentContainerStyle={{justifyContent: 'center'}}
                                style={{marginTop: height*0.02, height: height*0.75}}
                                showsVerticalScrollIndicator={false}
                                data={this.state.places}
                                initialNumToRender={7}
                                decelerationRate={"fast"}
                                renderItem={({item, index}) => {
                    return (<Animatable.View
                                    animation={"fadeIn"} duration={250} delay={150+index*100}
                                    style={{flexDirection: "row",
                                    marginTop: height*0.03, justifyContent: "center",
                                    alignContent: "center",
                                    alignItems: "center",}}>
                              <View style={{height: 0.15*width,
                                            width: 0.15*width,
                                            justifyContent: "center"}}>
                                <TouchableOpacity onPress={()=>{if (item.selected || this.state.count < 12) {
                                                    this.setState(({places, count}) => ({
                                                      places: [
                                                        ...places.slice(0, index),
                                                        {
                                                          ...places[index],
                                                          selected: !places[index].selected
                                                        },
                                                        ...places.slice(index+1)
                                                      ],
                                                      count: item.selected?count+1:count-1}));
                                                    }}}>
                                  <View style={{height: 0.1*width,
                                                width: 0.1*width,
                                                borderWidth: item.selected?0:1,
                                                borderColor: "rgb(175, 175, 175)",
                                                backgroundColor: item.selected?PRIMARY:"white",
                                                borderRadius: normalize(100)}}>
                                    <SpecialIcon style={{color: item.selected?"white": "rgb(175, 175, 175)"}}
                                              name={'check'}
                                              size={height*0.05}/>
                                  </View>
                                </TouchableOpacity>
                              </View>
                              <View style={{height: 0.2*width,
                                            width: 0.8*width,
                                            borderRadius: normalize(15)}}>
                              <TouchableOpacity style={{flex: 1, justifyContent: 'flex-end'}}
                                                onPress={()=>{this.props.navigation.navigate('SightView', {item, city_id: this.props.route.params.city_id})}}>
                                <View style={{flexDirection: "row", borderRadius: normalize(15), backgroundColor: PRIMARY, overflow: 'hidden'}}>
                                  <SharedElement id={`place.${item.place_id}.icon`}>
                                    {(item.img!="")?<Image source={{uri: item.img}} style={{width: Math.round(0.2*width), height: Math.round(0.2*width)}}/>:<View style={{backgroundColor: 'rgb(175, 175, 175)', width: Math.round(0.2*width), height: Math.round(0.2*width)}}/>}
                                  </SharedElement>
                                  <View style={{width: 0.5*width,
                                                height: 0.2*width, justifyContent: 'center'}}>
                                    <SharedElement id={`place.${item.place_id}.placeName`}>
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
                            </Animatable.View>);}}
                        keyExtractor={(item, idx) => item.place_id}
                    />
                  </Animated.View>):<View/>}
            </View>
            <Animated.View style={[{opacity: this.state.nametitleOpacity}, {transform: [{translateX: this.state.nametitleX}]}, {marginTop: height*0.01}]}>
              <Text style={{color: 'black',
                            fontSize: width*0.05,
                            fontFamily: 'Montserrat-Regular'}}>{" Now, name your trip"}</Text>
                <View style={{height: normalize(height*0.06), alignSelf: 'center', justifyContent:'center', width: normalize(width*0.75), marginRight: normalize(width*0.02), borderColor: 'black', borderWidth: 1, borderRadius: 15}}>
                  <TouchableWithoutFeedback>
                      <TextInput style={{textAlign: "center",
                                        color: 'black',
                                        fontSize: width*0.05,
                                        fontFamily: 'Montserrat-Regular'}}
                              placeholder={this.state.placeholder}
                              placeholderTextColor={'gray'}
                              value={this.state.name}
                              onChangeText={text => {if(30-text.length>=0){this.setState({name: text, leftName: 30-text.length})}}}/>
                  </TouchableWithoutFeedback>
                </View>
                <View style={{width: width, height: height*0.05, right: width*0.01, alignItems: 'flex-end'}}>
                  <Text style={{textAlign: "center",
                                color: 'black',
                                fontSize: width*0.05,
                                fontFamily: 'Montserrat-Regular'}}>
                      {this.state.leftName}
                  </Text>
                </View>
                <View style={{height: height*0.15, marginTop: height*0.01, alignSelf: 'center', justifyContent:'center', width: normalize(width*0.75), marginRight: normalize(width*0.02), borderColor: 'black', borderWidth: 1, borderRadius: 15}}>
                    <TouchableWithoutFeedback>
                        <TextInput style={{height: height*0.15,
                                          textAlign: "center",
                                          color: 'black',
                                          fontSize: width*0.05,
                                          fontFamily: 'Montserrat-Regular'}}
                                multiline={true}
                                placeholder={"Trip caption\n(Optional)"}
                                placeholderTextColor={'gray'}
                                value={this.state.description}
                                onChangeText={text => {if(100-text.length>=0)this.setState({description: text, leftDescription: 100-text.length})}}/>
                    </TouchableWithoutFeedback>
                </View>
                <View style={{width: width, height: height*0.05, right: width*0.01, alignItems: 'flex-end'}}>
                  <Text style={{textAlign: "center",
                                    color: 'black',
                                    fontSize: width*0.05,
                                    fontFamily: 'Montserrat-Regular'}}>
                        {this.state.leftDescription}
                  </Text>
                </View>
            </Animated.View>
            <Animated.View style={[{opacity: this.state.privacyOpacity}, {transform: [{translateX: this.state.privacyX}]}, {marginTop: height*0.01}]}>
              <Text style={{color: 'black',
                            fontSize: normalize(17),
                            fontFamily: 'Montserrat-Regular'}}>{"Finally, choose who can see your trip"}</Text>
              <View style={{height: normalize(height*0.06),
                            marginLeft: width*0.02,
                            marginTop: height*0.03,
                            justifyContent: 'center',
                            width: normalize(width*0.75),
                            marginLeft: normalize(width*0.02),
                            flexDirection: 'column'}}>
                <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', marginBottom: height*0.005}} onPress={() => this.setState({privacy: 'private'})}>
                  <View style={{borderColor: PRIMARY,
                                borderWidth: 1,
                                aspectRatio: 1,
                                borderRadius: 1000,
                                overflow: 'hidden',
                                width: height*0.03,
                                backgroundColor: this.state.privacy=='private'?PRIMARY:'white'}}>
                  </View>
                  <SpecialIcon style={{color: 'black', marginLeft: width*0.02}} name={'lock'} size={25}/>
                  <Text style={{textAlign: "center",
                                fontSize: normalize(17),
                                marginLeft: width*0.02,
                                fontFamily: 'Montserrat-Regular'}}>{"Just me"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', marginBottom: height*0.005}} onPress={() => this.setState({privacy: 'limited'})}>
                  <View style={{borderColor: PRIMARY,
                                borderWidth: 1,
                                aspectRatio: 1,
                                borderRadius: 1000,
                                overflow: 'hidden',
                                width: height*0.03,
                                backgroundColor: this.state.privacy=='limited'?PRIMARY:'white'}}>
                  </View>
                  <SpecialIcon style={{color: 'black', marginLeft: width*0.02}} name={'account-group-outline'} size={25}/>
                  <Text style={{textAlign: "center",
                                fontSize: normalize(17),
                                marginLeft: width*0.02,
                                fontFamily: 'Montserrat-Regular'}}>{"My followers and me"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center'}} onPress={() => this.setState({privacy: 'public'})}>
                  <View style={{borderColor: PRIMARY,
                                borderWidth: 1,
                                aspectRatio: 1,
                                borderRadius: 1000,
                                overflow: 'hidden',
                                width: height*0.03,
                                backgroundColor: this.state.privacy=='public'?PRIMARY:'white'}}>
                  </View>
                  <SpecialIcon style={{color: 'black', marginLeft: width*0.02}} name={'earth'} size={25}/>
                  <Text style={{textAlign: "center",
                                fontSize: normalize(17),
                                marginLeft: width*0.02,
                                fontFamily: 'Montserrat-Regular'}}>{"Everyone"}</Text>
                </TouchableOpacity>
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
            <View style={{position: 'absolute', alignSelf: 'flex-end', right: height*0.01, marginTop: height*0.01}}>
              <TouchableOpacity onPress={() => this.next()}>
                <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: SECONDARY, borderRadius: normalize(19), overflow: 'hidden'}}>
                  <Text style={{textAlign: 'center',
                                color: 'white',
                                marginLeft: width*0.01,
                                fontSize: normalize(17),
                                fontFamily: 'Montserrat-Regular'}}>{"Next"}</Text>
                  <SpecialIcon style={{color: 'white'}}
                      name={'arrow-right'}
                      size={normalize(35)}/>
                </View>
              </TouchableOpacity>
            </View>
        </SafeAreaView>)
    }
}

export default Create;