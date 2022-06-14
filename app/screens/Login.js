import React from 'react';
import { View, Animated, Dimensions, Image, TouchableOpacity, Text, Platform } from 'react-native';
import * as firebase from 'firebase';
import 'firebase/firestore';
import * as Facebook from 'expo-facebook';
import * as Crypto from "expo-crypto";
import * as Google from 'expo-google-app-auth';
import * as AppleAuthentication from "expo-apple-authentication";
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import normalize from 'react-native-normalize';

const { height, width } = Dimensions.get('window');

const firebaseConfig = {
  apiKey: "***",
  authDomain: "***",
  databaseURL: "***",
  projectId: "***",
  storageBucket: "***",
  messagingSenderId: ""
};

export default class Login extends React.Component {

  state = {
            scrollX0: new Animated.Value(-50),
            opacityElt0: new Animated.Value(0),
            scrollX1: new Animated.Value(-50),
            opacityElt1: new Animated.Value(0),
            scrollX2: new Animated.Value(-50),
            opacityElt2: new Animated.Value(0),
            scrollX3: new Animated.Value(-50),
            opacityElt3: new Animated.Value(0)
          };


  // componentDidMount() {
  //   if (!firebase.apps.length) {
  //     firebase.initializeApp(firebaseConfig);
  //   }
  //   firebase.auth().onAuthStateChanged((user) => {
  //     if (user) { // checks if user is logged in
  //       console.log('hey');
  //       console.log(firebase.auth().currentUser.uid);
  //       firebase.firestore().collection("users").doc(firebase.auth().currentUser.uid).get()
  //                     .then(snapshot => {
  //                         var data = snapshot.data();
  //                         AsyncStorage.setItem('uid', data.id);
  //                       });
  //       this.props.navigation.navigate('App');
  //     }
  //  });
  // }

  componentDidMount() {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firebase.auth().onAuthStateChanged((user) => {
      if (user) { // checks if user is logged in
        firebase.firestore().collection("users").doc(firebase.auth().currentUser.uid).get()
                      .then(snapshot => {
                          var data = snapshot.data();
                          AsyncStorage.setItem('uid', snapshot.ref.id);
                        });
        this.props.navigation.navigate('App');
      }
    });
    // Animated.timing(this.state.scrollX0, {
    //   toValue: 0,
    //   duration: 300,
    //   useNativeDriver: true
    // }).start();

    // Animated.timing(this.state.opacityElt0, {
    //   toValue: 1,
    //   duration: 300,
    //   useNativeDriver: true
    // }).start();

    Animated.timing(this.state.scrollX1, {
      toValue: 0,
      delay: 0,
      duration: 300,
      useNativeDriver: true
    }).start();

    Animated.timing(this.state.opacityElt1, {
      toValue: 1,
      delay: 0,
      duration: 300,
      useNativeDriver: true
    }).start();

    Animated.timing(this.state.scrollX2, {
      toValue: 0,
      delay: 500,
      duration: 300,
      useNativeDriver: true
    }).start();

    Animated.timing(this.state.opacityElt2, {
      toValue: 1,
      delay: 500,
      duration: 300,
      useNativeDriver: true
    }).start();
    Animated.timing(this.state.scrollX3, {
      toValue: 0,
      delay: 250,
      duration: 300,
      useNativeDriver: true
    }).start();

    Animated.timing(this.state.opacityElt3, {
      toValue: 1,
      delay: 250,
      duration: 300,
      useNativeDriver: true
    }).start();
  }

