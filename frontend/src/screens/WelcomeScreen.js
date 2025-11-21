// screens/WelcomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Animated } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleGetStarted = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace('Login');
      });
    });
  };

  return (
    <View style={styles.container}>
      {/* Modern background elements */}
      <View style={styles.backgroundOrb} />
      <View style={[styles.backgroundOrb, styles.backgroundOrb2]} />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* Modern logo/badge */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>RM</Text>
          </View>
        </View>

        <Text style={styles.title}>Welcome to{"\n"}<Text style={styles.titleAccent}>RevoMart</Text></Text>

        {/* Enhanced image with modern container */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/welcome2.png')}
            style={styles.image}
            resizeMode="contain"
          />
         
          {/* Floating elements */}
          
        </View>

        <Text style={styles.subtitle}>
          Discover <Text style={styles.highlight}>thrift items</Text>, save big,{"\n"}
          and shop <Text style={styles.highlight}>smart</Text> with AI-powered recommendations.
        </Text>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleGetStarted}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <View style={styles.buttonIcon}>
            <Text style={styles.buttonIconText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Modern footer */}
        <View style={styles.footer}>
          <View style={styles.indicatorContainer}>
            <View style={[styles.indicator, styles.indicatorActive]} />
            <View style={styles.indicator} />
            <View style={styles.indicator} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
    position: 'relative',
  },
  backgroundOrb: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#1A1D21',
    top: -width * 0.6,
    left: -width * 0.1,
    opacity: 0.8,
  },
  backgroundOrb2: {
    backgroundColor: '#2F6F61',
    top: 'auto',
    bottom: -width * 0.8,
    left: 'auto',
    right: -width * 0.2,
    opacity: 0.3,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(47, 111, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(47, 111, 97, 0.5)',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2F6F61',
    letterSpacing: -1,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 30,
    lineHeight: 42,
  },
  titleAccent: {
    backgroundGradient: 'linear-gradient(135deg, #2F6F61 0%, #4CAF92 100%)',
    color: '#2F6F61', // Fallback
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 30,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: -10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    
  },
  image: {
    width: width * 0.8,
    height: height * 0.3,
    borderRadius: 20,
  },
  Image:{
    width: width * 0.7,
    height: height * 0.3,
    borderRadius: 20,
  },
  floatingBadge: {
    position: 'absolute',
    top: -10,
    right: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  floatingBadge2: {
    top: 'auto',
    bottom: -10,
    right: 'auto',
    left: 30,
  },
  floatingBadgeText: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  highlight: {
    color: '#2F6F61',
    fontWeight: '600',
  },
  button: {
    width: '100%',
    backgroundColor: '#2F6F61',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.3)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: '#2F6F61',
  },
});