// screens/RegisterScreen.js
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
  ScrollView, 
  Image, 
  Alert,
  Animated,
  Easing
} from 'react-native';
import { createUserWithEmailAndPassword } from "firebase/auth";
import authfirebase from '../../../services/firebaseAuth';
import { Ionicons } from '@expo/vector-icons';

import { API_URL } from "../../constants/config";

const { width, height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;

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

  // Password strength check with enhanced criteria
  const getPasswordStrength = (pwd) => {
    let score = 0;
    const conditions = [
      pwd.length >= 8,
      /[A-Z]/.test(pwd),
      /[a-z]/.test(pwd),
      /\d/.test(pwd),
      /[@#$%^&*!]/.test(pwd),
      pwd.length >= 12
    ];
    
    score = conditions.filter(Boolean).length;
    
    if (score <= 2) return { level: 'Weak', color: '#FF3B30', width: '33%' };
    if (score <= 4) return { level: 'Medium', color: '#FF9500', width: '66%' };
    return { level: 'Strong', color: '#2F6F61', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateForm = () => {
    let valid = true;
    let newErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
      valid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailPattern)) {
      newErrors.email = "Enter a valid email";
      valid = false;
    }

    if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      valid = false;
    } else if (passwordStrength.level === "Weak") {
      newErrors.password = "Create a stronger password";
      valid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        navigation.replace("InfoForm", { 
          userId: data.userId, 
          email, 
          password, 
          name 
        });
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong!");
    }
  };

  const handleGoogleRegister = () => {
    console.log('Register with Google');
  };

  const shakeAnimation = new Animated.Value(0);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
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
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>Join RevoMart and start your thrift journey today!</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Enter your full name"
                placeholderTextColor="#8E8E93"
                value={name}
                onChangeText={setName}
              />
              {errors.name && (
                <Animated.Text 
                  style={[styles.errorText, { transform: [{ translateX: shakeAnimation }] }]}
                  onLayout={shake}
                >
                  {errors.name}
                </Animated.Text>
              )}
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="your@email.com"
                placeholderTextColor="#8E8E93"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <Animated.Text style={[styles.errorText, { transform: [{ translateX: shakeAnimation }] }]}>
                  {errors.email}
                </Animated.Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.passwordWrapper, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.inputPassword}
                  placeholder="Create a strong password"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
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
              
              {/* Enhanced Password Strength Meter */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthHeader}>
                    <Text style={styles.strengthLabel}>Password Strength</Text>
                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.level}
                    </Text>
                  </View>
                  <View style={styles.strengthBarBg}>
                    <Animated.View 
                      style={[
                        styles.strengthBar, 
                        { 
                          backgroundColor: passwordStrength.color,
                          width: passwordStrength.width
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.strengthTips}>
                    {password.length < 8 ? 'Minimum 8 characters' :
                     passwordStrength.level === 'Weak' ? 'Add uppercase, numbers & symbols' :
                     passwordStrength.level === 'Medium' ? 'Great! Make it longer' :
                     'Excellent password!'}
                  </Text>
                </View>
              )}
              {errors.password && (
                <Animated.Text style={[styles.errorText, { transform: [{ translateX: shakeAnimation }] }]}>
                  {errors.password}
                </Animated.Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={[styles.passwordWrapper, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.inputPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#8E8E93"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={showConfirmPassword ? "#2F6F61" : "#8E8E93"} 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Animated.Text style={[styles.errorText, { transform: [{ translateX: shakeAnimation }] }]}>
                  {errors.confirmPassword}
                </Animated.Text>
              )}
            </View>

            {/* Register Button */}
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleRegister}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>Create Account</Text>
              <View style={styles.buttonIcon}>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.replace('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
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
    top: -width * 0.3,
    right: -width * 0.4,
    opacity: 0.6,
  },
  backgroundOrb2: {
    backgroundColor: '#2F6F61',
    top: 'auto',
    bottom: -width * 0.5,
    left: -width * 0.3,
    right: 'auto',
    opacity: 0.3,
  },
  scrollContainer: { 
    flexGrow: 1, 
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(47, 111, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(47, 111, 97, 0.5)',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2F6F61',
    letterSpacing: -1,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    textAlign: 'center', 
    letterSpacing: -0.5,
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
    flex: 1,
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
  input: { 
    width: '100%', 
    height: 56, 
    backgroundColor: 'rgba(255, 255, 255, 0.08)', 
    borderRadius: 16, 
    paddingHorizontal: 20, 
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
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.08)', 
    borderRadius: 16, 
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputPassword: { 
    flex: 1, 
    height: 56, 
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  strengthContainer: {
    marginTop: 12,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  strengthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  strengthBarBg: {
    height: 4, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderRadius: 2, 
    overflow: 'hidden',
    marginBottom: 6,
  },
  strengthBar: { 
    height: '100%', 
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  strengthTips: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  errorText: { 
    color: '#FF3B30', 
    fontSize: 14, 
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500'
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
    marginBottom: 24,
    marginTop: 10,
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
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  loginContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
  loginText: { 
    fontSize: 16, 
    color: '#8E8E93',
    fontWeight: '500',
  },
  loginLink: { 
    color: '#2F6F61', 
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 4,
  },
});