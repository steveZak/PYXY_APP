import React from 'react';
import {
  Animated,
  Image,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Linking,
  Platform
} from 'react-native';
import Modal from 'react-native-modal';
import * as firebase from 'firebase';
import 'firebase/firestore';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SegmentedRoundDisplay from 'react-native-segmented-round-display';
import {MaterialIndicator} from 'react-native-indicators';
import { SharedElement } from 'react-navigation-shared-element';
import normalize from 'react-native-normalize';
import Gallery from 'react-native-image-gallery';
// import iconNames from '../assets/icons.json';
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SERVER_ADDR, PRIMARY, SECONDARY, COLOR2, COLOR3} from '../settings.js';
let avgCats = require('../assets/avg_cats.json');
let cityData = require('../assets/city_data.json');
const { height, width } = Dimensions.get('window');


class SightView extends React.Component {

  static sharedElements=(navigation, otherNavigation, showing)=>{
    if ((otherNavigation.state.routeName === 'TripView' || otherNavigation.state.routeName === 'CityView') && showing) {
      const item = navigation.getParam('item');
      return [{id: `sight.${item.place_id}.view`}, {id: `sight.${item.place_id}.icon`}, {id: `sight.${item.place_id}.placeName`}];
    }
  }

  state = {
    attVisible: false,
    uid: null,
    city_id: this.props.route.params.city_id,
    loading: false,
    liked: false,
    saved: false,
    images: [],
    selected_sight: this.props.route.params.item.place_id,
    selected_sight_info: null,
    selectedImgIdx: 0,
    mc: null,
    scrollY: new Animated.Value(0),
    topCats: [],
    scoreModal: false
  }

  async componentDidMount() {
    const uid = await AsyncStorage.getItem('uid');
    this.setState({uid: uid});
    this.setState({loading: true})
    firebase.firestore().collection("users").doc(uid).get()
                                .then(snapshot => {
                                  var user_data = snapshot.data();
                                  var isLiked = user_data.liked_sights.includes(this.state.selected_sight);
                                  var isSaved = user_data.saved_sights.includes(this.state.selected_sight);
                                  this.setState({uid: uid, liked: isLiked, saved: isSaved});
                                });
    this.getSightInfo(this.state.selected_sight, uid);
    firebase.firestore().collection("users").doc(uid).update({looked_sights: firebase.firestore.FieldValue.arrayUnion({place_id: this.state.selected_sight}), needs_update: Math.random()<0.5?true:false});
  }

  async getSightInfo(place, uid) {
    var sight_info;
    firebase.firestore().collection("sights").doc(place).get()
                        .then(snapshot => {
                            sight_info = snapshot.data();
                            this.setState({selected_sight_info: sight_info});
                            this.getImageURLs(uid, place);
                          });
  }