  createUserRecord(user_data, uid, method) {
    if (method == 'fb') {
      firebase.firestore().collection("users").doc(uid).get().then((snapshot) => {
        if (!snapshot.exists) {
          firebase.firestore().collection("users").doc(uid).set({
            name: user_data.name,
            first_name: user_data.first_name,
            profile_pic: user_data.profile_pic.data.url,
            email: user_data.email,
            cat_params: null,
            noncat_params: null,
            mood_params: null,
            suggested_cities: [],
            suggested_trips: [],
            suggested_sights: [],
            looked_cities: [],
            liked_cities: [],
            saved_cities: [],
            looked_trips: [],
            liked_trips: [],
            saved_trips: [],
            created_trips: [],
            looked_sights: [],
            liked_sights: [],
            saved_sights: [],
            needs_update: true,
            friends: [],
            followers: [],
            following: [],
            photos: null,
            videos: null,
            walk_dist: 7
          })
      }})
    } else if (method == 'go') {
      firebase.firestore().collection("users").doc(uid).get().then((snapshot) => {
        if (!snapshot.exists) {
          firebase.firestore().collection("users").doc(uid).set({
            name: user_data.name,
            first_name: user_data.givenName,
            profile_pic: user_data.photoUrl,
            email: user_data.email,
            cat_params: null,
            noncat_params: null,
            mood_params: null,
            suggested_cities: [],
            suggested_trips: [],
            suggested_sights: [],
            looked_cities: [],
            liked_cities: [],
            saved_cities: [],
            looked_trips: [],
            liked_trips: [],
            saved_trips: [],
            created_trips: [],
            looked_sights: [],
            liked_sights: [],
            saved_sights: [],
            needs_update: true,
            friends: [],
            followers: [],
            following: [],
            photos: null,
            videos: null,
            walk_dist: 7
          })
      }})
    } else if (method == 'ap') {
      firebase.firestore().collection("users").doc(uid).get().then((snapshot) => {
        if (!snapshot.exists) {
          firebase.firestore().collection("users").doc(uid).set({
            name: "",
            first_name: user_data.displayName==null?"":user_data.displayName,
            profile_pic: user_data.photoURL,
            email: user_data.email,
            cat_params: null,
            noncat_params: null,
            mood_params: null,
            suggested_cities: [],
            suggested_trips: [],
            suggested_sights: [],
            looked_cities: [],
            liked_cities: [],
            saved_cities: [],
            looked_trips: [],
            liked_trips: [],
            saved_trips: [],
            created_trips: [],
            looked_sights: [],
            liked_sights: [],
            saved_sights: [],
            needs_update: true,
            friends: [],
            followers: [],
            following: [],
            photos: null,
            videos: null,
            walk_dist: 7
          })
      }})
    } else {
      firebase.firestore().collection("users").doc(uid).set({
        name: '',
        first_name: '',
        profile_pic: null,
        email: null,
        cat_params: null,
        noncat_params: null,
        mood_params: null,
        suggested_cities: [],
        suggested_trips: [],
        suggested_sights: [],
        looked_cities: [],
        liked_cities: [],
        saved_cities: [],
        looked_trips: [],
        liked_trips: [],
        saved_trips: [],
        created_trips: [],
        looked_sights: [],
        liked_sights: [],
        saved_sights: [],
        needs_update: true,
        friends: [],
        followers: [],
        following: [],
        photos: null,
        videos: null,
        walk_dist: 7
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
      var uid = null;
      // console.log(credential);
      firebase.auth()
              .signInWithCredential(credential)
              .catch(function(error) {})
              .then((response) => {
                if ("user" in response) {
                  uid = response.user.uid;
                  this.createUserRecord(user_data, uid, "go");
                  AsyncStorage.setItem('uid', uid);
                  AsyncStorage.setItem('new', JSON.stringify(true));
                  AsyncStorage.setItem('social', JSON.stringify(true));
                  AsyncStorage.setItem('name', user_data.name);
                }
              })
              .then(() => {
                  this.props.navigation.navigate('App')});
    }
  }


  // onFacebook = async () => {
  //   const permissions = ['email', 'public_profile'];
  //   await Facebook.initializeAsync({appId: '***',});
  //   const {type, token} = await Facebook.logInWithReadPermissionsAsync({permissions});
  //   if (type === 'success') {
  //     const credential = firebase.auth.FacebookAuthProvider.credential(token);
  //     const query = 'https://graph.facebook.com/me?fields=name,first_name,picture,email,id&access_token=' + token;
  //     var user_data = null;
  //     await fetch(query).then(response => response.json())
  //                       .then(responseJson => {user_data = responseJson;
  //                                               // console.log(credential);
  //                                               // console.log(user_data);
  //                                             });
  //     var uid = null;
  //     firebase.auth()
  //             .signInWithCredential(credential)
  //             .then((response) => {
  //               if ("user" in response) {
  //                 uid = response.user.uid;
  //                 this.createUserRecord(user_data, uid, "fb");
  //                 AsyncStorage.setItem('uid', uid);
  //                 AsyncStorage.setItem('new', JSON.stringify(true));
  //                 AsyncStorage.setItem('social', JSON.stringify(true));
  //                 AsyncStorage.setItem('name', user_data.name);
  //               }
  //             })
  //             .then(() => {
  //                 this.props.navigation.navigate('App')});
  //     //renew user token
  //     // firebase.auth().currentUser.getIdToken(true);
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
      firebase.auth()
              .signInWithCredential(credential)
              .catch(function(error) {console.log(error)})
              .then((response) => {
                if ("user" in response) {
                  this.createUserRecord(response.user, response.user.uid, "ap");
                  AsyncStorage.setItem('uid', response.user.uid);
                  AsyncStorage.setItem('new', JSON.stringify(true));
                  AsyncStorage.setItem('social', JSON.stringify(true));
                  AsyncStorage.setItem('name', response.user.displayName==null?"":response.user.displayName);
                }
              })
              .then(() => {
                  this.props.navigation.navigate('App')});
    }
  }

