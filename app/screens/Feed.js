import React from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import * as firebase from 'firebase';
import 'firebase/firestore';
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";
import * as Facebook from 'expo-facebook';
import * as Crypto from "expo-crypto";
import * as Google from 'expo-google-app-auth';
import * as AppleAuthentication from "expo-apple-authentication";
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SharedElement } from 'react-native-shared-element';
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import normalize from 'react-native-normalize';
import SegmentedRoundDisplay from 'react-native-segmented-round-display';
import * as map_data from "../assets/map_styles.json";
import { SERVER_ADDR, PRIMARY, SECONDARY, COLOR2, COLOR3 } from '../settings.js';
const { height, width } = Dimensions.get('window');
let cityData = require('../assets/city_data.json');
const colors = [PRIMARY, SECONDARY, COLOR2, COLOR3];

export default class Feed extends React.Component {

  state = {active: false,
            combinedTrips: [],
            lastRef: null,
            liked_trips: [],
            loading: false,
            uid: null
           }

  async componentDidMount() {
    const uid = await AsyncStorage.getItem('uid');
    const val = await AsyncStorage.getItem('social');
    this.setState({uid: uid,
                   active: JSON.parse(val)});
    this.loadData(uid);
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

  createUserRecord(user_data, method) {
    if (method == 'fb') {
      firebase.firestore().collection("users").doc(this.state.uid).update({
        name: user_data.name,
        first_name: user_data.first_name,
        profile_pic: user_data.profile_pic.data.url,
        email: user_data.email,
      })
    } else if (method == 'go') {
      firebase.firestore().collection("users").doc(this.state.uid).update({
        name: user_data.name,
        first_name: user_data.givenName,
        profile_pic: user_data.photoUrl,
        email: user_data.email,
      })
    } else if (method == 'ap') {
      firebase.firestore().collection("users").doc(this.state.uid).update({
        name: "",
        first_name: user_data.displayName==null?"":user_data.displayName,
        profile_pic: user_data.photoURL,
        email: user_data.email,
      })
    }
  }

  onGoogle = async () => {
    const { type, accessToken, user } = await Google.logInAsync({
                  iosClientId: '***',
                  androidClientId: '***',
                  iosStandaloneAppClientId: '***',
                  androidStandaloneAppClientId: '***'
    })
    if (type === 'success') {
      const user_data = user;
      const credential = firebase.auth.GoogleAuthProvider.credential(null, accessToken);
      firebase.auth().currentUser.linkWithCredential(credential)
              .catch(function(error) {console.log(error)})
              .then((response) => {
                if ("user" in response) {
                  this.createUserRecord(user_data, "go");
                  AsyncStorage.setItem('new', JSON.stringify(false));
                  AsyncStorage.setItem('social', JSON.stringify(true));
                  AsyncStorage.setItem('name', user_data.name);
                }
              })
              .then(() => {
                  this.setState({active: true})});
                  this.loadTrips();
    }
  }

  async loadTrips() { // make some pagination in the future
    this.setState({loading: true});
    var combinedTrips = []
    var lastRef = null;
    var qSnap = await firebase.firestore().collection("trips").where("privacy", "==", "public").orderBy('timestamp', 'desc').limit(10).get()
    qSnap.forEach((doc) => {
      const trip_data = doc.data();
      var author = "";
      if (trip_data.user_id==this.state.uid) {
        author = "Created by you";
      } else {
        author = "By Anonymous";
      }
      lastRef = doc;
      var liked = false;
      for (var i in this.state.liked_trips) {
        if (doc.id== this.state.liked_trips[i].trip_id) {
          liked = true
        }
      }
      combinedTrips.push({liked: liked,
                          user_id: trip_data.user_id,
                          places: trip_data.sights,
                          distance: trip_data.walk_dist,
                          duration: trip_data.duration,
                          color: colors[Math.round(Math.random()*(colors.length-1))],
                          author: author,
                          uid: doc.id,
                          type: 'created',
                          tag: 'created',
                          city: cityData[trip_data.city_id].name,
                          city_id: trip_data.city_id,
                          label: trip_data.name,
                          likes: trip_data.likes,
                          description: trip_data.description,
                          privacy: trip_data.privacy});
    });
    this.setState({combinedTrips: combinedTrips, lastRef: lastRef, loading: false});
    this.getImageURLs(combinedTrips);
  }
  
  async loadExtra() {
    this.setState({loading: true});
    var combinedTrips = []
    var lastRef = null;
    var qSnap = await firebase.firestore().collection("trips").where("privacy", "==", "public").orderBy('timestamp', 'desc').startAfter(this.state.lastRef).limit(5).get()
      qSnap.forEach((doc) => {
        const trip_data = doc.data();
        var author = "";
        if (trip_data.user_id==this.state.uid) {
          author = "Created by you";
        } else {
          author = "By Anonymous";
        }
        lastRef = doc;
        const liked = false;
        for (var i in this.state.liked_trips) {
          if (doc.id== this.state.liked_trips[i].trip_id) {
            liked = true
          }
        }
        combinedTrips.push({liked: liked,
                            user_id: trip_data.user_id,
                            places: trip_data.sights,
                            distance: trip_data.walk_dist,
                            duration: trip_data.duration,
                            color: colors[Math.round(Math.random()*(colors.length-1))],
                            author: author,
                            uid: doc.id,
                            type: 'created',
                            tag: 'created',
                            city: cityData[trip_data.city_id].name,
                            city_id: trip_data.city_id,
                            label: trip_data.name,
                            likes: trip_data.likes,
                            description: trip_data.description,
                            privacy: trip_data.privacy});
    });
    var combined = this.state.combinedTrips;
    combined.push(...combinedTrips)
    this.setState({combinedTrips: combined, lastRef: lastRef, loading: false});
    this.getImageURLs(combined);
  }

  async getImageURLs(combinedTrips) {
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


  // onFacebook = async () => {
  //   const permissions = ['email', 'public_profile'];
  //   await Facebook.initializeAsync('***');
  //   const {type, token} = await Facebook.logInWithReadPermissionsAsync({permissions});
  //   if (type === 'success') {
  //     const credential = firebase.auth.FacebookAuthProvider.credential(token);
  //     const query = 'https://graph.facebook.com/me?fields=name,first_name,picture,email,id&access_token=' + token;
  //     var user_data = null;
  //     await fetch(query).then(response => response.json())
  //                       .then(responseJson => user_data = responseJson);
  //     firebase.auth()
  //             .signInWithCredential(credential)
  //             .catch(function(error) {})
  //             .then((response) => {
  //               if ("user" in response) {
  //                 this.createUserRecord(user_data, "fb");
  //                 AsyncStorage.setItem('new', JSON.stringify(false));
  //                 AsyncStorage.setItem('social', JSON.stringify(true));
  //                 AsyncStorage.setItem('name', user_data.name);
  //               }
  //             })
  //             .then(() => {
  //                 this.setState({active: true});
  //                 this.loadTrips();
  //               })
  //   }
  // }

  onApple = async () => {
    const csrf = Math.random().toString(36).substring(2, 15);
    const nonce = Math.random().toString(36).substring(2, 10);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256, nonce);
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL
      ],
      state: csrf,
      nonce: hashedNonce
    });
    const { identityToken, email, state } = appleCredential;
    if (identityToken) {
      const provider = new firebase.auth.OAuthProvider("apple.com");
      const credential = provider.credential({
        idToken: identityToken,
        rawNonce: nonce // nonce value from above
      });
      firebase.auth().currentUser.linkWithCredential(credential)
              .catch(function(error) {console.log(error)})
              .then((response) => {
                  if ("user" in response) {
                    this.createUserRecord(response.user, "ap");
                    AsyncStorage.setItem('new', JSON.stringify(false));
                    AsyncStorage.setItem('social', JSON.stringify(true));
                    AsyncStorage.setItem('name', response.user.displayName==null?"":response.user.displayName);
                  }
                })
                .then(() => {
                    this.setState({active: true})});
                    this.loadTrips();
      }
  }
  
  renderDuration(duration){
    var botDuration = (Math.floor(duration*2)/2).toFixed(1).toString();
    var topDuration = (Math.ceil(duration*2)/2).toFixed(1).toString();
    botDuration=botDuration.charAt(botDuration.length-1)=='0'?botDuration.slice(0, botDuration.length-2):botDuration;
    topDuration=topDuration.charAt(topDuration.length-1)=='0'?topDuration.slice(0, topDuration.length-2):topDuration;
    return botDuration + " - " + topDuration + " hr";
  }

  render() {
    const offsets = this.state.active?this.state.combinedTrips.map((_,index)=>index*(width*1.45)+height*0.1-(height-width*1.45)/2):this.state.combinedTrips.map((_,index)=>index*(width*1.45)+height*0.1+normalize(110)-(height-width*1.45)/2)
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
        <FlatList
          initialNumToRender={1}
          snapToAlignment={'start'}
          decelerationRate={'fast'}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          snapToOffsets={offsets}
          key={(_, index) => "trip"+index}
          keyExtractor={(_, index)=> "trip"+index}
          onScroll={(event) => {if (this.state.combinedTrips.length>9 && this.state.combinedTrips.length-(event.nativeEvent.contentOffset.y/(width*1.45))<2 && !this.state.loading){
                                    this.loadExtra();
                                }}}
          refreshControl={<RefreshControl tintColor={PRIMARY} 
                                          onRefresh={()=>this.loadTrips()} 
                                          refreshing={this.state.loading} />}
          ListHeaderComponent={() => {
            return((this.state.combinedTrips.length==0 && !this.state.loading)?
            <View>
              <Text style={{width: width, height: height*0.05, fontFamily: 'Montserrat-Light', alignSelf: 'center', fontSize: width*0.07}}>{"Feed"}</Text>
              {this.state.active?<View/>:
        <View>
          <View style={{width: width, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{textAlign: 'center',
                        fontSize: width*0.04,
                        width: width*0.8,
                        fontFamily: 'Montserrat-Regular'}}>
            {"Looks like you signed up anonymously... \nPlease sign in using the following options"}
          </Text>
          {/* <View>
            <TouchableOpacity onPress={() => this.onFacebook()}>
                <Image source={require('../assets/fb.png')}
                        style={{width: Math.round(width/2),
                                height: normalize(40),
                                resizeMode: 'contain'}}/>
            </TouchableOpacity>
          </View> */}
          <View>
            <TouchableOpacity onPress={() => this.onGoogle()}>
              <View style={{borderRadius: 1, paddingTop: normalize(5)}}>
                  <Image source={require('../assets/google2.png')}
                          style={{width: Math.round(width/2),
                                  height: normalize(40),
                                  resizeMode: 'contain'}}/>
              </View>
            </TouchableOpacity>
          </View>
          {Platform.OS=='ios'?
          <View>
            <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={5}
                        style={{ width: normalize(160),
                                 height: normalize(35),
                                 marginTop: normalize(5),
                                 }}
                        onPress={()=>this.onApple()}
                    />
          </View>:<View/>
          }
          </View>
        </View>}
              <Text style={{width: width, height: height*0.07, fontFamily: 'Montserrat-Light', alignSelf: 'center', fontSize: width*0.05}}>{"Nothing here yet!"}</Text>
            </View>:
            <View>
              <Text style={{width: width, height: height*0.05, fontFamily: 'Montserrat-Light', alignSelf: 'center', fontSize: width*0.07}}>{"Feed"}</Text>
              {this.state.active?<View/>:
        <View>
          <View style={{width: width, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{textAlign: 'center',
                        fontSize: width*0.04,
                        width: width*0.8,
                        fontFamily: 'Montserrat-Regular'}}>
            {"Looks like you signed up anonymously... \nPlease sign in using the following options"}
          </Text>
          {/* <View>
            <TouchableOpacity onPress={() => this.onFacebook()}>
                <Image source={require('../assets/fb.png')}
                        style={{width: Math.round(width/2),
                                height: normalize(40),
                                resizeMode: 'contain'}}/>
            </TouchableOpacity>
          </View> */}
          <View>
            <TouchableOpacity onPress={() => this.onGoogle()}>
              <View style={{borderRadius: 1, paddingTop: normalize(5)}}>
                  <Image source={require('../assets/google2.png')}
                          style={{width: Math.round(width/2),
                                  height: normalize(40),
                                  resizeMode: 'contain'}}/>
              </View>
            </TouchableOpacity>
          </View>
          {Platform.OS=='ios'?
          <View>
            <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={5}
                        style={{ width: normalize(160),
                                 height: normalize(35),
                                 marginTop: normalize(5),
                                 marginBottom: normalize(5)
                                 }}
                        onPress={()=>this.onApple()}
                    />
          </View>:<View/>
          }
          </View>
        </View>}
            </View>)
          }}
          data={this.state.combinedTrips}
          renderItem={({item, index}) => {
            const idx = index;
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
            var likes = item.likes.toString();
            if (item.likes > 1000) {
              likes = (item.likes/1000).toFixed(2).toString()+ 'K';
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
                                            marginLeft: width*0.01}}>
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
                                <View/>
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
                                          marginLeft: width*0.71,
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
                                <View style={{position: 'absolute', height: width*1.2, width: width}}>
                                  <TouchableOpacity style={{height: width*1.2, width: width}}
                                                    onPress={()=>this.props.navigation.push('TripView', {item: {uid: uid}})} activeOpacity={1}/>
                                </View>
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
                                fontSize: item.author.length>18?normalize(15):normalize(20),
                                fontFamily: 'Montserrat-Regular'}}>{item.author}
                            </Text>
            </View>
          </View>
            </View>);
        }}
        />
      </SafeAreaView>
    );
  }
}
