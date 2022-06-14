import React from 'react';
import {
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
import 'firebase/firestore';
import {MaterialIndicator} from 'react-native-indicators';
import SegmentedRoundDisplay from 'react-native-segmented-round-display';
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SharedElement } from 'react-navigation-shared-element';
import normalize from 'react-native-normalize';
import { SERVER_ADDR, PRIMARY, SECONDARY } from '../settings.js';
import { TextInput, TouchableWithoutFeedback } from 'react-native-gesture-handler';

const { height, width } = Dimensions.get('window');
names = ["Keep calm and travel on", "A mile at a time", "The great escape", "Buckle your seatbelt"]

class Edit extends React.Component {
    state ={
        uid: null,
        trip_id: this.props.route.params.item.uid,
        selectedPlaces: this.props.route.params.item.places,
        places: [],
        count: this.props.route.params.item.places.length,
        city_id: this.props.route.params.item.city_id,
        name: this.props.route.params.item.label,
        description: this.props.route.params.item.description,
        leftName: 30-this.props.route.params.item.label.length,
        leftDescription: 100-this.props.route.params.item.description.length,
        privacy: this.props.route.params.item.privacy,
        placeholder: ""
    }  

    async componentDidMount() {
        const uid = await AsyncStorage.getItem('uid');
        this.setState({placeholder: Math.random()>0.6?"A day in "+this.state.removeCity:names[Math.floor(Math.random()*names.length)]})
        this.loadPlaces(uid);
    }

    async loadPlaces(uid) {
      // const qSnap = await firebase.firestore().collection("sights").where('city_id', '==', city_id).get();
      var places = []
      firebase.firestore().collection("cities").doc(this.state.city_id).get()
                          .then(snapshot => {
                            var city_data = snapshot.data();
                            city_data.sights.forEach(place => {
                              var selected = false
                              for (var i in this.state.selectedPlaces) {
                                  if (this.state.selectedPlaces[i].place_id == place.uid) {
                                      selected = true;
                                  }
                              }
                              places.push({name: place.name, place_id: place.uid, selected: selected, img: "", mc: null})
                            })
                          });
      this.setState({places: places});
      this.getImageURLs(places, uid);
    }

    async getImageURLs(places, uid) {
      await fetch(SERVER_ADDR + "/get_images?city_id=" + this.state.city_id, {
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
        await fetch(SERVER_ADDR+"/get_match?city_id="+this.state.city_id+"&place_id="+places[i].place_id+"&id="+uid, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }}).then(response => response.json()).then(responseJson => places[i].mc=responseJson.mc)
      }
      this.setState({places: places, uid: uid});
    }

  async editTrip() { // changes privacy for trips created by you, creates a new trip if created by others
    Keyboard.dismiss();
    if(this.state.count==0) {
        return
    }
    var place_ids = ""
    for (var i in this.state.places) {
        if (this.state.places[i].selected) {
            place_ids= place_ids+"&place_ids[]="+this.state.places[i].place_id
        }
    }
    await fetch(SERVER_ADDR+"/edit_trip?city_id="+
                this.state.city_id+"&uid="+
                this.state.uid+"&trip_id="+
                this.state.trip_id+place_ids+"&name="+
                encodeURIComponent(this.state.name)+"&description="+
                encodeURIComponent(this.state.description)+"&privacy="+
                this.state.privacy, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }}).then(response => response.json()).then(this.props.navigation.goBack());
  }

    render() {
        return(<SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
                <View style={{justifyContent: 'center', alignContent: 'center'}}>
                    <View style={{height: height*0.06, width: width*0.9, marginLeft: normalize(45), marginTop: width*0.02}}>
                      <Text style={{color: 'black',
                                    fontFamily: 'Montserrat-Light',
                                    fontSize: normalize(25)}}>{"Edit your trip"}</Text>
                    </View>
                </View>
            <View>
                <View style={{height: normalize(height*0.06), alignSelf: 'center', justifyContent:'center', width: normalize(width*0.75), marginRight: normalize(width*0.02), borderColor: 'black', borderWidth: 1, borderRadius: 15}}>
                  <TouchableWithoutFeedback>
                      <TextInput style={{textAlign: "center",
                                        color: 'black',
                                        fontSize: width*0.05,
                                        fontFamily: 'Montserrat-Regular'}}
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
            </View>
            <View style={{borderBottomWidth: 1, borderTopWidth: 1}}>
                <FlatList contentContainerStyle={{justifyContent: 'center'}}
                            style={{height: height*0.5}}
                            showsVerticalScrollIndicator={false}
                            data={this.state.places}
                            initialNumToRender={7}
                            decelerationRate={"fast"}
                            renderItem={({item, index}) => {
                return (<View
                                style={{flexDirection: "row",
                                marginTop: height*0.03, justifyContent: "center",
                                alignContent: "center",
                                alignItems: "center",}}>
                            <View style={{height: Math.round(0.15*width),
                                        width: Math.round(0.15*width),
                                        justifyContent: "center"}}>
                            <TouchableOpacity onPress={()=>{if (item.selected || this.state.count < 12) {
                                                            this.setState(({places}) => ({places: [...places.slice(0, index), {...places[index], selected: !places[index].selected}, ...places.slice(index+1)], count: item.selected?this.state.count+1:this.state.count-1}));
                                                            }}}>
                                <View style={{height: Math.round(0.1*width),
                                            width: Math.round(0.1*width),
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
                            <View style={{height: Math.round(0.2*width),
                                        width: Math.round(0.8*width),
                                        borderRadius: normalize(15)}}>
                            <TouchableOpacity style={{flex: 1, justifyContent: 'flex-end'}}
                                            onPress={()=>{this.props.navigation.navigate('SightView', {item, city_id: this.state.city_id})}}>
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
                        </View>);}}
                    keyExtractor={(item, idx) => item.place_id}
                />
            </View>
            <View style={{position: 'absolute', marginLeft: height*0.01, marginTop: height*0.01}}>
              <TouchableOpacity onPress={() => {this.props.navigation.goBack()}}>
                <View style={{width: normalize(40), backgroundColor: SECONDARY, aspectRatio: 1, justifyContent: 'center', alignItems: 'center',borderRadius: 1000, overflow: 'hidden'}}>
                  <SpecialIcon style={{color: 'white'}}
                      name={'arrow-left'}
                      size={normalize(30)}/>
                </View>
              </TouchableOpacity>
            </View>
            <View style={{position: 'absolute', alignSelf: "center", bottom: height*0.01}}>
                <TouchableOpacity onPress={()=>this.editTrip()}>
                    <View style={{height: height*0.05,
                                width: width*0.45,
                                justifyContent: 'center',
                                backgroundColor: 'red',
                                borderRadius: width*0.03,
                                overflow: 'hidden'}}>
                    <Text style={{color: 'white',
                                fontSize: width*0.05,
                                fontFamily: 'Montserrat-Regular',
                                textAlign: 'center'}}>
                        {"Save changes"}
                    </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>)
    }
}

export default Edit;