  onLater = async () => {
    var uid = null;
    firebase.auth()
            .signInAnonymously()
            .catch(function(error) {console.log(error);})
            .then((response) => {
              if ("user" in response) {
                uid = response.user.uid;
                this.createUserRecord(null, uid, "anon");
                AsyncStorage.setItem('uid', uid);
                AsyncStorage.setItem('new', JSON.stringify(true));
                AsyncStorage.setItem('social', JSON.stringify(false));
                AsyncStorage.setItem('name', 'Anonymous');
              }
            })
            .then(() => {
                this.props.navigation.navigate('App')});
  }

  render() {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
        <View style={{marginBottom: Math.round(height/3),
                      justifyContent: 'center',
                      alignItems: 'center'}}>
          <Image source={require('../assets/animations/icon500.png')}
                  style={{width: normalize(150),
                          height: normalize(150),
                          resizeMode: 'contain',
                          marginTop: normalize(80),
                          marginBottom: normalize(80)}}/>
            {/* <Animated.View style={[{opacity: this.state.opacityElt0}, {transform: [{translateX: this.state.scrollX0}]}]}>
            <TouchableOpacity onPress={this.onFacebook}>
                <Image source={require('../assets/fb.png')}
                        style={{width: Math.round(width/2),
                                height: normalize(40),
                                resizeMode: 'contain'}}/>
            </TouchableOpacity>
            </Animated.View> */}
            <Animated.View style={[{opacity: this.state.opacityElt1}, {transform: [{translateX: this.state.scrollX1}]}]}>
            <TouchableOpacity onPress={this.onGoogle}>
            <View style={{borderRadius: 1, marginTop: normalize(5)}}>
                <Image source={require('../assets/google2.png')}
                        style={{width: Math.round(width/2),
                                height: normalize(40),
                                resizeMode: 'contain'}}/>
            </View>
            </TouchableOpacity>
            </Animated.View>
            {Platform.OS=='ios'?
            <Animated.View style={[{opacity: this.state.opacityElt3}, {transform: [{translateX: this.state.scrollX3}]}]}>
              <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={5}
                        style={{ width: normalize(160),
                                 height: normalize(35),
                                 marginTop: normalize(20),
                                 }}
                        onPress={()=>this.onApple()}
                    />
            </Animated.View>:<View/>
            }
            <Animated.View style={[{opacity: this.state.opacityElt2}, {transform: [{translateX: this.state.scrollX2}]}]}>
            <TouchableOpacity onPress={this.onLater}>
            <View style={{borderRadius: normalize(5),
                          borderColor: "rgba(200, 200, 200, 1)",
                          borderWidth: 1,
                          marginTop: normalize(20),
                          width: normalize(150),
                          height: normalize(25),
                          alignItems: 'center',
                          justifyContent: 'center'}}>
                <Text style={{fontSize: normalize(14),
                              color: "rgba(100, 100, 100, 1)"}}>
                    {"Sign in later"}
                </Text>
            </View>
            </TouchableOpacity>
            </Animated.View>
          </View>
      </SafeAreaView>
    );
  }
}
