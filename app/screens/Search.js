import React from 'react';
import {
  FlatList,
  Keyboard,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as firebase from 'firebase';
import 'firebase/firestore';
import * as Animatable from 'react-native-animatable';
import SpecialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { SharedElement } from 'react-navigation-shared-element';
import normalize from 'react-native-normalize';
import { SERVER_ADDR, PRIMARY, SECONDARY } from '../settings.js';
import * as cityDirNames from '../assets/city_dir_names_dropdown.json';
import * as countries from '../assets/countries.json';
import * as states from '../assets/states.json';
import * as country_codes from '../assets/country_codes.json';
import { TextInput, TouchableWithoutFeedback } from 'react-native-gesture-handler';
let cityData = require('../assets/city_data.json');

const { height, width } = Dimensions.get('window');


const labels = ["Emerald City", "Atlantis", "Orbit City", "Shangri-La", "Gotham City", "Hawkins", "Vice City", "Twin Peaks", "Birnin Zana", "Hogwarts"];
const allCities = cityDirNames["city_dir_names"]

class Search extends React.Component {
    state = {
        uid: null,
        displayedCountries: countries["countries"],
        displayedStates: [],
        displayedCities: [],
        placeholder: labels[Math.round(Math.random()*(labels.length-1))],
        selectedCity: null,
        selectedCountry: null,
        selectedState: null,
        showCountries: false,
        showStates: false,
        text: ""
    }

    componentDidMount() {
        // console.log(this.state.allCities);
    }

    handleCountrySelect(country) {
        if (country.value in states["countries"]) {
            this.setState({selectedCountry: country, selectedState: null, showCountries: false, displayedStates: states["countries"][country.value], displayedCities: allCities.filter(city=> city.country==country.value)})
            return
        }
            this.setState({selectedCountry: country, showCountries: false, displayedStates: [], displayedCities: allCities.filter(city=> city.country==country.value)})
    }

    handleStateSelect(state) {
        this.setState({selectedState: state, showStates: false, displayedCities: allCities.filter(city => city.state==state.value && city.country==this.state.selectedCountry.value)})
    }

    filterCities(text) {
        if (text=="") {
            this.setState({displayedCities: []})
            return
        }
        if(this.state.selectedCountry != null) {
            if (this.state.selectedState != null) {
                this.setState({displayedCities: allCities.filter(city => city.state==this.state.selectedState.value && city.country==this.state.selectedCountry.value && text.toLowerCase()==city.label.slice(0, text.length).toLowerCase())})
                return
            }
            this.setState({displayedCities: allCities.filter(city => city.country==this.state.selectedCountry.value && text.toLowerCase()==city.label.slice(0, text.length).toLowerCase())})
            return
        }
        this.setState({displayedCities: allCities.filter(city => text.toLowerCase()==city.label.slice(0, text.length).toLowerCase())})
    }

    render () {
        return(<SafeAreaView edges={['bottom', 'left', 'right']} style={{flex: 1, backgroundColor: 'white'}}>
            <View style={{height: normalize(height*0.06), alignSelf: 'center', justifyContent:'center', width: normalize(width*0.8)}}>
                <Text style={{textAlign: 'center',
                              fontFamily: 'Montserrat-Medium',
                              color: 'black',
                              fontSize: normalize(20)}}>
                    {"Search your dream"}
                </Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <View style={{height: normalize(height*0.06), alignSelf: 'center', justifyContent:'center', width: normalize(width*0.1)}}>
                    <Text style={{textAlign: 'center',
                                fontFamily: 'Montserrat-Medium',
                                color: 'black',
                                fontSize: normalize(17)}}>
                        {"City"}
                    </Text>
                </View>
            <View style={{height: normalize(height*0.06), alignSelf: 'center', justifyContent:'center', width: normalize(width*0.75), marginRight: normalize(width*0.02), borderColor: 'black', borderWidth: 1, borderRadius: 1000}}>
                <TouchableWithoutFeedback>
                    <TextInput style={{textAlign: 'center',
                                    fontFamily: 'Montserrat-Medium',
                                    color: 'black',
                                    fontSize: normalize(17)}}
                            autoFocus={true}
                            placeholder={this.state.placeholder}
                            onFocus={()=>this.setState({showCountries: false, showStates: false})}
                            onChangeText={text => this.filterCities(text)}/>
                </TouchableWithoutFeedback>
            </View>
            </View>
            <FlatList data={this.state.displayedCities}
                      style={{position: 'absolute', alignSelf: 'center', height: normalize(height*0.66), marginTop: normalize(height*0.22)}}
                      initialNumToRender={15}
                      scrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                      renderItem={({item, index})=>{return(
                        <Animatable.View  animation={"fadeIn"} duration={75} delay={25+index*50}
                                          style={{height: height*0.07, justifyContent: 'center', alignContent: 'center', flexDirection: 'row'}}>
                            <View style={{width: width*0.4, marginRight: width*0.1}}>
                                <TouchableOpacity onPress={() => {Keyboard.dismiss();
                                                                this.props.navigation.push("CityView", {item: {city_id: item.value, country: country_codes[item.country], name: item.label}})}}>
                                            <Text style={{textAlign: 'center',
                                                        fontFamily: 'Montserrat-Medium',
                                                        color: PRIMARY,
                                                        fontSize: normalize(17)}}>{item.label}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => {Keyboard.dismiss();
                                                              this.props.navigation.push("Create", {item: {city_id: item.value, country: country_codes[item.country], name: item.label}, city_id: item.value})}}>
                                <View style={{overflow: 'hidden',
                                              borderRadius: 1000,
                                              height: height*0.04,
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              backgroundColor: PRIMARY,
                                              flexDirection: 'row'}}>
                                    <Text style={{textAlign: 'center',
                                                  fontFamily: 'Montserrat-Medium',
                                                  color: 'white',
                                                  marginLeft: width*0.005,
                                                  fontSize: normalize(15)}}>{" Create"}</Text>
                                    <SpecialIcon style={{aspectRatio: 1, color: 'white'}} name={"plus"} size={height*0.04}/>
                                </View>
                            </TouchableOpacity>
                        </Animatable.View>
                      )}}
            />
            <View style={{position: 'absolute', marginTop: normalize(height*0.15), alignItems: 'center', justifyContent: 'center', flexDirection: 'row'}}>
                <View style={{height: height*0.06, justifyContent: 'center', alignItems: 'space-between', marginLeft: normalize(width*0.01), flexDirection: 'row'}}>
                    <TouchableOpacity onPress={() => {Keyboard.dismiss();
                                                      this.setState({showCountries: this.state.showCountries?false:true})}}>
                        <View><Text style={{textAlign: 'center',
                                            fontFamily: 'Montserrat-Medium',
                                            color: this.state.selectedCountry==null?'gray':'black',
                                            fontSize: normalize(17)}}>
                                    {this.state.selectedCountry==null?"Country...":this.state.selectedCountry.label}
                                </Text>
                        </View>
                    </TouchableOpacity>
                    {this.state.selectedCountry==null?<View/>:
                    <TouchableOpacity onPress={() => this.setState({selectedCountry: null, displayedCities: [], showStates: false})}>
                        <SpecialIcon style={{color: PRIMARY, marginLeft: height*0.01}} name={"close"} size={normalize(25)}/>
                    </TouchableOpacity>
                    }
                </View>
                {(this.state.displayedStates.length>0)?(
                <View style={{height: height*0.06, justifyContent: 'center', alignItems: 'space-between', marginLeft: normalize(width*0.02), marginRight: normalize(width*0.02), flexDirection: 'row'}}>
                    <TouchableOpacity onPress={() => {Keyboard.dismiss;
                                                      this.setState({showStates: this.state.showStates?false:true})}}>
                        <View><Text style={{textAlign: 'center',
                                                fontFamily: 'Montserrat-Medium',
                                                color: this.state.selectedState==null?'gray':'black',
                                                fontSize: normalize(17)}}>{this.state.selectedState==null?"State...":this.state.selectedState.label}</Text></View>
                    </TouchableOpacity>
                    {this.state.selectedState==null?<View/>:
                    <TouchableOpacity onPress={() => this.setState({selectedState: null, displayedCities: this.state.selectedCountry==null?[]:allCities.filter(city => city.country==this.state.selectedCountry.value)})}>
                        <SpecialIcon style={{color: PRIMARY, marginLeft: height*0.01}} name={"close"} size={normalize(25)}/>
                    </TouchableOpacity>
                    }
                </View>)
                :<View/>
                }
            </View>
            <View style={{position: 'absolute', marginLeft: width*0.125, marginRight: width*0.125, marginTop: normalize(height*0.16), flexDirection: 'row'}}>
                {(this.state.showCountries)?(
                <FlatList style={{height: height*0.56, backgroundColor: 'white', marginTop: normalize(height*0.06), height: normalize(height*0.50), width: normalize(width*0.75), borderRadius: normalize(15), borderWidth: 1, borderColor: 'black'}}
                        data={this.state.displayedCountries}
                        initialNumToRender={10}
                        showsVerticalScrollIndicator={false}
                        renderItem={({item, index})=>{return(
                            <Animatable.View animation={"fadeIn"} duration={75} delay={25+index*50}
                                            style={{height: normalize(height*0.08)}}>
                                <TouchableOpacity onPress={() => this.handleCountrySelect(item)}>
                                    <View style={{width: width*0.75, height: normalize(height*0.08)}}>
                                        <Text style={{textAlign: 'center',
                                                fontFamily: 'Montserrat-Medium',
                                                color: 'black',
                                                fontSize: normalize(17)}}>{item.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            </Animatable.View>
                            )}}/>)
                :<View/>
                }
                {(this.state.showStates)?(
                <FlatList style={{position: 'absolute', marginRight: width*0.125, height: normalize(height*0.56), marginTop: normalize(height*0.06), backgroundColor: 'white', borderRadius: normalize(15), borderWidth: 1, borderColor: 'black'}}
                        data={this.state.displayedStates}
                        initialNumToRender={10}
                        showsVerticalScrollIndicator={false}
                        renderItem={({item, index})=>{return(
                            <Animatable.View animation={"fadeIn"} duration={75} delay={25+index*50}
                                style={{height: normalize(height*0.08)}}>
                                <TouchableOpacity onPress={() => this.handleStateSelect(item)}>
                                    <View style={{width: normalize(width*0.75), height: normalize(height*0.08)}}>
                                        <Text style={{textAlign: 'center',
                                                fontFamily: 'Montserrat-Medium',
                                                color: 'black',
                                                fontSize: normalize(17)}}>{item.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            </Animatable.View>
                        )}}/>):
                <View style={{height: 0}}/>}
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
        </SafeAreaView>)
    }
}

export default Search;