// screens/LoginScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  Alert,
  Animated,
  ScrollView
} from 'react-native';
import { signInWithEmailAndPassword } from "firebase/auth";
import authfirebase from '../../../services/firebaseAuth';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
  const buttonScale = React.useRef(new Animated.Value(1)).current;

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

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    animateButton();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(authfirebase, email, password);
      const loggedUser = userCredential.user;
      // navigation.navigate("Main", { screen: "Home" });
    } catch (error) {
      console.log(error.code, error.message);
      
      // Enhanced error handling with animations
      switch (error.code) {
        case "auth/invalid-credential":
          Alert.alert("Invalid Credential", "Wrong password or login info. Please try again.");
          break;
        case "auth/user-not-found":
          Alert.alert("User Not Found", "No account found with this email.");
          break;
        case "auth/wrong-password":
          Alert.alert("Wrong Password", "Please check your password and try again.");
          break;
        case "auth/too-many-requests":
          Alert.alert("Too Many Attempts", "Account temporarily disabled. Try again later.");
          break;
        default:
          Alert.alert("Login Error", "An unexpected error occurred. Please try again.");
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('Login with Google');
    // Integrate Google login logic here
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.replace('Register');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Background Elements */}
      <View style={styles.backgroundOrb} />
      <View style={[styles.backgroundOrb, styles.backgroundOrb2]} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>RM</Text>
            </View>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Sign in to continue your thrift journey</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#8E8E93"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Ionicons name="mail-outline" size={20} color="#8E8E93" style={[styles.inputIcon, { marginTop: 28 }]} />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.passwordLabelContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.inputPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={[styles.inputIcon, { marginTop: -2 }]} />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={showPassword ? "#2F6F61" : "#8E8E93"} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]} 
                onPress={handleLogin}
                activeOpacity={0.9}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="reload" size={20} color="#FFFFFF" style={styles.loadingIcon} />
                    <Text style={styles.buttonText}>Signing In...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <View style={styles.buttonIcon}>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={styles.signupLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Footer */}
          <View style={styles.securityContainer}>
            <Ionicons name="shield-checkmark" size={16} color="#8E8E93" />
            <Text style={styles.securityText}>Your data is securely encrypted</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    top: -width * 0.4,
    left: -width * 0.3,
    opacity: 0.6,
  },
  backgroundOrb2: {
    backgroundColor: '#2F6F61',
    top: 'auto',
    bottom: -width * 0.6,
    right: -width * 0.2,
    left: 'auto',
    opacity: 0.3,
  },
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(47, 111, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(47, 111, 97, 0.5)',
    marginBottom: 25,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 22,
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
    marginBottom: 8,
  },
  subtitle: { 
    fontSize: 16, 
    color: '#8E8E93', 
    textAlign: 'center', 
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginLeft: 4,
  },
  passwordLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: { 
    width: '100%', 
    height: 58, 
    backgroundColor: 'rgba(255, 255, 255, 0.08)', 
    borderRadius: 16, 
    paddingHorizontal: 52,
    fontSize: 16, 
    color: '#FFFFFF',
    fontWeight: '500',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  passwordWrapper: {
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '100%', 
    height: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.08)', 
    borderRadius: 16, 
    paddingLeft: 52,
    paddingRight: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  inputPassword: { 
    flex: 1, 
    height: 58, 
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  inputIcon: {
    position: 'absolute',
    left: 20,
    top: 19,
    zIndex: 1,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  forgotText: {
    color: '#2F6F61',
    fontWeight: '600',
    fontSize: 14,
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
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.4)',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 17, 
    fontWeight: '700', 
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingIcon: {
    marginRight: 8,
  },
  dividerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24,
  },
  dividerLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
  },
  dividerText: { 
    marginHorizontal: 16, 
    fontSize: 14, 
    color: '#8E8E93',
    fontWeight: '500' 
  },
  googleButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.08)', 
    width: '100%', 
    paddingVertical: 16, 
    borderRadius: 16, 
    justifyContent: 'center', 
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 30,
  },
  googleIcon: { 
    width: 20, 
    height: 20, 
    marginRight: 12 
  },
  googleText: { 
    fontSize: 16, 
    color: '#FFFFFF', 
    fontWeight: '600' 
  },
  signupContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  signupText: { 
    fontSize: 16, 
    color: '#8E8E93',
    fontWeight: '500',
  },
  signupLink: { 
    color: '#2F6F61', 
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 4,
  },
  securityContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    fontWeight: '500',
  },
});