  async getImageURLs(uid, place) {
    await fetch(SERVER_ADDR + "/get_place_images?city_id=" + this.state.city_id + "&place_id=" + place, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json'
                  }})
                    .then(response => response.json())
                    .then(responseJson => {
                      var images = [];
                      responseJson.imgs.forEach(img => {images.push({source: {uri: img}})});
                      this.setState({images: images});
                    });
    await fetch(SERVER_ADDR+"/get_match?city_id="+this.state.city_id+"&place_id="+place+"&id="+uid, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }}).then(response => response.json()).then(responseJson => this.setState({mc: Math.round(responseJson.mc*100)}))
    this.setState({loading: true})
    var topCats = [];
    var cats = this.state.selected_sight_info.global_cat_params;
    var maxVal = 0;
    var minVal = -100;
    for(var i = 0; i<3; i++) {
      const maxIdx = cats.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
      topCats.push({cat: avgCats["cat_names"][maxIdx], val: cats[maxIdx]});
      if (i == 0) {
        maxVal = cats[maxIdx];
      }
      if (i == 2) {
        minVal = cats[maxIdx];
      }
      cats[maxIdx] = -100;
    }
    for(var i = 0; i<3; i++) {
      topCats[i].val = ((topCats[i].val-minVal)/(maxVal-minVal)+1)/2 
    }
    this.setState({topCats: topCats});
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

  render() {
    const {item} = this.props.route.params;
    return (<SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
              <Animated.ScrollView onScroll={Animated.event([{nativeEvent: { contentOffset: { y: this.state.scrollY}}}], {useNativeDriver: true})}
                        style={{height: height, width: width, position: 'absolute'}}>
                <View style={{borderRadius: normalize(15), marginTop: height*0.35, height: height*0.6, overflow: 'hidden'}}>
                  <Gallery style={{height: height*0.55}}
                           images={this.state.images}
                           imageComponent={(img, dims)=> {return <Image style={{flex:1}} resizeMode={"cover"} source={{uri: img.source.uri}}/>}}
                           onPageSelected={(idx)=>this.setState({attVisible: false, selectedImgIdx: idx})}/>
                  <View style={{alignSelf: 'auto', marginLeft: normalize(10), marginTop: normalize(10), position: 'absolute', overflow: 'hidden', borderRadius: 1000}}>
                    <TouchableOpacity onPress={() => {const elts = item.img.split('%7C');
                                                      Linking.openURL("https://www.google.com/maps/contrib/"+elts[elts.length-1].split("?")[0]);}}>
                      <SpecialIcon style={{color: PRIMARY , backgroundColor: 'white'}}
                                    name={'google'}
                                    size={normalize(26)}/>
                    </TouchableOpacity>
                  </View>
                  <View style={{backgroundColor: PRIMARY}}>
                    <Text style={{marginLeft: width*0.01,
                                  color: 'white',
                                  fontFamily: 'Montserrat-Regular',
                                  fontSize: normalize(16)}}>{this.state.selected_sight_info==null?"":this.state.selected_sight_info.quote}
                    </Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: height*0.01}}>
                      <View style={{marginLeft: width*0.01,flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={{color: 'white',
                                  fontFamily: 'Montserrat-Regular',
                                  fontSize: normalize(16)}}>{"Source "}</Text>
                        <View style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 1000, marginRight: 10}}>
                          <TouchableOpacity onPress={() => {Linking.openURL("https://www.google.com/maps/search/?api=1&query="+this.state.selected_sight_info.address+"&query_place_id="+this.state.selected_sight)}}>
                            <SpecialIcon style={{color: 'white'}}
                                name={'google'}
                                size={normalize(26)}/>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={{flexDirection: 'row', alignContent: 'flex-end'}}>
                        <View style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 1000, marginRight: 10}}>
                          <TouchableOpacity onPress={() => {Linking.openURL(this.state.selected_sight_info.website)}}>
                            <SpecialIcon style={{color: 'white'}}
                                name={'web'}
                                size={normalize(26)}/>
                          </TouchableOpacity>
                        </View>
                        <View style={{borderWidth: 1, padding: 3, borderColor: 'white', borderRadius: 1000, marginRight: 10}}>
                          <TouchableOpacity onPress={() => {Linking.openURL(Platform.OS=='android'?"tel:"+this.state.selected_sight_info.int_phone:"telprompt:"+this.state.selected_sight_info.int_phone)}}>
                            <SpecialIcon style={{color: 'white'}}
                                name={'phone'}
                                size={normalize(26)}/>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </Animated.ScrollView>
              <Animated.View
                        style={{position: 'absolute',
                                alignSelf: 'center',
                                transform: [{
                                  translateY: this.state.scrollY.interpolate({inputRange: [0, 100], outputRange: [0, -200]})
                                }]
                        }}>
                <SharedElement id={`sight.${item.place_id}.view`}>
                  <View style={{backgroundColor: PRIMARY,
                                marginTop: normalize(50),
                                height: Math.round(height*0.23),
                                width: Math.round(width*0.83),
                                borderRadius: normalize(15)}}/>
                </SharedElement>
                <View style={{
                              marginTop: normalize(50),
                              height: height*0.23,
                              width: width*0.83,
                              position: 'absolute'}}>
                  <View style={{marginLeft: "1%",
                                height: normalize(64),
                                width: width*0.73}}>
                    <SharedElement id={`sight.${item.place_id}.placeName`}>
                      <View style={{width: 0.6*width,
                                    height: 0.2*width,
                                    justifyContent: 'center'}}>
                        <Text style={{color: 'white',
                                      textAlign: 'left',
                                      fontSize: normalize(18),
                                      fontFamily: 'Montserrat-Regular'}}>{item.name}
                        </Text>
                      </View>
                    </SharedElement>
                  </View>
                  {this.state.topCats.length>0?(
                  <View style={{flexDirection: 'column'}}>
                    <View style={{flexDirection: 'row'}}>
                      <View style={{width: normalize(30), height: normalize(30), alignItems: "center", justifyContent: "center"}}>
                        <View style={{backgroundColor: 'white', borderRadius: 1000, width: 25*this.state.topCats[0].val, height: 25*this.state.topCats[0].val}}/>
                      </View>
                      <View style={{height: normalize(30), alignItems: "center", justifyContent: "center"}}>
                        <Text style={{color: 'white',
                                      fontSize: normalize(18),
                                      fontFamily: 'Montserrat-Regular'}}>
                          {this.state.topCats[0].cat}
                        </Text>
                      </View>
                    </View>
                    <View style={{flexDirection: 'row'}}>
                      <View style={{width: normalize(30), height: normalize(30), alignItems: "center", justifyContent: "center"}}>
                        <View style={{backgroundColor: 'white', borderRadius: 1000, width: 25*this.state.topCats[1].val, height: 25*this.state.topCats[1].val}}/>
                      </View>
                      <View style={{height: normalize(30), alignItems: "center", justifyContent: "center"}}>
                        <Text style={{color: 'white',
                                      fontSize: normalize(18),
                                      fontFamily: 'Montserrat-Regular'}}>
                          {this.state.topCats[1].cat}
                        </Text>
                      </View>
                    </View>
                    <View style={{flexDirection: 'row'}}>
                      <View style={{width: normalize(30), height: normalize(30), alignItems: "center", justifyContent: "center"}}>
                        <View style={{backgroundColor: 'white', borderRadius: 1000, width: 25*this.state.topCats[2].val, height: 25*this.state.topCats[2].val}}/>
                      </View>
                      <View style={{height: normalize(30), alignItems: "center", justifyContent: "center"}}>
                        <Text style={{color: 'white',
                                      fontSize: normalize(18),
                                      fontFamily: 'Montserrat-Regular'}}>
                          {this.state.topCats[2].cat}
                        </Text>
                      </View>
                    </View>
                  </View>):(<View/>)
                  }
                  <View style={{position: 'absolute',
                                marginTop: normalize(64),
                                alignSelf: 'flex-end'}}>
                    <Text style={{textAlign: "right",
                                  color: 'white',
                                  marginLeft: normalize(5),
                                  fontSize: normalize(22),
                                  fontFamily: 'Montserrat-Regular'}}>{this.state.city_id==null?"":cityData[this.state.city_id].name}
                    </Text>
                  </View>
                  <View style={{width: Math.round(width*0.5), alignSelf: 'flex-end',
                              position: 'absolute', justifyContent: 'flex-end',
                              flexDirection: 'row', top: '70%', right: '5%'}}>
                  <View style={{width: width*0.09, aspectRatio: 1, justifyContent: 'flex-end', alignItems: 'center', marginRight: normalize(width*0.01)}}>
                      <TouchableOpacity onPress={() => {if (this.state.liked) {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({liked_sights: firebase.firestore.FieldValue.arrayRemove(this.state.selected_sight)});
                                                          this.setState({liked: false});
                                                        } else {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({liked_sights: firebase.firestore.FieldValue.arrayUnion(this.state.selected_sight)});
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
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({saved_sights: firebase.firestore.FieldValue.arrayRemove(this.state.selected_sight)});
                                                          this.setState({saved: false});
                                                        } else {
                                                          firebase.firestore().collection("users").doc(this.state.uid).update({saved_sights: firebase.firestore.FieldValue.arrayUnion(this.state.selected_sight)});
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
              <Modal isVisible={this.state.scoreModal}
                     onBackdropPress={() => this.setState({scoreModal: false})}
                     deviceWidth={width} deviceHeight={height}>
                {this.getScoreModal()}
              </Modal>
            </SafeAreaView>);
  }
}

export default SightView;
